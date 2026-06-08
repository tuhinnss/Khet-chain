import mongoose, { Schema, Document } from "mongoose";
import { UserRole } from "../types/index.js";

export interface IUser extends Document {
  email: string;
  passwordHash: string;
  name: string;
  role: UserRole;
  walletAddress: string;
  businessName?: string;
  isActive: boolean;
}

const userSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true },
    role: {
      type: String,
      enum: ["farmer", "dealer", "retailer", "consumer", "admin"],
      required: true,
    },
    walletAddress: { type: String, required: true, lowercase: true },
    businessName: String,
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

userSchema.index({ walletAddress: 1 });

export const User = mongoose.model<IUser>("User", userSchema);
