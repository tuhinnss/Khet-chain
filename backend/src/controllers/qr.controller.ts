import { Request, Response } from "express";
import QRCode from "qrcode";
import { Batch } from "../models/Batch.js";
import { env } from "../config/env.js";

export async function generateQR(req: Request, res: Response): Promise<void> {
  const batchId = Number(req.params.batchId || req.params.id);
  const frontendUrl = env.FRONTEND_URL || "http://localhost:5173";
  const traceUrl = `${frontendUrl}/trace/${batchId}`;

  try {
    const dataUrl = await QRCode.toDataURL(traceUrl, {
      errorCorrectionLevel: "H",
      margin: 2,
      width: 400,
      color: {
        dark: "#1b4332",
        light: "#ffffff",
      },
    });

    // Also update batch cache if it exists
    await Batch.findOneAndUpdate({ batchId }, { qrCodeDataUrl: dataUrl, verificationUrl: traceUrl });

    res.json({
      success: true,
      data: {
        batchId,
        url: traceUrl,
        qrCodeDataUrl: dataUrl,
      },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: { message: "Failed to generate QR code" },
    });
  }
}
