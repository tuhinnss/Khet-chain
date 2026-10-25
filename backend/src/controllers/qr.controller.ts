import { Response } from "express";
import { AuthRequest } from "../types/index.js";
import { Batch } from "../models/Batch.js";
import { buildVerificationUrl, generateQRCode } from "../services/qr.service.js";

/** The printable authenticity label. It embeds the batch secret, so only its custodians get it. */
export async function generateQR(req: AuthRequest, res: Response): Promise<void> {
  const batchId = Number(req.params.batchId || req.params.id);
  const batch = await Batch.findOne({ batchId }).select("+qrSecret");
  if (!batch) {
    res.status(404).json({ success: false, error: { message: "Batch not found" } });
    return;
  }

  const wallet = req.user!.walletAddress.toLowerCase();
  if (wallet !== batch.farmerAddress && wallet !== batch.currentOwner) {
    res.status(403).json({
      success: false,
      error: { message: "Only the batch's farmer or current custodian can print its QR label" },
    });
    return;
  }

  if (!batch.qrSecret) {
    res.status(404).json({ success: false, error: { message: "No QR secret on record for this batch" } });
    return;
  }

  res.json({
    success: true,
    data: {
      batchId,
      url: buildVerificationUrl(batchId, batch.qrSecret),
      qrCodeDataUrl: await generateQRCode(batchId, batch.qrSecret),
    },
  });
}
