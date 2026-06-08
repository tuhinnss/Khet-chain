import { BrowserProvider, Contract, ethers } from "ethers";
import abi from "../abi/KhetChain.json";
import { CONTRACT_ADDRESS, CHAIN_ID } from "../utils/constants";

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on: (event: string, handler: (...args: unknown[]) => void) => void;
    };
  }
}

const HARDHAT_NETWORK = {
  chainId: "0x" + CHAIN_ID.toString(16),
  chainName: "Hardhat Local",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: ["http://127.0.0.1:8545"],
};

async function ensureHardhatNetwork(): Promise<void> {
  if (!window.ethereum) return;
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: HARDHAT_NETWORK.chainId }],
    });
  } catch (err: unknown) {
    const code = (err as { code?: number })?.code;
    if (code === 4902) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [HARDHAT_NETWORK],
      });
      return;
    }
    throw new Error(
      "Please add the Hardhat Local network in MetaMask (Chain ID 31337, RPC http://127.0.0.1:8545)"
    );
  }
}

export async function connectWallet(): Promise<string> {
  if (!window.ethereum) throw new Error("MetaMask not installed — install the browser extension first");
  await ensureHardhatNetwork();
  const provider = new BrowserProvider(window.ethereum);
  await provider.send("eth_requestAccounts", []);
  const signer = await provider.getSigner();
  return signer.getAddress();
}

export async function signMessage(message: string): Promise<string> {
  if (!window.ethereum) throw new Error("MetaMask not installed");
  const provider = new BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  return signer.signMessage(message);
}

const BLOCKED_WRITE_METHODS = new Set([
  "grantUserRole",
  "grantRole",
  "revokeRole",
  "renounceRole",
  "pause",
  "unpause",
]);

const ALLOWED_WRITE_METHODS = new Set([
  "registerBatch",
  "createListing",
  "placeBid",
  "acceptBid",
  "transferOwnership",
  "updateStatus",
]);

function guardContractWrites(contract: Contract): Contract {
  return new Proxy(contract, {
    get(target, prop, receiver) {
      if (typeof prop === "string" && BLOCKED_WRITE_METHODS.has(prop)) {
        throw new Error(
          `Blocked admin call "${prop}". Roles are granted server-side — log in or click Sync Blockchain Role. Hard-refresh the page (Ctrl+Shift+R).`
        );
      }
      if (typeof prop === "string" && ALLOWED_WRITE_METHODS.has(prop)) {
        const fn = Reflect.get(target, prop, receiver);
        if (typeof fn !== "function") return fn;
        return (...args: unknown[]) => {
          const data = target.interface.encodeFunctionData(prop, args);
          if (data.startsWith("0xd49137a9")) {
            throw new Error(
              "Blocked grantUserRole transaction. Hard-refresh (Ctrl+Shift+R), then use Sync Blockchain Role — not your wallet."
            );
          }
          return fn.apply(target, args);
        };
      }
      return Reflect.get(target, prop, receiver);
    },
  });
}

export async function getContract() {
  if (!window.ethereum) throw new Error("MetaMask not installed");
  if (!CONTRACT_ADDRESS) throw new Error("Contract address not configured — restart the frontend after setting frontend/.env");
  await ensureHardhatNetwork();
  const provider = new BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  const contract = new Contract(CONTRACT_ADDRESS, abi, signer);
  return guardContractWrites(contract);
}
export async function isContractDeployed(): Promise<boolean> {
  if (!window.ethereum || !CONTRACT_ADDRESS) return false;
  const provider = new BrowserProvider(window.ethereum);
  const code = await provider.getCode(CONTRACT_ADDRESS);
  return code !== "0x" && code.length > 2;
}

export async function hasRole(role: "FARMER" | "DEALER" | "RETAILER", address: string): Promise<boolean> {
  if (!window.ethereum || !CONTRACT_ADDRESS) return false;
  if (!(await isContractDeployed())) {
    throw new Error(
      `No contract at ${CONTRACT_ADDRESS}. Hardhat was likely restarted — run: cd contracts && npm run deploy:local, then update .env files and restart backend/frontend.`
    );
  }
  const provider = new BrowserProvider(window.ethereum);
  const contract = new Contract(CONTRACT_ADDRESS, abi, provider);
  const roleHash = ethers.keccak256(ethers.toUtf8Bytes(`${role}_ROLE`));
  try {
    return await contract.hasRole(roleHash, address);
  } catch {
    throw new Error(
      "Could not read on-chain roles. Redeploy the contract (npm run deploy:local) and log in again."
    );
  }
}

export function computeQrHash(batchId: number, cropName: string, farmerAddress: string): string {
  const payload = `${batchId}:${cropName}:${farmerAddress.toLowerCase()}`;
  return ethers.keccak256(ethers.toUtf8Bytes(payload));
}

export const STATUS_ENUM: Record<string, number> = {
  Created: 0,
  Listed: 1,
  BidReceived: 2,
  Sold: 3,
  InTransit: 4,
  Delivered: 5,
  RetailReady: 6,
};
