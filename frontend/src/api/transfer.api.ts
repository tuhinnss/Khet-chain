import { api } from "./client";

export async function transferOwnership(payload: {
  batchId: number;
  newOwner: string;
  txHash: string;
  toRole?: string;
}) {
  const { data } = await api.post("/transfer", payload);
  return data.data;
}

export async function updateStatus(payload: {
  batchId: number;
  status: string;
  txHash: string;
}) {
  const { data } = await api.post("/status", payload);
  return data.data;
}
