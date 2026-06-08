import { ethers } from "ethers";
import QRCode from "qrcode";
import { env } from "../config/env.js";

export function buildVerificationUrl(batchId: number): string {
  return `${env.FRONTEND_URL}/verify/${batchId}`;
}

export function computeQrHash(batchId: number, cropName: string, farmerAddress: string): string {
  const payload = `${batchId}:${cropName}:${farmerAddress.toLowerCase()}`;
  return ethers.keccak256(ethers.toUtf8Bytes(payload));
}

export async function generateQRCode(batchId: number, qrHash: string): Promise<string> {
  const verificationUrl = buildVerificationUrl(batchId);
  const payload = JSON.stringify({ batchId, verify: verificationUrl, hash: qrHash });
  return QRCode.toDataURL(payload, { errorCorrectionLevel: "H", margin: 2, width: 300 });
}
