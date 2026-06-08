import { Request } from "express";

export type UserRole = "farmer" | "dealer" | "retailer" | "consumer" | "admin";

export type BatchStatus =
  | "Created"
  | "Listed"
  | "BidReceived"
  | "Sold"
  | "InTransit"
  | "Delivered"
  | "RetailReady";

export interface AuthPayload {
  userId: string;
  email: string;
  role: UserRole;
  walletAddress: string;
}

export interface AuthRequest extends Request {
  user?: AuthPayload;
}

export const BATCH_STATUS_MAP: Record<number, BatchStatus> = {
  0: "Created",
  1: "Listed",
  2: "BidReceived",
  3: "Sold",
  4: "InTransit",
  5: "Delivered",
  6: "RetailReady",
};

export const BATCH_STATUS_TO_ENUM: Record<BatchStatus, number> = {
  Created: 0,
  Listed: 1,
  BidReceived: 2,
  Sold: 3,
  InTransit: 4,
  Delivered: 5,
  RetailReady: 6,
};
