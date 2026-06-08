import { ethers } from "ethers";
import { getContract, provider } from "../config/blockchain.js";
import { SyncState } from "../models/SyncState.js";
import { EventLog } from "../models/EventLog.js";
import { Batch } from "../models/Batch.js";
import { Bid } from "../models/Bid.js";
import { TransferHistory } from "../models/TransferHistory.js";
import { BATCH_STATUS_MAP } from "../types/index.js";

const SYNC_KEY = "khetchain_events";

async function getLastBlock(): Promise<number> {
  const state = await SyncState.findOne({ key: SYNC_KEY });
  return state?.lastProcessedBlock ?? 0;
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
  const poll = async () => {
    try {
      const fromBlock = (await getLastBlock()) + 1;
      const latest = await provider.getBlockNumber();
      if (fromBlock > latest) return;

      const logs = await provider.getLogs({
        address: await contract.getAddress(),
        fromBlock,
        toBlock: latest,
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
      await setLastBlock(latest);
    } catch (err) {
      console.error("Event listener error:", err);
    }
  };

  await poll();
  setInterval(poll, 8000);
  console.log("Blockchain event listener started");
}
