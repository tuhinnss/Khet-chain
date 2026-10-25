import { Response } from "express";
import { AuthRequest } from "../types/index.js";
import { Listing } from "../models/Listing.js";
import { Batch } from "../models/Batch.js";
import { claimTx, parseEvent, verifyTxFromWallet } from "../services/tx.service.js";

export async function createListing(req: AuthRequest, res: Response): Promise<void> {
  const { batchId, minBid, expiresAt, txHash } = req.body as {
    batchId: number;
    minBid?: string;
    expiresAt?: string;
    txHash: string;
  };

  const wallet = req.user!.walletAddress;
  const receipt = await verifyTxFromWallet(txHash, wallet);
  const parsed = parseEvent(receipt, "ListingCreated");
  if (!parsed || Number(parsed.args.batchId) !== batchId) {
    res.status(400).json({ success: false, error: { message: "ListingCreated event not found" } });
    return;
  }

  const batch = await Batch.findOne({ batchId, farmerAddress: wallet });
  if (!batch) {
    res.status(404).json({ success: false, error: { message: "Batch not found" } });
    return;
  }
  await claimTx(txHash, "listing-created", wallet);

  // Trade amounts are stored as wei strings, like on-chain; the UI formats them.
  const askingPrice = (parsed.args.price as bigint).toString();
  await Batch.updateOne({ batchId }, { currentPrice: askingPrice, "txHashes.listed": txHash });
  // Re-pricing an active listing keeps its status (e.g. BidReceived) on-chain.
  await Batch.updateOne({ batchId, status: "Created" }, { status: "Listed" });

  const listing = await Listing.findOneAndUpdate(
    { batchId },
    {
      batchId,
      farmerId: req.user!.userId,
      askingPrice,
      minBid,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      isActive: true,
      cropName: batch.cropName,
      quantity: batch.quantity,
    },
    { upsert: true, new: true }
  );

  res.status(201).json({ success: true, data: listing });
}

export async function getListings(req: AuthRequest, res: Response): Promise<void> {
  const { cropName } = req.query as { cropName?: string };

  const filter: Record<string, unknown> = { isActive: true };
  if (cropName) filter.cropName = new RegExp(cropName, "i");

  const listings = await Listing.find(filter).sort({ createdAt: -1 }).limit(50);

  res.json({ success: true, data: listings });
}
