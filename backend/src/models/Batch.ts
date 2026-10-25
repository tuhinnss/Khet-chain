import mongoose, { Schema, Document, Types } from "mongoose";
import { BatchStatus } from "../types/index.js";

export interface IBatch extends Document {
  batchId: number;
  batchStringId: string;
  cropName: string;
  quantity: number;
  unit: string;
  harvestDate: Date;
  location: string;
  certification?: string;
  description?: string;
  farmerAddress: string;
  farmerId: Types.ObjectId;
  currentOwner: string;
  currentPrice: string;
  status: BatchStatus;
  qrHash: string;
  qrSecret?: string;
  qrCodeDataUrl?: string;
  verificationUrl: string;
  txHashes: Record<string, string>;
}

const batchSchema = new Schema<IBatch>(
  {
    batchId: { type: Number, required: true, unique: true },
    batchStringId: { type: String, default: "" },
    cropName: { type: String, required: true },
    quantity: { type: Number, required: true },
    unit: { type: String, default: "kg" },
    harvestDate: { type: Date, required: true },
    location: { type: String, required: true },
    certification: { type: String, default: "Standard" },
    description: { type: String, default: "" },
    farmerAddress: { type: String, required: true, lowercase: true },
    farmerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    currentOwner: { type: String, required: true, lowercase: true },
    currentPrice: { type: String, default: "0" },
    status: {
      type: String,
      enum: ["Created", "Listed", "BidReceived", "Sold", "InTransit", "Delivered", "RetailReady", "Completed"],
      default: "Created",
    },
    qrHash: { type: String, required: true },
    // Preimage of qrHash, printed only inside the package's QR label. Scanning it
    // is what proves authenticity, so it must never appear in public responses.
    qrSecret: { type: String, select: false },
    // Legacy: older records stored a rendered QR here; hidden for the same reason.
    qrCodeDataUrl: { type: String, select: false },
    verificationUrl: { type: String, required: true },
    txHashes: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

batchSchema.index({ farmerId: 1 });
batchSchema.index({ currentOwner: 1 });
batchSchema.index({ status: 1 });
batchSchema.index({ batchStringId: 1 });

export const Batch = mongoose.model<IBatch>("Batch", batchSchema);
