import { ethers } from "ethers";
import QRCode from "qrcode";
import { env } from "../config/env.js";

/**
 * QR authenticity: the farmer's browser picks a random 32-byte secret and
 * registers keccak256(secret) on-chain as the batch's qrHash. The secret is
 * printed only inside the package's QR label, so a scan proves the scanner saw
 * a genuine label. The on-chain hash alone is public and proves nothing.
 */

/** Public trace page; with the secret, the authenticity URL printed in the QR label. */
export function buildVerificationUrl(batchId: number, secret?: string): string {
  const url = `${env.FRONTEND_URL}/trace/${batchId}`;
  return secret ? `${url}?s=${secret}` : url;
}

export function isQrSecret(value: unknown): value is string {
  return typeof value === "string" && ethers.isHexString(value, 32);
}

export function secretMatchesHash(secret: string, qrHash: string): boolean {
  return isQrSecret(secret) && ethers.keccak256(secret).toLowerCase() === qrHash.toLowerCase();
}

export async function generateQRCode(batchId: number, secret: string): Promise<string> {
  return QRCode.toDataURL(buildVerificationUrl(batchId, secret), {
    errorCorrectionLevel: "H",
    margin: 2,
    width: 400,
    color: { dark: "#1b4332", light: "#ffffff" },
  });
}
