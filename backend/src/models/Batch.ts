import mongoose, { Schema, Document, Types } from "mongoose";
import { BatchStatus } from "../types/index.js";

export interface IBatch extends Document {
  batchId: number;
  cropName: string;
  quantity: number;
  unit: string;
  harvestDate: Date;
  location: string;
  farmerAddress: string;
  farmerId: Types.ObjectId;
  currentOwner: string;
  currentPrice: string;
  status: BatchStatus;
  qrHash: string;
  qrCodeDataUrl?: string;
  verificationUrl: string;
  txHashes: Record<string, string>;
}

const batchSchema = new Schema<IBatch>(
  {
    batchId: { type: Number, required: true, unique: true },
    cropName: { type: String, required: true },
    quantity: { type: Number, required: true },
    unit: { type: String, default: "kg" },
    harvestDate: { type: Date, required: true },
    location: { type: String, required: true },
    farmerAddress: { type: String, required: true, lowercase: true },
    farmerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    currentOwner: { type: String, required: true, lowercase: true },
    currentPrice: { type: String, default: "0" },
    status: {
      type: String,
      enum: ["Created", "Listed", "BidReceived", "Sold", "InTransit", "Delivered", "RetailReady"],
      default: "Created",
    },
    qrHash: { type: String, required: true },
    qrCodeDataUrl: String,
    verificationUrl: { type: String, required: true },
    txHashes: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

batchSchema.index({ farmerId: 1 });
batchSchema.index({ currentOwner: 1 });
batchSchema.index({ status: 1 });

export const Batch = mongoose.model<IBatch>("Batch", batchSchema);
