import { isAxiosError } from "axios";

const ACCESS_CONTROL_ERROR = "0xe2517d3f";
const ACCESS_CONTROL_MESSAGE =
  "Missing on-chain role or wrong wallet. Make sure an admin has approved your account, use the wallet you registered with, then click Sync Blockchain Role.";

// Contract revert reasons (KhetChain.sol require strings and OpenZeppelin custom errors) as plain sentences.
const REVERT_MESSAGES: Record<string, string> = {
  "Unauthorized actor": "Only the batch's current owner can record a checkpoint for it.",
  "Batch is listed for sale": "This batch is listed for sale, so its custody can't change until the sale completes.",
  "Invalid status transition": "That status change isn't allowed from the batch's current status.",
  "Not owner": "Only the batch's current owner can do this.",
  "Not current batch owner": "Only the batch's current owner can do this.",
  "Not owner/admin": "Only the batch's current owner can do this.",
  "Invalid status": "This batch can't be listed in its current status.",
  "Bid inactive": "That bid is no longer active: it was accepted, withdrawn or replaced.",
  "No bid": "You don't have a bid on this batch.",
  "Bid amount required": "Enter a bid amount.",
  "Bid below asking price": "Your bid is below the asking price.",
  "Must exceed previous bid": "A new bid must be higher than your current one.",
  "Not listed": "This batch isn't listed for sale.",
  "Must be Dealer/Distributor": "Only approved dealers and distributors can bid.",
  "Batch not found": "That batch doesn't exist on-chain.",
  "Cannot transfer to self": "You already hold this batch.",
  "Invalid new owner": "Enter a valid wallet address for the new owner.",
  EnforcedPause: "The contract is paused by the administrator. Try again later.",
  AccessControlUnauthorizedAccount: ACCESS_CONTROL_MESSAGE,
};

/** The revert reason inside an ethers v6 / MetaMask / Hardhat error, if any. */
function revertReason(err: unknown): string | null {
  const e = err as {
    reason?: unknown;
    revert?: { name?: unknown };
    shortMessage?: unknown;
    info?: { error?: { message?: unknown } };
    message?: unknown;
  };
  if (typeof e?.reason === "string" && e.reason) return e.reason;
  if (typeof e?.revert?.name === "string" && e.revert.name !== "Error") return e.revert.name;

  for (const text of [e?.shortMessage, e?.info?.error?.message, e?.message]) {
    if (typeof text !== "string") continue;
    const match =
      text.match(/reverted with reason string '([^']+)'/) ??
      text.match(/reverted with custom error '(\w+)/) ??
      text.match(/execution reverted:\s*"?([^"()\n]+)/);
    if (match) return match[1].trim();
  }
  return null;
}

export function getErrorMessage(err: unknown, fallback = "Something went wrong"): string {
  const errMsg = err instanceof Error ? err.message : String(err);
  if ((err as { code?: unknown })?.code === "ACTION_REJECTED") {
    return "You rejected the transaction in MetaMask.";
  }
  if (errMsg.includes("BAD_DATA") || errMsg.includes('value="0x"') || errMsg.includes("could not decode result")) {
    return "Contract not found on-chain. Restart Hardhat, run npm run deploy:local in contracts/, update .env, then log in again.";
  }
  if (errMsg.includes("d49137a9") || errMsg.includes("grantUserRole")) {
    return "Reject this MetaMask transaction. The app never grants roles from your wallet — use Sync Blockchain Role (server-side) or log in again.";
  }
  if (errMsg.includes(ACCESS_CONTROL_ERROR) || errMsg.includes("e2517d3f")) {
    return ACCESS_CONTROL_MESSAGE;
  }
  const reason = revertReason(err);
  if (reason) return REVERT_MESSAGES[reason] ?? `The contract rejected this transaction: ${reason}`;
  if (isAxiosError(err)) {
    const apiMsg = err.response?.data?.error?.message;
    if (typeof apiMsg === "string") return apiMsg;
    if (err.response?.status === 409) return "An account with this email or wallet already exists";
    if (err.code === "ERR_NETWORK") return "Cannot reach the API — is the backend running on port 4000?";
    return err.message || fallback;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}

/**
 * "<action> failed: <reason>". Several dashboards style an alert as an error only
 * when its text contains "failed", so their catch blocks use this.
 */
export function describeFailure(err: unknown, action: string): string {
  return `${action} failed: ${getErrorMessage(err, "unknown error")}`;
}
