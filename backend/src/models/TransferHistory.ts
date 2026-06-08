import mongoose, { Schema, Document } from "mongoose";

export interface ITransferHistory extends Document {
  batchId: number;
  fromAddress: string;
  toAddress: string;
  fromRole?: string;
  toRole?: string;
  statusAtTransfer: string;
  txHash?: string;
  blockNumber?: number;
  timestamp: Date;
  notes?: string;
  action: string;
}

const transferSchema = new Schema<ITransferHistory>(
  {
    batchId: { type: Number, required: true },
    fromAddress: { type: String, required: true, lowercase: true },
    toAddress: { type: String, required: true, lowercase: true },
    fromRole: String,
    toRole: String,
    statusAtTransfer: { type: String, required: true },
    txHash: String,
    blockNumber: Number,
    timestamp: { type: Date, required: true },
    notes: String,
    action: { type: String, required: true },
  },
  { timestamps: true }
);

transferSchema.index({ batchId: 1, timestamp: 1 });

export const TransferHistory = mongoose.model<ITransferHistory>("TransferHistory", transferSchema);
