export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api/v1";
export const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || "";
export const CHAIN_ID = Number(import.meta.env.VITE_CHAIN_ID || 80002);
export const RPC_URL = import.meta.env.VITE_RPC_URL || "https://rpc-amoy.polygon.technology";
export const EXPLORER_URL = import.meta.env.VITE_EXPLORER_URL || "https://amoy.polygonscan.com";

export const BATCH_STATUS_LABELS: Record<string, string> = {
  Created: "Harvested & Registered",
  Listed: "Listed for Trade",
  BidReceived: "Bids Received",
  Sold: "Sold to Distributor",
  InTransit: "In Transit",
  Delivered: "Delivered to Warehouse",
  RetailReady: "At Retailer / Verified",
  Completed: "Consumed / Verified",
};

export const ROLE_LABELS: Record<string, string> = {
  farmer: "Farmer / Producer",
  distributor: "Distributor / Trader",
  wholesaler: "Wholesaler / Mandi",
  dealer: "Distributor / Trader",
  retailer: "Retailer / Supermarket",
  consumer: "Consumer / Public",
  admin: "Administrator",
};

export const AMOY_NETWORK_PARAMS = {
  chainId: "0x13882", // 80002
  chainName: "Polygon Amoy Testnet",
  nativeCurrency: { name: "MATIC", symbol: "MATIC", decimals: 18 },
  rpcUrls: ["https://rpc-amoy.polygon.technology"],
  blockExplorerUrls: ["https://amoy.polygonscan.com"],
};
