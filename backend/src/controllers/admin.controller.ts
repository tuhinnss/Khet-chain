import { Response } from "express";
import { Types } from "mongoose";
import { AuthRequest } from "../types/index.js";
import { ApprovalStatus, IUser, User } from "../models/User.js";
import { ensureOnChainRole, revokeOnChainRole } from "../services/role.service.js";
import { publicUser } from "./auth.controller.js";

const STATUSES: ApprovalStatus[] = ["pending", "approved", "rejected"];

export async function listUsers(req: AuthRequest, res: Response): Promise<void> {
  const { status } = req.query as { status?: string };
  const filter: Record<string, unknown> = { role: { $ne: "admin" } };

  if (status) {
    if (!STATUSES.includes(status as ApprovalStatus)) {
      res.status(400).json({ success: false, error: { message: "Invalid status" } });
      return;
    }
    // Users created before approvals existed have no field; they count as pending.
    filter.approvalStatus = status === "pending" ? { $in: ["pending", null] } : status;
  }

  const users = await User.find(filter).sort({ createdAt: -1 }).limit(200);
  res.json({
    success: true,
    data: users.map((u) => ({ ...publicUser(u), createdAt: u.get("createdAt") })),
  });
}

export async function approveUser(req: AuthRequest, res: Response): Promise<void> {
  const user = await findManagedUser(req.params.id, res);
  if (!user) return;

  // Grant first so "approved" in the DB always means the role exists on-chain.
  const grant = await ensureOnChainRole(user.walletAddress, user.role);
  if (!grant.granted) {
    res.status(503).json({ success: false, error: { message: grant.error || "Could not grant on-chain role" } });
    return;
  }

  user.approvalStatus = "approved";
  await user.save();
  res.json({ success: true, data: publicUser(user) });
}

export async function rejectUser(req: AuthRequest, res: Response): Promise<void> {
  const user = await findManagedUser(req.params.id, res);
  if (!user) return;

  // Also covers revoking a previously approved user.
  const revoke = await revokeOnChainRole(user.walletAddress, user.role);
  if (!revoke.revoked) {
    res.status(503).json({ success: false, error: { message: revoke.error || "Could not revoke on-chain role" } });
    return;
  }

  user.approvalStatus = "rejected";
  await user.save();
  res.json({ success: true, data: publicUser(user) });
}

async function findManagedUser(id: string, res: Response): Promise<IUser | null> {
  const user = Types.ObjectId.isValid(id) ? await User.findById(id) : null;
  if (!user || user.role === "admin") {
    res.status(404).json({ success: false, error: { message: "User not found" } });
    return null;
  }
  return user;
}
