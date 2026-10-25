import mongoose, { Schema, Document } from "mongoose";

// One row per transaction hash the API has accepted as proof, so the same
// on-chain tx can't be replayed to create duplicate bids, transfers or events.
export interface IProcessedTx extends Document {
  txHash: string;
  purpose: string;
  wallet: string;
}

const processedTxSchema = new Schema<IProcessedTx>(
  {
    txHash: { type: String, required: true, unique: true, lowercase: true },
    purpose: { type: String, required: true },
    wallet: { type: String, required: true, lowercase: true },
  },
  { timestamps: true }
);

export const ProcessedTx = mongoose.model<IProcessedTx>("ProcessedTx", processedTxSchema);
