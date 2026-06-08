import { ethers } from "ethers";
import { getContract, provider } from "../config/blockchain.js";

export async function verifyTxFromWallet(
  txHash: string,
  expectedFrom: string
): Promise<ethers.TransactionReceipt> {
  const receipt = await provider.getTransactionReceipt(txHash);
  if (!receipt || receipt.status !== 1) {
    throw new Error("Transaction failed or not found");
  }

  const tx = await provider.getTransaction(txHash);
  if (!tx || tx.from.toLowerCase() !== expectedFrom.toLowerCase()) {
    throw new Error("Transaction sender mismatch");
  }

  return receipt;
}

export function parseEvent(
  receipt: ethers.TransactionReceipt,
  eventName: string
): ethers.LogDescription | null {
  const contract = getContract();
  const iface = contract.interface;

  for (const log of receipt.logs) {
    try {
      const parsed = iface.parseLog({ topics: log.topics as string[], data: log.data });
      if (parsed?.name === eventName) return parsed;
    } catch {
      // not our event
    }
  }
  return null;
}
