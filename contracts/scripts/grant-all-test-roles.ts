import { ethers } from "hardhat";

const ROLES: Record<string, string> = {
  farmer: ethers.keccak256(ethers.toUtf8Bytes("FARMER_ROLE")),
  dealer: ethers.keccak256(ethers.toUtf8Bytes("DEALER_ROLE")),
  retailer: ethers.keccak256(ethers.toUtf8Bytes("RETAILER_ROLE")),
};

async function main() {
  const contractAddress = process.env.KHETCHAIN_CONTRACT_ADDRESS;
  if (!contractAddress) throw new Error("Set KHETCHAIN_CONTRACT_ADDRESS");

  const [, farmer, dealer, retailer] = await ethers.getSigners();
  const contract = await ethers.getContractAt("KhetChain", contractAddress);

  const grants = [
    { wallet: farmer.address, role: "farmer" },
    { wallet: dealer.address, role: "dealer" },
    { wallet: retailer.address, role: "retailer" },
  ];

  for (const { wallet, role } of grants) {
    const hash = ROLES[role];
    if (!(await contract.hasRole(hash, wallet))) {
      await (await contract.grantUserRole(wallet, hash)).wait();
      console.log(`Granted ${role} -> ${wallet}`);
    } else {
      console.log(`Already has ${role}: ${wallet}`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
