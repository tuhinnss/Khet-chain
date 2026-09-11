export type UserRole =
  | "farmer"
  | "distributor"
  | "wholesaler"
  | "dealer"
  | "retailer"
  | "consumer"
  | "admin";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  walletAddress: string;
  businessName?: string;
  location?: string;
}

export type BatchStatus =
  | "Created"
  | "Listed"
  | "BidReceived"
  | "Sold"
  | "InTransit"
  | "Delivered"
  | "RetailReady"
  | "Completed";

export interface SupplyChainEvent {
  actor: string;
  actorRole: string;
  action: string;
  price: string;
  quantity: number;
  location: string;
  quality: string;
  transportDetails: string;
  storageDetails: string;
  timestamp: string | number | Date;
  metadataURI?: string;
  txHash?: string;
}

export interface Batch {
  _id?: string;
  batchId: number;
  batchStringId?: string;
  cropName: string;
  quantity: number;
  unit?: string;
  harvestDate: string;
  location: string;
  certification?: string;
  description?: string;
  farmerAddress: string;
  currentOwner: string;
  currentPrice?: string;
  status: BatchStatus;
  qrHash: string;
  qrCodeDataUrl?: string;
  verificationUrl?: string;
  supplyChainEvents?: SupplyChainEvent[];
  history?: SupplyChainEvent[];
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

export interface FairPriceCrop {
  cropName: string;
  category: string;
  currentSupplyChainPrice: number;
  referenceMSP: number;
  unit: string;
  priceDifference: number;
  trend: "stable" | "increasing" | "decreasing";
  lastUpdated: string;
}
