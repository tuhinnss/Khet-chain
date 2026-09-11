import { Request, Response } from "express";
import { AuthRequest } from "../types/index.js";
import { SupplyChainEvent } from "../models/SupplyChainEvent.js";
import { Batch } from "../models/Batch.js";
import { verifyTxFromWallet } from "../services/tx.service.js";

export async function addSupplyChainEvent(req: AuthRequest, res: Response): Promise<void> {
  try {
    const {
      batchId,
      txHash,
      actorRole,
      action,
      price,
      quantity,
      location,
      quality,
      transportDetails,
      storageDetails,
      metadataURI,
    } = req.body as {
      batchId: number;
      txHash: string;
      actorRole: string;
      action: string;
      price?: string;
      quantity?: number;
      location?: string;
      quality?: string;
      transportDetails?: string;
      storageDetails?: string;
      metadataURI?: string;
    };

    const wallet = req.user?.walletAddress || req.body.actor;
    if (!batchId || !txHash || !action) {
      res.status(400).json({ success: false, error: { message: "Missing required event fields" } });
      return;
    }

    let blockNumber = 0;
    try {
      if (req.user) {
        const receipt = await verifyTxFromWallet(txHash, wallet);
        blockNumber = receipt.blockNumber;
      }
    } catch (e) {
      console.warn("Could not verify tx signature directly, continuing to store event metadata:", e);
    }

    const event = await SupplyChainEvent.create({
      batchId,
      actor: wallet,
      actorRole: actorRole || "ACTOR",
      action,
      price: price || "0",
      quantity: quantity || 0,
      location: location || "",
      quality: quality || "GOOD",
      transportDetails: transportDetails || "",
      storageDetails: storageDetails || "",
      timestamp: new Date(),
      metadataURI: metadataURI || "",
      txHash,
      blockNumber,
    });

    // Update batch currentOwner / price if transferred
    const updateFields: Record<string, unknown> = {};
    if (price && Number(price) > 0) updateFields.currentPrice = price;
    if (action === "TRANSFERRED" && req.body.newOwner) updateFields.currentOwner = req.body.newOwner.toLowerCase();
    if (action === "RETAIL_READY") updateFields.status = "RetailReady";
    if (action === "PURCHASED") updateFields.status = "Sold";

    if (Object.keys(updateFields).length > 0) {
      await Batch.findOneAndUpdate({ batchId }, updateFields);
    }

    res.status(201).json({ success: true, data: event });
  } catch (err) {
    console.error("Add supply chain event error:", err);
    res.status(500).json({
      success: false,
      error: { message: err instanceof Error ? err.message : "Failed to record supply chain event" },
    });
  }
}

export async function getSupplyChainEvents(req: Request, res: Response): Promise<void> {
  const batchId = Number(req.params.batchId || req.params.id);
  const events = await SupplyChainEvent.find({ batchId }).sort({ timestamp: 1 });
  res.json({ success: true, data: events });
}
