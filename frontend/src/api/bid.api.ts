import { api } from "./client";

export async function placeBid(payload: { batchId: number; amount: string; txHash: string }) {
  const { data } = await api.post("/bid", payload);
  return data.data;
}

export async function acceptBid(payload: { batchId: number; bidIndex: number; txHash: string }) {
  const { data } = await api.post("/bid/accept", payload);
  return data.data;
}

export async function getBids(batchId: number) {
  const { data } = await api.get(`/bid/${batchId}`);
  return data.data;
}
