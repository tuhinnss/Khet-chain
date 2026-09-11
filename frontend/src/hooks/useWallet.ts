import { BrowserProvider, Contract, ethers, JsonRpcProvider } from "ethers";
import abi from "../abi/KhetChain.json";
import { CONTRACT_ADDRESS, CHAIN_ID, RPC_URL, AMOY_NETWORK_PARAMS } from "../utils/constants";

declare global {
  interface Window {
    ethereum?: {
      isMetaMask?: boolean;
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on: (event: string, handler: (...args: unknown[]) => void) => void;
      removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
    };
  }
}

export async function ensurePolygonAmoyNetwork(): Promise<void> {
  if (!window.ethereum) return;
  const targetChainIdHex = "0x" + CHAIN_ID.toString(16);
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: targetChainIdHex }],
    });
  } catch (err: unknown) {
    const code = (err as { code?: number })?.code;
    if (code === 4902 || (err as { message?: string })?.message?.includes("Unrecognized chain")) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [AMOY_NETWORK_PARAMS],
      });
      return;
    }
    console.warn("Could not switch network automatically:", err);
  }
}

export async function connectWallet(): Promise<string> {
  if (!window.ethereum) {
    throw new Error("MetaMask is not installed. Please install MetaMask from https://metamask.io");
  }
  await ensurePolygonAmoyNetwork();
  const provider = new BrowserProvider(window.ethereum);
  const accounts = (await provider.send("eth_requestAccounts", [])) as string[];
  if (!accounts || accounts.length === 0) {
    throw new Error("No accounts found. Please unlock MetaMask.");
  }
  return accounts[0];
}

export async function getConnectedNetwork(): Promise<{ chainId: number; name: string }> {
  if (!window.ethereum) return { chainId: CHAIN_ID, name: "Disconnected" };
  try {
    const provider = new BrowserProvider(window.ethereum);
    const network = await provider.getNetwork();
    return {
      chainId: Number(network.chainId),
      name: Number(network.chainId) === 80002 ? "Polygon Amoy" : network.name || "Unknown",
    };
  } catch {
    return { chainId: 0, name: "Unknown" };
  }
}

export async function signMessage(message: string): Promise<string> {
  if (!window.ethereum) throw new Error("MetaMask not installed");
  const provider = new BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  return signer.signMessage(message);
}

export async function getContract(): Promise<Contract> {
  if (!window.ethereum) {
    throw new Error("MetaMask not installed. Install MetaMask to interact with the blockchain.");
  }
  if (!CONTRACT_ADDRESS) {
    throw new Error("Contract address is not configured. Deploy the contract or set VITE_CONTRACT_ADDRESS in frontend/.env");
  }
  await ensurePolygonAmoyNetwork();
  const provider = new BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  return new Contract(CONTRACT_ADDRESS, abi, signer);
}

/**
 * Read-only contract provider for public consumers (requires NO MetaMask)
 */
export function getContractReadOnly(): Contract {
  if (!CONTRACT_ADDRESS) {
    throw new Error("Contract address not configured.");
  }
  const provider = new JsonRpcProvider(RPC_URL, CHAIN_ID);
  return new Contract(CONTRACT_ADDRESS, abi, provider);
}

export async function isContractDeployed(): Promise<boolean> {
  if (!CONTRACT_ADDRESS) return false;
  try {
    const provider = window.ethereum
      ? new BrowserProvider(window.ethereum)
      : new JsonRpcProvider(RPC_URL, CHAIN_ID);
    const code = await provider.getCode(CONTRACT_ADDRESS);
    return code !== "0x" && code.length > 2;
  } catch {
    return false;
  }
}

export async function hasRole(role: string, address: string): Promise<boolean> {
  if (!CONTRACT_ADDRESS || !address) return false;
  try {
    const contract = getContractReadOnly();
    const roleHash = ethers.keccak256(ethers.toUtf8Bytes(`${role.toUpperCase()}_ROLE`));
    return await contract.hasRole(roleHash, address);
  } catch (err) {
    console.warn("Error checking role:", err);
    return false;
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
  Completed: 7,
};
