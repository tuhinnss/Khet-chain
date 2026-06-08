import { ethers } from "hardhat";

const ROLES: Record<string, string> = {
  farmer: ethers.keccak256(ethers.toUtf8Bytes("FARMER_ROLE")),
  dealer: ethers.keccak256(ethers.toUtf8Bytes("DEALER_ROLE")),
  retailer: ethers.keccak256(ethers.toUtf8Bytes("RETAILER_ROLE")),
};

async function main() {
  const contractAddress = process.env.KHETCHAIN_CONTRACT_ADDRESS;
  const wallet = process.env.WALLET_ADDRESS;
  const role = process.env.ROLE || "farmer";

  if (!contractAddress || !wallet) {
    throw new Error("Set KHETCHAIN_CONTRACT_ADDRESS and WALLET_ADDRESS");
  }

  const roleHash = ROLES[role];
  if (!roleHash) throw new Error(`Unknown role: ${role}`);

  const contract = await ethers.getContractAt("KhetChain", contractAddress);
  const has = await contract.hasRole(roleHash, wallet);
  if (has) {
    console.log(`${wallet} already has ${role} role`);
    return;
  }

  const tx = await contract.grantUserRole(wallet, roleHash);
  await tx.wait();
  console.log(`Granted ${role} role to ${wallet}`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
