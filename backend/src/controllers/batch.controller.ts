import { Response } from "express";
import { AuthRequest } from "../types/index.js";
import { Batch } from "../models/Batch.js";
import { computeQrHash, generateQRCode, buildVerificationUrl } from "../services/qr.service.js";
import { parseEvent, verifyTxFromWallet } from "../services/tx.service.js";
import { readBatch, readBatchHistory } from "../services/blockchain.service.js";

export async function syncBatch(req: AuthRequest, res: Response): Promise<void> {
  const {
    txHash,
    cropName,
    quantity,
    unit,
    harvestDate,
    location,
  } = req.body as {
    txHash: string;
    cropName: string;
    quantity: number;
    unit?: string;
    harvestDate: string;
    location: string;
  };

  const wallet = req.user!.walletAddress;
  const receipt = await verifyTxFromWallet(txHash, wallet);
  const parsed = parseEvent(receipt, "BatchRegistered");
  if (!parsed) {
    res.status(400).json({ success: false, error: { message: "BatchRegistered event not found" } });
    return;
  }

  const batchId = Number(parsed.args.batchId);
  const qrHash = parsed.args.qrHash as string;
  const qrCodeDataUrl = await generateQRCode(batchId, qrHash);

  const batch = await Batch.findOneAndUpdate(
    { batchId },
    {
      batchId,
      cropName,
      quantity,
      unit: unit ?? "kg",
      harvestDate: new Date(harvestDate),
      location,
      farmerAddress: wallet,
      farmerId: req.user!.userId,
      currentOwner: wallet,
      status: "Created",
      qrHash,
      qrCodeDataUrl,
      verificationUrl: buildVerificationUrl(batchId),
      txHashes: { registered: txHash },
    },
    { upsert: true, new: true }
  );

  res.status(201).json({ success: true, data: batch });
}

export async function listBatches(req: AuthRequest, res: Response): Promise<void> {
  const { role, userId, walletAddress } = req.user!;
  const filter =
    role === "farmer"
      ? { farmerId: userId }
      : role === "dealer" || role === "retailer"
        ? { currentOwner: walletAddress }
        : {};
  const batches = await Batch.find(filter).sort({ createdAt: -1 }).limit(50);
  res.json({ success: true, data: batches });
}

export async function getBatch(req: AuthRequest, res: Response): Promise<void> {
  const batchId = Number(req.params.id);
  const dbBatch = await Batch.findOne({ batchId });
  let onChain;
  try {
    onChain = await readBatch(batchId);
  } catch {
    onChain = null;
  }

  if (!dbBatch && !onChain) {
    res.status(404).json({ success: false, error: { message: "Batch not found" } });
    return;
  }

  res.json({ success: true, data: { ...dbBatch?.toObject(), onChain } });
}

export async function getHistory(req: AuthRequest, res: Response): Promise<void> {
  const batchId = Number(req.params.id);
  const dbBatch = await Batch.findOne({ batchId });
  const chainHistory = await readBatchHistory(batchId);

  res.json({
    success: true,
    data: {
      batch: dbBatch,
      history: chainHistory,
      verificationUrl: dbBatch?.verificationUrl ?? buildVerificationUrl(batchId),
    },
  });
}

export async function verifyBatch(req: AuthRequest, res: Response): Promise<void> {
  const batchId = Number(req.params.id);
  const { hash } = req.query as { hash?: string };

  const dbBatch = await Batch.findOne({ batchId });
  const onChain = await readBatch(batchId);
  const history = await readBatchHistory(batchId);

  const scannedHash = hash || dbBatch?.qrHash || onChain.qrHash;
  const authentic = scannedHash === onChain.qrHash && onChain.qrHash !== ethersZero();

  res.json({
    success: true,
    data: {
      authentic,
      batch: { ...dbBatch?.toObject(), onChain },
      history,
    },
  });
}

function ethersZero(): string {
  return "0x0000000000000000000000000000000000000000000000000000000000000000";
}
