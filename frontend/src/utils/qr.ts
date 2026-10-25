import { ethers } from "ethers";

/**
 * QR authenticity: a random 32-byte secret is printed in the package's QR label
 * and only keccak256(secret) goes on-chain as the batch's qrHash. Scanning the
 * label proves you saw a genuine one; the public hash alone proves nothing.
 */
export function createQrSecret(): { secret: string; qrHash: string } {
  const secret = ethers.hexlify(ethers.randomBytes(32));
  return { secret, qrHash: ethers.keccak256(secret) };
}

export function secretMatchesHash(secret: string, qrHash: string): boolean {
  return ethers.isHexString(secret, 32) && ethers.keccak256(secret).toLowerCase() === qrHash.toLowerCase();
}

/** True if the URL is a printed authenticity label (carries a secret), not a share link. */
export function isLabelUrl(url: string): boolean {
  return /[?&]s=0x[0-9a-fA-F]{64}\b/.test(url);
}

export function tracePath(batchId: number, secret?: string): string {
  return secret ? `/trace/${batchId}?s=${secret}` : `/trace/${batchId}`;
}

/**
 * Reads what a scanner returns: a trace URL (`/trace/12?s=0x…`), the legacy JSON
 * payload, or a bare batch ID. Matching the first digits of a URL picked up the port.
 */
export function parseQrPayload(raw: string): { batchId: number; secret?: string } | null {
  const text = raw.trim();
  try {
    const url = new URL(text);
    const match = url.pathname.match(/\/(?:trace|verify)\/(\d+)/);
    if (match) return { batchId: Number(match[1]), secret: url.searchParams.get("s") ?? undefined };
  } catch {
    // not a URL
  }
  try {
    const parsed = JSON.parse(text);
    if (parsed && Number(parsed.batchId)) return { batchId: Number(parsed.batchId) };
  } catch {
    // not JSON
  }
  return /^\d+$/.test(text) ? { batchId: Number(text) } : null;
}
