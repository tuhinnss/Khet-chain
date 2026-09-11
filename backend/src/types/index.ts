import { Request } from "express";

export type UserRole =
  | "farmer"
  | "distributor"
  | "wholesaler"
  | "dealer"
  | "retailer"
  | "consumer"
  | "admin";

export type BatchStatus =
  | "Created"
  | "Listed"
  | "BidReceived"
  | "Sold"
  | "InTransit"
  | "Delivered"
  | "RetailReady"
  | "Completed";

export interface AuthPayload {
  userId: string;
  email: string;
  role: UserRole;
  walletAddress: string;
}

export interface AuthRequest extends Request {
  user?: AuthPayload;
}

export interface SupplyChainEventData {
  batchId: number;
  actor: string;
  actorRole: string;
  action: string;
  price: string;
  quantity: number;
  location: string;
  quality: string;
  transportDetails: string;
  storageDetails: string;
  timestamp: Date | string;
  metadataURI?: string;
  txHash?: string;
  blockNumber?: number;
}

export const BATCH_STATUS_MAP: Record<number, BatchStatus> = {
  0: "Created",
  1: "Listed",
  2: "BidReceived",
  3: "Sold",
  4: "InTransit",
  5: "Delivered",
  6: "RetailReady",
  7: "Completed",
};

export const BATCH_STATUS_TO_ENUM: Record<BatchStatus, number> = {
  Created: 0,
  Listed: 1,
  BidReceived: 2,
  Sold: 3,
  InTransit: 4,
  Delivered: 5,
  RetailReady: 6,
  Completed: 7,
};
