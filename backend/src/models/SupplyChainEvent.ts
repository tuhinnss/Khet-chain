import mongoose, { Schema, Document } from "mongoose";

export interface ISupplyChainEvent extends Document {
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
  timestamp: Date;
  metadataURI?: string;
  txHash?: string;
  blockNumber?: number;
}

const supplyChainEventSchema = new Schema<ISupplyChainEvent>(
  {
    batchId: { type: Number, required: true, index: true },
    actor: { type: String, required: true, lowercase: true },
    actorRole: { type: String, required: true },
    action: { type: String, required: true },
    price: { type: String, default: "0" },
    quantity: { type: Number, default: 0 },
    location: { type: String, default: "" },
    quality: { type: String, default: "GOOD" },
    transportDetails: { type: String, default: "" },
    storageDetails: { type: String, default: "" },
    timestamp: { type: Date, default: Date.now },
    metadataURI: { type: String, default: "" },
    txHash: { type: String, default: "" },
    blockNumber: { type: Number, default: 0 },
  },
  { timestamps: true }
);

supplyChainEventSchema.index({ batchId: 1, timestamp: 1 });

export const SupplyChainEvent = mongoose.model<ISupplyChainEvent>(
  "SupplyChainEvent",
  supplyChainEventSchema
);
