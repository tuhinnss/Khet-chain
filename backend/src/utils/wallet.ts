import { ethers } from "ethers";

export function buildSignMessage(walletAddress: string, nonce: string): string {
  return `Sign in to KhetChain\nWallet: ${walletAddress}\nNonce: ${nonce}`;
}

export function verifyWalletSignature(
  message: string,
  signature: string,
  expectedAddress: string
): boolean {
  try {
    const recovered = ethers.verifyMessage(message, signature);
    return recovered.toLowerCase() === expectedAddress.toLowerCase();
  } catch {
    return false;
  }
}
