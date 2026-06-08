import { api } from "./client";
import { Listing } from "../types";

export async function getListings(params?: { cropName?: string }) {
  const { data } = await api.get("/listing", { params });
  return data.data as Listing[];
}

export async function createListing(payload: {
  batchId: number;
  askingPrice: string;
  txHash: string;
  minBid?: string;
}) {
  const { data } = await api.post("/listing", payload);
  return data.data;
}
