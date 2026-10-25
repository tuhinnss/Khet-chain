import { Request, Response } from "express";
import { AuthRequest } from "../types/index.js";
import { SupplyChainEvent } from "../models/SupplyChainEvent.js";
import { Batch } from "../models/Batch.js";
import { claimTx, parseEvent, verifyTxFromWallet } from "../services/tx.service.js";
import { readBatch } from "../services/blockchain.service.js";

export async function addSupplyChainEvent(req: AuthRequest, res: Response): Promise<void> {
  const { batchId, txHash, quantity, transportDetails, storageDetails, metadataURI } = req.body as {
    batchId: number;
    txHash: string;
    quantity?: number;
    transportDetails?: string;
    storageDetails?: string;
    metadataURI?: string;
  };

  if (!batchId || !txHash) {
    res.status(400).json({ success: false, error: { message: "Missing required event fields" } });
    return;
  }

  // Only cache events that provably happened on-chain, from this caller, for this batch.
  const wallet = req.user!.walletAddress;
  const receipt = await verifyTxFromWallet(txHash, wallet);
  const parsed = parseEvent(receipt, "SupplyChainEventAdded");
  if (!parsed || Number(parsed.args.batchId) !== Number(batchId)) {
    res.status(400).json({ success: false, error: { message: "SupplyChainEventAdded event not found" } });
    return;
  }
  await claimTx(txHash, "supplychain-event", wallet);

  const event = await SupplyChainEvent.create({
    batchId,
    actor: (parsed.args.actor as string).toLowerCase(),
    actorRole: parsed.args.actorRole,
    action: parsed.args.action,
    price: (parsed.args.price as bigint).toString(),
    quantity: quantity || 0,
    location: parsed.args.location,
    quality: parsed.args.quality || "GOOD",
    transportDetails: transportDetails || "",
    storageDetails: storageDetails || "",
    timestamp: new Date(Number(parsed.args.timestamp) * 1000),
    metadataURI: metadataURI || "",
    txHash,
    blockNumber: receipt.blockNumber,
  });

  // Owner, price and status come from the chain, never from the request body.
  // If the RPC read fails, the event listener reconciles on its next poll.
  try {
    const onChain = await readBatch(Number(batchId));
    await Batch.updateOne(
      { batchId },
      {
        currentOwner: onChain.currentOwner.toLowerCase(),
        currentPrice: onChain.currentPrice,
        status: onChain.status,
      }
    );
  } catch (err) {
    console.warn(`Could not mirror on-chain state for batch #${batchId}:`, err);
  }

  res.status(201).json({ success: true, data: event });
}

export async function getSupplyChainEvents(req: Request, res: Response): Promise<void> {
  const batchId = Number(req.params.batchId || req.params.id);
  const events = await SupplyChainEvent.find({ batchId }).sort({ timestamp: 1 });
  res.json({ success: true, data: events });
}
