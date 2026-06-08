import mongoose, { Schema, Document, Types } from "mongoose";

export interface IListing extends Document {
  batchId: number;
  farmerId: Types.ObjectId;
  askingPrice: string;
  minBid?: string;
  expiresAt?: Date;
  isActive: boolean;
  cropName: string;
  quantity: number;
}

const listingSchema = new Schema<IListing>(
  {
    batchId: { type: Number, required: true },
    farmerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    askingPrice: { type: String, required: true },
    minBid: String,
    expiresAt: Date,
    isActive: { type: Boolean, default: true },
    cropName: { type: String, required: true },
    quantity: { type: Number, required: true },
  },
  { timestamps: true }
);

listingSchema.index({ batchId: 1 });
listingSchema.index({ isActive: 1 });

export const Listing = mongoose.model<IListing>("Listing", listingSchema);
