import { api } from "./client";
import { User, UserRole } from "../types";

export async function getNonce(walletAddress: string) {
  const { data } = await api.post("/auth/nonce", { walletAddress });
  return data.data as { nonce: string; message: string };
}

export async function register(payload: {
  email: string;
  password: string;
  name: string;
  role: UserRole;
  walletAddress: string;
  signature: string;
  message: string;
  businessName?: string;
}) {
  const { data } = await api.post("/auth/register", payload);
  return data.data as { token: string; user: User };
}

export async function syncRole() {
  const { data } = await api.post("/auth/sync-role");
  return data.data as { walletAddress: string; role: string; synced: boolean };
}

export async function getRoleStatus() {
  const { data } = await api.get("/auth/role-status");
  return data.data as { walletAddress: string; role: string; hasRole: boolean };
}

export async function login(payload: {
  email: string;
  password: string;
  walletAddress: string;
  signature: string;
  message: string;
}) {
  const { data } = await api.post("/auth/login", payload);
  return data.data as { token: string; user: User };
}
