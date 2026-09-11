import { ethers } from "ethers";
import { getContract, provider } from "../config/blockchain.js";
import { SyncState } from "../models/SyncState.js";
import { EventLog } from "../models/EventLog.js";
import { Batch } from "../models/Batch.js";
import { Bid } from "../models/Bid.js";
import { TransferHistory } from "../models/TransferHistory.js";
import { BATCH_STATUS_MAP } from "../types/index.js";

const SYNC_KEY = "khetchain_events";
// Public RPC providers (e.g. the publicnode.com Sepolia endpoint) cap eth_getLogs
// at a maximum block range (commonly 50,000). Stay comfortably under that so a
// catch-up sync spanning millions of blocks doesn't fail outright.
const MAX_BLOCK_RANGE = 45_000;
// Free public RPC nodes only retain recent log history, not a full archive back
// to block 0 -- scanning from genesis fails with "pruned history unavailable".
// On first run (no SyncState yet), start a bounded window back from the current
// tip instead. Override with EVENT_SYNC_START_BLOCK if you need to resume from
// a specific block (e.g. the contract's actual deployment block).
const DEFAULT_LOOKBACK_BLOCKS = 10_000;

async function getLastBlock(latestBlock: number): Promise<number> {
  const state = await SyncState.findOne({ key: SYNC_KEY });
  if (state?.lastProcessedBlock) return state.lastProcessedBlock;

  const configuredStart = Number(process.env.EVENT_SYNC_START_BLOCK);
  if (process.env.EVENT_SYNC_START_BLOCK && !Number.isNaN(configuredStart)) {
    return Math.max(0, configuredStart - 1);
  }
  return Math.max(0, latestBlock - DEFAULT_LOOKBACK_BLOCKS);
}

async function setLastBlock(block: number): Promise<void> {
  await SyncState.findOneAndUpdate(
    { key: SYNC_KEY },
    { lastProcessedBlock: block },
    { upsert: true }
  );
}

async function handleEvent(
  eventName: string,
  args: ethers.Result,
  txHash: string,
  blockNumber: number
): Promise<void> {
  const exists = await EventLog.findOne({ txHash, eventName });
  if (exists) return;

  const batchId = args.batchId !== undefined ? Number(args.batchId) : undefined;

  await EventLog.create({ eventName, batchId, txHash, blockNumber, args: args.toObject() });

  if (eventName === "BatchRegistered" && batchId) {
    await Batch.findOneAndUpdate(
      { batchId },
      {
        $setOnInsert: {
          batchId,
          cropName: args.cropName,
          farmerAddress: args.farmer.toLowerCase(),
          currentOwner: args.farmer.toLowerCase(),
          qrHash: args.qrHash,
          status: "Created",
        },
      },
      { upsert: true }
    );
  }

  if (eventName === "ListingCreated" && batchId) {
    await Batch.updateOne({ batchId }, { status: "Listed", currentPrice: args.price.toString() });
  }

  if (eventName === "BidPlaced" && batchId) {
    await Batch.updateOne({ batchId }, { status: "BidReceived" });
  }

  if (eventName === "BidAccepted" && batchId) {
    await Batch.updateOne(
      { batchId },
      {
        status: "Sold",
        currentOwner: args.dealer.toLowerCase(),
        currentPrice: args.amount.toString(),
      }
    );
    await Bid.updateMany(
      { batchId, dealerAddress: args.dealer.toLowerCase() },
      { status: "accepted" }
    );
    await Bid.updateMany({ batchId, status: "pending" }, { status: "rejected" });
  }

  if (eventName === "OwnershipTransferred" && batchId) {
    await Batch.updateOne({ batchId }, { currentOwner: args.to.toLowerCase() });
    await TransferHistory.create({
      batchId,
      fromAddress: args.from.toLowerCase(),
      toAddress: args.to.toLowerCase(),
      statusAtTransfer: "Transferred",
      txHash,
      blockNumber,
      timestamp: new Date(),
      action: "transferred",
    });
  }

  if (eventName === "StatusUpdated" && batchId) {
    const newStatus = BATCH_STATUS_MAP[Number(args.newStatus)] ?? "Created";
    await Batch.updateOne({ batchId }, { status: newStatus });
    await TransferHistory.create({
      batchId,
      fromAddress: "system",
      toAddress: "system",
      statusAtTransfer: newStatus,
      txHash,
      blockNumber,
      timestamp: new Date(),
      action: "status_updated",
    });
  }
}

export async function startEventListener(): Promise<void> {
  if (!process.env.KHETCHAIN_CONTRACT_ADDRESS) {
    console.warn("Event listener skipped: contract address not set");
    return;
  }

  const contract = getContract();
  const contractAddress = await contract.getAddress();
  const poll = async () => {
    try {
      const latest = await provider.getBlockNumber();
      let fromBlock = (await getLastBlock(latest)) + 1;
      if (fromBlock > latest) return;

      // Scan in bounded chunks and checkpoint after each one, so a transient
      // RPC error partway through a large catch-up doesn't lose progress and
      // force rescanning from the beginning on the next poll.
      while (fromBlock <= latest) {
        const toBlock = Math.min(fromBlock + MAX_BLOCK_RANGE - 1, latest);
        const logs = await provider.getLogs({
          address: contractAddress,
          fromBlock,
          toBlock,
        });
        for (const log of logs) {
          try {
            const parsed = contract.interface.parseLog({
              topics: log.topics as string[],
              data: log.data,
            });
            if (!parsed) continue;
            await handleEvent(
              parsed.name,
              parsed.args,
              log.transactionHash,
              log.blockNumber
            );
          } catch {
            // skip unrelated logs
          }
        }
        await setLastBlock(toBlock);
        fromBlock = toBlock + 1;
      }
    } catch (err) {
      console.error("Event listener error:", err);
    }
  };

  await poll();
  setInterval(poll, 8000);
  console.log("Blockchain event listener started");
}
