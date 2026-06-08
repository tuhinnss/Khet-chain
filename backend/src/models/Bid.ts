import mongoose, { Schema, Document, Types } from "mongoose";

export interface IBid extends Document {
  batchId: number;
  listingId: Types.ObjectId;
  dealerId: Types.ObjectId;
  dealerAddress: string;
  amount: string;
  status: "pending" | "accepted" | "rejected" | "withdrawn";
  onChainBidIndex: number;
  txHash?: string;
}

const bidSchema = new Schema<IBid>(
  {
    batchId: { type: Number, required: true },
    listingId: { type: Schema.Types.ObjectId, ref: "Listing", required: true },
    dealerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    dealerAddress: { type: String, required: true, lowercase: true },
    amount: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "withdrawn"],
      default: "pending",
    },
    onChainBidIndex: { type: Number, required: true },
    txHash: String,
  },
  { timestamps: true }
);

bidSchema.index({ batchId: 1, status: 1 });
bidSchema.index({ dealerId: 1 });

export const Bid = mongoose.model<IBid>("Bid", bidSchema);
