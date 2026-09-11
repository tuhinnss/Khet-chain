import { ethers } from "ethers";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { env } from "./env.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const abi = JSON.parse(readFileSync(join(__dirname, "../abi/KhetChain.json"), "utf-8"));

export const provider = new ethers.JsonRpcProvider(env.RPC_URL, env.CHAIN_ID);

export function getContract(signerOrProvider?: ethers.Signer | ethers.Provider) {
  if (!env.KHETCHAIN_CONTRACT_ADDRESS) {
    throw new Error("KHETCHAIN_CONTRACT_ADDRESS is not configured");
  }
  return new ethers.Contract(
    env.KHETCHAIN_CONTRACT_ADDRESS,
    abi,
    signerOrProvider ?? provider
  );
}

export function getRelayerSigner(): ethers.Wallet | null {
  if (!env.RELAYER_PRIVATE_KEY) return null;
  return new ethers.Wallet(env.RELAYER_PRIVATE_KEY, provider);
}

export const ROLE_HASHES = {
  FARMER: ethers.keccak256(ethers.toUtf8Bytes("FARMER_ROLE")),
  DEALER: ethers.keccak256(ethers.toUtf8Bytes("DEALER_ROLE")),
  RETAILER: ethers.keccak256(ethers.toUtf8Bytes("RETAILER_ROLE")),
  DISTRIBUTOR: ethers.keccak256(ethers.toUtf8Bytes("DISTRIBUTOR_ROLE")),
  WHOLESALER: ethers.keccak256(ethers.toUtf8Bytes("WHOLESALER_ROLE")),
  ADMIN: ethers.keccak256(ethers.toUtf8Bytes("ADMIN_ROLE")),
};
