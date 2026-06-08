export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api/v1";
export const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || "";
export const CHAIN_ID = Number(import.meta.env.VITE_CHAIN_ID || 31337);

export const BATCH_STATUS_LABELS: Record<string, string> = {
  Created: "Created",
  Listed: "Listed",
  BidReceived: "Bids Received",
  Sold: "Sold",
  InTransit: "In Transit",
  Delivered: "Delivered",
  RetailReady: "Retail Ready",
};
