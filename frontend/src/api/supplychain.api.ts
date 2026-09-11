import { api } from "./client";
import { SupplyChainEvent } from "../types";

export async function addSupplyChainEvent(payload: {
  batchId: number;
  txHash: string;
  actor?: string;
  actorRole: string;
  action: string;
  price?: string;
  quantity?: number;
  location?: string;
  quality?: string;
  transportDetails?: string;
  storageDetails?: string;
  metadataURI?: string;
  newOwner?: string;
}): Promise<SupplyChainEvent> {
  const { data } = await api.post("/supplychain/event", payload);
  return data.data;
}

export async function getSupplyChainEvents(batchId: number): Promise<SupplyChainEvent[]> {
  const { data } = await api.get(`/supplychain/${batchId}`);
  return data.data;
}
