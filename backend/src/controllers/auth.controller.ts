import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { IUser, User } from "../models/User.js";
import { env } from "../config/env.js";
import { signToken } from "../utils/jwt.js";
import { buildSignMessage, verifyWalletSignature } from "../utils/wallet.js";
import { checkOnChainRole, ensureOnChainRole } from "../services/role.service.js";
import { AuthRequest, UserRole } from "../types/index.js";

const loginNonces = new Map<string, string>();

export const ACTOR_ROLES: UserRole[] = ["farmer", "distributor", "wholesaler", "dealer", "retailer"];

function isAdminWallet(walletAddress: string): boolean {
  return env.ADMIN_WALLETS.includes(walletAddress.toLowerCase());
}

export function publicUser(user: IUser) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    walletAddress: user.walletAddress,
    businessName: user.businessName,
    approvalStatus: user.approvalStatus,
  };
}

function session(user: IUser) {
  const token = signToken({
    userId: user.id,
    email: user.email,
    role: user.role,
    walletAddress: user.walletAddress,
  });
  return { token, user: publicUser(user) };
}

export async function getNonce(req: Request, res: Response): Promise<void> {
  const { walletAddress } = req.body as { walletAddress?: string };
  if (!walletAddress) {
    res.status(400).json({ success: false, error: { message: "walletAddress required" } });
    return;
  }
  const nonce = randomBytes(16).toString("hex");
  loginNonces.set(walletAddress.toLowerCase(), nonce);
  const message = buildSignMessage(walletAddress, nonce);
  res.json({ success: true, data: { nonce, message } });
}

export async function register(req: Request, res: Response): Promise<void> {
  try {
    await registerUser(req, res);
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({
      success: false,
      error: { message: err instanceof Error ? err.message : "Registration failed" },
    });
  }
}

async function registerUser(req: Request, res: Response): Promise<void> {
  const {
    email,
    password,
    name,
    role,
    walletAddress,
    signature,
    message,
    businessName,
  } = req.body as {
    email: string;
    password: string;
    name: string;
    role: UserRole;
    walletAddress: string;
    signature: string;
    message: string;
    businessName?: string;
  };

  if (![email, password, name, role, walletAddress, signature, message].every((v) => typeof v === "string" && v)) {
    res.status(400).json({ success: false, error: { message: "Missing required fields" } });
    return;
  }

  const isAdmin = role === "admin";
  if (!isAdmin && !ACTOR_ROLES.includes(role)) {
    res.status(400).json({ success: false, error: { message: "Invalid role" } });
    return;
  }

  if (!verifyWalletSignature(message, signature, walletAddress)) {
    res.status(401).json({ success: false, error: { message: "Invalid wallet signature" } });
    return;
  }

  // The signature above proves wallet ownership, so only an allow-listed
  // wallet's holder can create the admin account.
  if (isAdmin && !isAdminWallet(walletAddress)) {
    res.status(403).json({ success: false, error: { message: "This wallet is not authorized to register as admin" } });
    return;
  }

  const existing = await User.findOne({ $or: [{ email }, { walletAddress: walletAddress.toLowerCase() }] });
  if (existing) {
    res.status(409).json({ success: false, error: { message: "User already exists" } });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await User.create({
    email,
    passwordHash,
    name,
    role,
    walletAddress: walletAddress.toLowerCase(),
    businessName: businessName || undefined,
    approvalStatus: isAdmin ? "approved" : "pending",
  });

  // Actors get no session until an admin approves them and their role is granted on-chain.
  res.status(201).json({
    success: true,
    data: isAdmin ? session(user) : { user: publicUser(user) },
  });
}

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password, walletAddress, signature, message } = req.body as {
    email: string;
    password: string;
    walletAddress: string;
    signature: string;
    message: string;
  };

  // Also blocks operator objects like { "$ne": null } reaching the Mongo query.
  if (![email, password, walletAddress, signature, message].every((v) => typeof v === "string" && v)) {
    res.status(400).json({ success: false, error: { message: "Missing required fields" } });
    return;
  }

  const user = await User.findOne({ email });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    res.status(401).json({ success: false, error: { message: "Invalid credentials" } });
    return;
  }

  if (user.walletAddress !== walletAddress.toLowerCase()) {
    res.status(401).json({ success: false, error: { message: "Wallet mismatch" } });
    return;
  }

  if (!verifyWalletSignature(message, signature, walletAddress)) {
    res.status(401).json({ success: false, error: { message: "Invalid wallet signature" } });
    return;
  }

  loginNonces.delete(walletAddress.toLowerCase());

  if (user.role === "admin") {
    // Removing a wallet from ADMIN_WALLETS revokes admin access at next login.
    if (!isAdminWallet(user.walletAddress)) {
      res.status(403).json({ success: false, error: { message: "This wallet is no longer an authorized admin" } });
      return;
    }
    res.json({ success: true, data: session(user) });
    return;
  }

  if (user.approvalStatus !== "approved") {
    const message =
      user.approvalStatus === "rejected"
        ? "Your registration was rejected by an administrator"
        : "Your account is awaiting admin approval";
    res.status(403).json({ success: false, error: { message } });
    return;
  }

  // Approved users are re-granted here, e.g. after the contract is redeployed.
  const roleResult = await ensureOnChainRole(walletAddress, user.role);
  if (!roleResult.granted) {
    res.status(503).json({
      success: false,
      error: {
        message:
          roleResult.error ||
          "Could not grant blockchain role — ensure Hardhat node is running, contract is deployed, and backend is restarted",
      },
    });
    return;
  }

  res.json({ success: true, data: session(user) });
}

export async function me(req: AuthRequest, res: Response): Promise<void> {
  const user = await User.findById(req.user?.userId).select("-passwordHash");
  res.json({ success: true, data: user });
}

export async function syncRole(req: AuthRequest, res: Response): Promise<void> {
  const { walletAddress, role } = req.user!;
  // Check the live record, not the JWT: a token issued before rejection is still valid.
  const user = await User.findById(req.user!.userId);
  if (!user || user.role === "admin" || user.approvalStatus !== "approved") {
    res.status(403).json({ success: false, error: { message: "Account is not approved for an on-chain role" } });
    return;
  }

  const result = await ensureOnChainRole(walletAddress, role);
  if (!result.granted) {
    res.status(503).json({
      success: false,
      error: { message: result.error || "Could not sync on-chain role" },
    });
    return;
  }
  res.json({ success: true, data: { walletAddress, role, synced: true } });
}

export async function roleStatus(req: AuthRequest, res: Response): Promise<void> {
  const { walletAddress, role } = req.user!;
  const hasRole = await checkOnChainRole(walletAddress, role);
  res.json({ success: true, data: { walletAddress, role, hasRole } });
}
