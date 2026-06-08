import { ethers } from "ethers";
import { getContract, provider } from "../config/blockchain.js";
import { BATCH_STATUS_MAP } from "../types/index.js";

export async function readBatch(batchId: number) {
  const contract = getContract();
  const batch = await contract.getBatch(batchId);
  return {
    batchId: Number(batch.batchId),
    cropName: batch.cropName,
    quantity: Number(batch.quantity),
    harvestDate: Number(batch.harvestDate),
    location: batch.location,
    farmerAddress: batch.farmerAddress,
    currentOwner: batch.currentOwner,
    currentPrice: batch.currentPrice.toString(),
    status: BATCH_STATUS_MAP[Number(batch.status)] ?? "Created",
    qrHash: batch.qrHash,
  };
}

export async function readBatchHistory(batchId: number) {
  const contract = getContract();
  const history = await contract.getBatchHistory(batchId);
  return history.map((record: {
    from: string;
    to: string;
    status: number;
    timestamp: bigint;
    action: string;
  }) => ({
    from: record.from,
    to: record.to,
    status: BATCH_STATUS_MAP[Number(record.status)] ?? "Created",
    timestamp: new Date(Number(record.timestamp) * 1000),
    action: record.action,
  }));
}

export async function readBids(batchId: number) {
  const contract = getContract();
  const bids = await contract.getBids(batchId);
  return bids.map((bid: {
    dealer: string;
    amount: bigint;
    timestamp: bigint;
    active: boolean;
  }, index: number) => ({
    index,
    dealer: bid.dealer,
    amount: bid.amount.toString(),
    timestamp: new Date(Number(bid.timestamp) * 1000),
    active: bid.active,
  }));
}

export async function verifyOnChain(batchId: number, scannedHash: string) {
  const contract = getContract();
  const [authentic, batch] = await contract.verifyBatch.staticCall(batchId, scannedHash);
  return {
    authentic,
    batch: {
      batchId: Number(batch.batchId),
      cropName: batch.cropName,
      quantity: Number(batch.quantity),
      currentOwner: batch.currentOwner,
      status: BATCH_STATUS_MAP[Number(batch.status)] ?? "Created",
      qrHash: batch.qrHash,
    },
  };
}

export async function waitForTx(tx: ethers.ContractTransactionResponse) {
  const receipt = await tx.wait();
  return {
    txHash: receipt?.hash ?? tx.hash,
    blockNumber: receipt?.blockNumber ?? 0,
  };
}
