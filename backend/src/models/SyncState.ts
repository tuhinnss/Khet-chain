import mongoose, { Schema, Document } from "mongoose";

export interface ISyncState extends Document {
  key: string;
  lastProcessedBlock: number;
}

const syncStateSchema = new Schema<ISyncState>({
  key: { type: String, required: true, unique: true },
  lastProcessedBlock: { type: Number, default: 0 },
});

export const SyncState = mongoose.model<ISyncState>("SyncState", syncStateSchema);
