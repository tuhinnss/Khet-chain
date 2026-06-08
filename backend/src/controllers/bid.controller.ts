import { Response } from "express";
import { AuthRequest } from "../types/index.js";
import { Bid } from "../models/Bid.js";
import { Listing } from "../models/Listing.js";
import { Batch } from "../models/Batch.js";
import { parseEvent, verifyTxFromWallet } from "../services/tx.service.js";
import { readBids } from "../services/blockchain.service.js";

export async function placeBid(req: AuthRequest, res: Response): Promise<void> {
  const { batchId, amount, txHash } = req.body as {
    batchId: number;
    amount: string;
    txHash: string;
  };

  const wallet = req.user!.walletAddress;
  const receipt = await verifyTxFromWallet(txHash, wallet);
  const parsed = parseEvent(receipt, "BidPlaced");
  if (!parsed || Number(parsed.args.batchId) !== batchId) {
    res.status(400).json({ success: false, error: { message: "BidPlaced event not found" } });
    return;
  }

  const listing = await Listing.findOne({ batchId, isActive: true });
  if (!listing) {
    res.status(404).json({ success: false, error: { message: "Active listing not found" } });
    return;
  }

  const onChainBids = await readBids(batchId);
  const activeBid = onChainBids.filter((b: { active: boolean }) => b.active).pop();

  const bid = await Bid.create({
    batchId,
    listingId: listing._id,
    dealerId: req.user!.userId,
    dealerAddress: wallet,
    amount,
    status: "pending",
    onChainBidIndex: activeBid?.index ?? onChainBids.length - 1,
    txHash,
  });

  await Batch.updateOne({ batchId }, { status: "BidReceived" });

  res.status(201).json({ success: true, data: bid });
}

export async function acceptBid(req: AuthRequest, res: Response): Promise<void> {
  const { batchId, bidIndex, txHash } = req.body as {
    batchId: number;
    bidIndex: number;
    txHash: string;
  };

  const wallet = req.user!.walletAddress;
  const receipt = await verifyTxFromWallet(txHash, wallet);
  const parsed = parseEvent(receipt, "BidAccepted");
  if (!parsed || Number(parsed.args.batchId) !== batchId) {
    res.status(400).json({ success: false, error: { message: "BidAccepted event not found" } });
    return;
  }

  const dealer = (parsed.args.dealer as string).toLowerCase();
  const amount = (parsed.args.amount as bigint).toString();

  await Batch.updateOne(
    { batchId, farmerAddress: wallet },
    {
      status: "Sold",
      currentOwner: dealer,
      currentPrice: amount,
      "txHashes.sold": txHash,
    }
  );

  await Listing.updateOne({ batchId }, { isActive: false });
  await Bid.updateMany({ batchId, dealerAddress: dealer }, { status: "accepted" });
  await Bid.updateMany({ batchId, status: "pending", dealerAddress: { $ne: dealer } }, { status: "rejected" });

  res.json({ success: true, data: { batchId, bidIndex, dealer, amount } });
}

export async function getBidsForBatch(req: AuthRequest, res: Response): Promise<void> {
  const batchId = Number(req.params.batchId);
  const dbBids = await Bid.find({ batchId }).populate("dealerId", "name businessName");
  let onChainBids = [];
  try {
    onChainBids = await readBids(batchId);
  } catch {
    onChainBids = [];
  }

  res.json({ success: true, data: { dbBids, onChainBids } });
}
