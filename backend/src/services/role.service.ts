import { getContract, getRelayerSigner, provider, ROLE_HASHES } from "../config/blockchain.js";
import { UserRole } from "../types/index.js";

const roleToOnChain: Record<string, string> = {
  farmer: ROLE_HASHES.FARMER,
  distributor: ROLE_HASHES.DISTRIBUTOR,
  wholesaler: ROLE_HASHES.WHOLESALER,
  dealer: ROLE_HASHES.DEALER,
  retailer: ROLE_HASHES.RETAILER,
};

export async function checkOnChainRole(
  walletAddress: string,
  role: UserRole
): Promise<boolean> {
  const roleHash = roleToOnChain[role];
  if (!roleHash) return false;
  try {
    const code = await provider.getCode(process.env.KHETCHAIN_CONTRACT_ADDRESS || "");
    if (!code || code === "0x") return false;
    const contract = getContract();
    return await contract.hasRole(roleHash, walletAddress);
  } catch {
    return false;
  }
}

export async function ensureOnChainRole(
  walletAddress: string,
  role: UserRole
): Promise<{ granted: boolean; error?: string }> {
  const roleHash = roleToOnChain[role];
  if (!roleHash) return { granted: false, error: "Invalid role" };

  const relayer = getRelayerSigner();
  if (!relayer) {
    return { granted: false, error: "Relayer not configured — set RELAYER_PRIVATE_KEY in .env" };
  }

  try {
    const code = await provider.getCode(process.env.KHETCHAIN_CONTRACT_ADDRESS || "");
    if (!code || code === "0x") {
      return {
        granted: false,
        error: "Contract not deployed. Run: cd contracts && npm run deploy:local or npm run deploy:amoy",
      };
    }

    const contract = getContract(relayer);
    const hasRole: boolean = await contract.hasRole(roleHash, walletAddress);
    if (hasRole) return { granted: true };

    await (await contract.grantUserRole(walletAddress, roleHash)).wait();
    console.log(`Granted ${role} role on-chain to ${walletAddress}`);
    return { granted: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Role grant failed";
    console.error("On-chain role grant failed:", err);
    return { granted: false, error: message };
  }
}
