import { Response } from "express";
import { AuthRequest } from "../types/index.js";
import { Batch } from "../models/Batch.js";
import { TransferHistory } from "../models/TransferHistory.js";
import { parseEvent, verifyTxFromWallet } from "../services/tx.service.js";
import { BATCH_STATUS_MAP } from "../types/index.js";

export async function transferOwnership(req: AuthRequest, res: Response): Promise<void> {
  const { batchId, newOwner, txHash, toRole } = req.body as {
    batchId: number;
    newOwner: string;
    txHash: string;
    toRole?: string;
  };

  const wallet = req.user!.walletAddress;
  const receipt = await verifyTxFromWallet(txHash, wallet);
  const parsed = parseEvent(receipt, "OwnershipTransferred");
  if (!parsed || Number(parsed.args.batchId) !== batchId) {
    res.status(400).json({ success: false, error: { message: "OwnershipTransferred event not found" } });
    return;
  }

  const batch = await Batch.findOne({ batchId });
  await Batch.updateOne({ batchId }, { currentOwner: newOwner.toLowerCase() });

  await TransferHistory.create({
    batchId,
    fromAddress: wallet,
    toAddress: newOwner.toLowerCase(),
    fromRole: req.user!.role,
    toRole,
    statusAtTransfer: batch?.status ?? "Transferred",
    txHash,
    blockNumber: receipt.blockNumber,
    timestamp: new Date(),
    action: "transferred",
  });

  res.json({ success: true, data: { batchId, newOwner } });
}

export async function updateStatus(req: AuthRequest, res: Response): Promise<void> {
  const { batchId, status, txHash } = req.body as {
    batchId: number;
    status: keyof typeof import("../types/index.js").BATCH_STATUS_TO_ENUM;
    txHash: string;
  };

  const wallet = req.user!.walletAddress;
  const receipt = await verifyTxFromWallet(txHash, wallet);
  const parsed = parseEvent(receipt, "StatusUpdated");
  if (!parsed || Number(parsed.args.batchId) !== batchId) {
    res.status(400).json({ success: false, error: { message: "StatusUpdated event not found" } });
    return;
  }

  const newStatus = BATCH_STATUS_MAP[Number(parsed.args.newStatus)] ?? status;
  await Batch.updateOne({ batchId, currentOwner: wallet }, { status: newStatus, [`txHashes.${newStatus}`]: txHash });

  await TransferHistory.create({
    batchId,
    fromAddress: wallet,
    toAddress: wallet,
    fromRole: req.user!.role,
    toRole: req.user!.role,
    statusAtTransfer: newStatus,
    txHash,
    blockNumber: receipt.blockNumber,
    timestamp: new Date(),
    action: "status_updated",
  });

  res.json({ success: true, data: { batchId, status: newStatus } });
}
