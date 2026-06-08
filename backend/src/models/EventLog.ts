import mongoose, { Schema, Document } from "mongoose";

export interface IEventLog extends Document {
  eventName: string;
  batchId?: number;
  txHash: string;
  blockNumber: number;
  args: Record<string, unknown>;
  processed: boolean;
}

const eventLogSchema = new Schema<IEventLog>(
  {
    eventName: { type: String, required: true },
    batchId: Number,
    txHash: { type: String, required: true },
    blockNumber: { type: Number, required: true },
    args: { type: Schema.Types.Mixed, default: {} },
    processed: { type: Boolean, default: true },
  },
  { timestamps: true }
);

eventLogSchema.index({ eventName: 1 });
eventLogSchema.index({ batchId: 1 });
eventLogSchema.index({ txHash: 1 });

export const EventLog = mongoose.model<IEventLog>("EventLog", eventLogSchema);
