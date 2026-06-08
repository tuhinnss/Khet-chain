import { isAxiosError } from "axios";

const ACCESS_CONTROL_ERROR = "0xe2517d3f";

export function getErrorMessage(err: unknown, fallback = "Something went wrong"): string {
  const errMsg = err instanceof Error ? err.message : String(err);
  if (errMsg.includes("BAD_DATA") || errMsg.includes('value="0x"') || errMsg.includes("could not decode result")) {
    return "Contract not found on-chain. Restart Hardhat, run npm run deploy:local in contracts/, update .env, then log in again.";
  }
  if (errMsg.includes("d49137a9") || errMsg.includes("grantUserRole")) {
    return "Reject this MetaMask transaction. The app never grants roles from your wallet — use Sync Blockchain Role (server-side) or log in again.";
  }
  if (errMsg.includes(ACCESS_CONTROL_ERROR) || errMsg.includes("e2517d3f")) {
    return "Missing on-chain role or wrong wallet. Log in again, click Sync Blockchain Role, and use the wallet you registered with (farmers cannot use a dealer account).";
  }
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
