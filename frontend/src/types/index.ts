export type UserRole = "farmer" | "dealer" | "retailer" | "admin";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  walletAddress: string;
}

export type BatchStatus =
  | "Created"
  | "Listed"
  | "BidReceived"
  | "Sold"
  | "InTransit"
  | "Delivered"
  | "RetailReady";

export interface Batch {
  _id?: string;
  batchId: number;
  cropName: string;
  quantity: number;
  unit?: string;
  harvestDate: string;
  location: string;
  farmerAddress: string;
  currentOwner: string;
  currentPrice?: string;
  status: BatchStatus;
  qrHash: string;
  qrCodeDataUrl?: string;
  verificationUrl?: string;
}

export interface Listing {
  _id: string;
  batchId: number;
  askingPrice: string;
  cropName: string;
  quantity: number;
  isActive: boolean;
}

export interface ProvenanceRecord {
  from: string;
  to: string;
  status: BatchStatus;
  timestamp: string;
  action: string;
}
