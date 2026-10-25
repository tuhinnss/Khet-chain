import { ethers } from "ethers";
import { getContract, provider } from "../config/blockchain.js";
import { env } from "../config/env.js";
import { ProcessedTx } from "../models/ProcessedTx.js";
import { HttpError } from "../utils/http.js";

function contractAddress(): string {
  if (!env.KHETCHAIN_CONTRACT_ADDRESS) {
    throw new Error("KHETCHAIN_CONTRACT_ADDRESS is not configured");
  }
  return env.KHETCHAIN_CONTRACT_ADDRESS.toLowerCase();
}

export async function verifyTxFromWallet(
  txHash: string,
  expectedFrom: string
): Promise<ethers.TransactionReceipt> {
  if (typeof txHash !== "string" || !ethers.isHexString(txHash, 32)) {
    throw new HttpError(400, "Invalid transaction hash");
  }

  const receipt = await provider.getTransactionReceipt(txHash);
  if (!receipt || receipt.status !== 1) {
    throw new HttpError(400, "Transaction failed or not found");
  }

  const tx = await provider.getTransaction(txHash);
  if (!tx || tx.from.toLowerCase() !== expectedFrom.toLowerCase()) {
    throw new HttpError(403, "Transaction sender mismatch");
  }

  // Without this, a tx to an attacker's contract emitting look-alike events
  // would be accepted as proof of a KhetChain action.
  if (!tx.to || tx.to.toLowerCase() !== contractAddress()) {
    throw new HttpError(400, "Transaction was not sent to the KhetChain contract");
  }

  return receipt;
}

export function parseEvent(
  receipt: ethers.TransactionReceipt,
  eventName: string
): ethers.LogDescription | null {
  const iface = getContract().interface;
  const address = contractAddress();

  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== address) continue;
    try {
      const parsed = iface.parseLog({ topics: log.topics as string[], data: log.data });
      if (parsed?.name === eventName) return parsed;
    } catch {
      // not our event
    }
  }
  return null;
}

/**
 * Marks a verified tx as used. Call after the tx and its event have been
 * checked and before writing anything derived from it.
 */
export async function claimTx(txHash: string, purpose: string, wallet: string): Promise<void> {
  try {
    await ProcessedTx.create({ txHash, purpose, wallet });
  } catch (err) {
    if ((err as { code?: number }).code === 11000) {
      throw new HttpError(409, "Transaction already processed");
    }
    throw err;
  }
}
