import { formatEther } from "ethers";

/**
 * On-chain prices use two units. Marketplace amounts (listing, bids, escrow,
 * sale) are wei; provenance prices (harvest, checkpoints, transfers) are ₹ per
 * unit. Supply-chain events with these actions carry wei, all others carry ₹.
 */
const TRADE_ACTIONS = new Set(["LISTED", "PURCHASED"]);

export function isTradeAction(action: string): boolean {
  return TRADE_ACTIONS.has(action);
}

/** "0.1000 ETH" from a wei amount; "—" when missing or not a wei integer. */
export function formatEth(wei: string | bigint | null | undefined): string {
  if (wei === null || wei === undefined || wei === "") return "—";
  try {
    return `${Number(formatEther(wei)).toFixed(4)} ETH`;
  } catch {
    return "—";
  }
}

export function formatEventPrice(action: string, price: string | bigint): string {
  return isTradeAction(action) ? formatEth(price) : `₹${price.toString()}`;
}
