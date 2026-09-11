import { Request, Response } from "express";
import { AuthRequest, SupplyChainEventData } from "../types/index.js";
import { Batch } from "../models/Batch.js";
import { SupplyChainEvent } from "../models/SupplyChainEvent.js";
import { generateQRCode, buildVerificationUrl } from "../services/qr.service.js";
import { parseEvent, verifyTxFromWallet } from "../services/tx.service.js";
import { readBatch, readBatchHistory, readSupplyChainEvents } from "../services/blockchain.service.js";

export async function syncBatch(req: AuthRequest, res: Response): Promise<void> {
  const {
    txHash,
    cropName,
    quantity,
    unit,
    harvestDate,
    location,
    certification,
    description,
    currentPrice,
    batchStringId,
  } = req.body as {
    txHash: string;
    cropName: string;
    quantity: number;
    unit?: string;
    harvestDate: string;
    location: string;
    certification?: string;
    description?: string;
    currentPrice?: string;
    batchStringId?: string;
  };

  const wallet = req.user!.walletAddress;
  const receipt = await verifyTxFromWallet(txHash, wallet);
  const parsed = parseEvent(receipt, "BatchCreated") || parseEvent(receipt, "BatchRegistered");
  if (!parsed) {
    res.status(400).json({ success: false, error: { message: "BatchCreated/BatchRegistered event not found" } });
    return;
  }

  const batchId = Number(parsed.args.batchId);
  const qrHash = parsed.args.qrHash as string;
  const strId = batchStringId || (parsed.args.batchStringId as string) || `KHC-2026-${String(batchId).padStart(6, "0")}`;
  const qrCodeDataUrl = await generateQRCode(batchId, qrHash);

  const batch = await Batch.findOneAndUpdate(
    { batchId },
    {
      batchId,
      batchStringId: strId,
      cropName,
      quantity,
      unit: unit ?? "kg",
      harvestDate: new Date(harvestDate),
      location,
      certification: certification || "Standard",
      description: description || "",
      farmerAddress: wallet,
      farmerId: req.user!.userId,
      currentOwner: wallet,
      currentPrice: currentPrice || "0",
      status: "Created",
      qrHash,
      qrCodeDataUrl,
      verificationUrl: `${process.env.FRONTEND_URL || "http://localhost:5173"}/trace/${batchId}`,
      txHashes: { registered: txHash },
    },
    { upsert: true, new: true }
  );

  // Cache initial harvest event in Mongo
  await SupplyChainEvent.findOneAndUpdate(
    { batchId, action: "HARVESTED" },
    {
      batchId,
      actor: wallet,
      actorRole: "FARMER",
      action: "HARVESTED",
      price: currentPrice || "0",
      quantity,
      location,
      quality: "GOOD",
      transportDetails: "On-farm storage",
      storageDetails: "Barn / Farm facility",
      timestamp: new Date(),
      txHash,
      blockNumber: receipt.blockNumber,
    },
    { upsert: true }
  );

  res.status(201).json({ success: true, data: batch });
}

export async function listBatches(req: AuthRequest, res: Response): Promise<void> {
  const user = req.user;
  let filter = {};
  if (user) {
    const { role, userId, walletAddress } = user;
    filter =
      role === "farmer"
        ? { farmerId: userId }
        : role === "distributor" || role === "dealer" || role === "wholesaler" || role === "retailer"
          ? { currentOwner: walletAddress }
          : {};
  }
  const batches = await Batch.find(filter).sort({ createdAt: -1 }).limit(100);
  res.json({ success: true, data: batches });
}

export async function getBatch(req: Request, res: Response): Promise<void> {
  const batchId = Number(req.params.id || req.params.batchId);
  const dbBatch = await Batch.findOne({ batchId });
  let onChain;
  let supplyChainEvents: SupplyChainEventData[] = [];
  try {
    onChain = await readBatch(batchId);
    supplyChainEvents = await readSupplyChainEvents(batchId);
  } catch {
    onChain = null;
  }

  // Fallback / merge with Mongo supply chain events
  const cachedEvents = await SupplyChainEvent.find({ batchId }).sort({ timestamp: 1 });

  if (!dbBatch && !onChain) {
    res.status(404).json({ success: false, error: { message: "Batch not found" } });
    return;
  }

  res.json({
    success: true,
    data: {
      ...dbBatch?.toObject(),
      onChain,
      supplyChainEvents: supplyChainEvents.length > 0 ? supplyChainEvents : cachedEvents,
      history: cachedEvents,
    },
  });
}

export async function getHistory(req: Request, res: Response): Promise<void> {
  const batchId = Number(req.params.id || req.params.batchId);
  const dbBatch = await Batch.findOne({ batchId });
  const chainHistory = await readBatchHistory(batchId);
  const supplyChainEvents = await readSupplyChainEvents(batchId);
  const cachedEvents = await SupplyChainEvent.find({ batchId }).sort({ timestamp: 1 });

  res.json({
    success: true,
    data: {
      batch: dbBatch,
      history: chainHistory,
      supplyChainEvents: supplyChainEvents.length > 0 ? supplyChainEvents : cachedEvents,
      verificationUrl: dbBatch?.verificationUrl ?? buildVerificationUrl(batchId),
    },
  });
}

export async function verifyBatch(req: Request, res: Response): Promise<void> {
  const batchId = Number(req.params.id || req.params.batchId);
  const { hash } = req.query as { hash?: string };

  const dbBatch = await Batch.findOne({ batchId });
  let onChain;
  let chainHistory = [];
  let supplyChainEvents: SupplyChainEventData[] = [];

  try {
    onChain = await readBatch(batchId);
    chainHistory = await readBatchHistory(batchId);
    supplyChainEvents = await readSupplyChainEvents(batchId);
  } catch {
    onChain = null;
  }

  const cachedEvents = await SupplyChainEvent.find({ batchId }).sort({ timestamp: 1 });

  const scannedHash = hash || dbBatch?.qrHash || onChain?.qrHash || "";
  const authentic = !!(onChain && scannedHash === onChain.qrHash && onChain.qrHash !== ethersZero());

  res.json({
    success: true,
    data: {
      authentic,
      batch: { ...dbBatch?.toObject(), onChain },
      history: chainHistory,
      supplyChainEvents: supplyChainEvents.length > 0 ? supplyChainEvents : cachedEvents,
    },
  });
}

function ethersZero(): string {
  return "0x0000000000000000000000000000000000000000000000000000000000000000";
}
