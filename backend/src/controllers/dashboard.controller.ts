import { Response } from "express";
import { AuthRequest } from "../types/index.js";
import { Batch } from "../models/Batch.js";
import { Listing } from "../models/Listing.js";
import { Bid } from "../models/Bid.js";

export async function getStats(req: AuthRequest, res: Response): Promise<void> {
  const { role, walletAddress, userId } = req.user!;

  if (role === "farmer") {
    const [batches, listings, pendingBids] = await Promise.all([
      Batch.countDocuments({ farmerId: userId }),
      Listing.countDocuments({ farmerId: userId, isActive: true }),
      Bid.countDocuments({ status: "pending" }),
    ]);
    res.json({ success: true, data: { batches, activeListings: listings, pendingBids } });
    return;
  }

  if (role === "dealer") {
    const [myBids, wonBatches, nearbyListings] = await Promise.all([
      Bid.countDocuments({ dealerId: userId }),
      Batch.countDocuments({ currentOwner: walletAddress }),
      Listing.countDocuments({ isActive: true }),
    ]);
    res.json({ success: true, data: { myBids, wonBatches, nearbyListings } });
    return;
  }

  if (role === "retailer") {
    const inventory = await Batch.countDocuments({
      currentOwner: walletAddress,
      status: { $in: ["Delivered", "RetailReady"] },
    });
    res.json({ success: true, data: { inventory } });
    return;
  }

  res.json({ success: true, data: {} });
}
