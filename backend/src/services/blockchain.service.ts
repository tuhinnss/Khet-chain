import { ethers } from "ethers";
import { getContract, provider } from "../config/blockchain.js";
import { BATCH_STATUS_MAP, SupplyChainEventData } from "../types/index.js";

export async function readBatch(batchId: number) {
  const contract = getContract();
  const batch = await contract.getBatch(batchId);
  return {
    batchId: Number(batch.batchId),
    batchStringId: batch.batchStringId || `KHC-2026-${String(batch.batchId).padStart(6, "0")}`,
    cropName: batch.cropName,
    quantity: Number(batch.quantity),
    unit: batch.unit || "kg",
    harvestDate: Number(batch.harvestDate),
    location: batch.location,
    certification: batch.certification || "Standard",
    description: batch.description || "",
    farmerAddress: batch.farmerAddress,
    currentOwner: batch.currentOwner,
    currentPrice: batch.currentPrice.toString(),
    status: BATCH_STATUS_MAP[Number(batch.status)] ?? "Created",
    qrHash: batch.qrHash,
    createdAt: Number(batch.createdAt || 0),
    active: batch.active !== undefined ? batch.active : true,
  };
}

export async function readSupplyChainEvents(batchId: number): Promise<SupplyChainEventData[]> {
  const contract = getContract();
  try {
    const events = await contract.getSupplyChainEvents(batchId);
    return events.map((record: {
      actor: string;
      actorRole: string;
      action: string;
      price: bigint;
      quantity: bigint;
      location: string;
      quality: string;
      transportDetails: string;
      storageDetails: string;
      timestamp: bigint;
      metadataURI: string;
    }) => ({
      batchId,
      actor: record.actor,
      actorRole: record.actorRole,
      action: record.action,
      price: record.price.toString(),
      quantity: Number(record.quantity),
      location: record.location,
      quality: record.quality || "GOOD",
      transportDetails: record.transportDetails,
      storageDetails: record.storageDetails,
      timestamp: new Date(Number(record.timestamp) * 1000),
      metadataURI: record.metadataURI,
    }));
  } catch (err) {
    console.warn(`Could not read on-chain supply chain events for batch #${batchId}:`, err);
    return [];
  }
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
      batchStringId: batch.batchStringId || `KHC-2026-${String(batch.batchId).padStart(6, "0")}`,
      cropName: batch.cropName,
      quantity: Number(batch.quantity),
      unit: batch.unit || "kg",
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
