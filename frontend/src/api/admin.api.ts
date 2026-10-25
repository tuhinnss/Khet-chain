import { api } from "./client";
import { ApprovalStatus, User } from "../types";

export type ManagedUser = User & { createdAt?: string };

export async function listUsers(status?: ApprovalStatus) {
  const { data } = await api.get("/admin/users", { params: { status } });
  return data.data as ManagedUser[];
}

export async function approveUser(id: string) {
  const { data } = await api.post(`/admin/users/${id}/approve`);
  return data.data as ManagedUser;
}

export async function rejectUser(id: string) {
  const { data } = await api.post(`/admin/users/${id}/reject`);
  return data.data as ManagedUser;
}
