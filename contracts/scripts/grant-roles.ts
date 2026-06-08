import { ethers } from "hardhat";

const FARMER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("FARMER_ROLE"));
const DEALER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("DEALER_ROLE"));
const RETAILER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("RETAILER_ROLE"));

async function main() {
  const contractAddress = process.env.KHETCHAIN_CONTRACT_ADDRESS;
  if (!contractAddress) {
    throw new Error("Set KHETCHAIN_CONTRACT_ADDRESS");
  }

  const [admin, farmer, dealer, retailer] = await ethers.getSigners();
  const contract = await ethers.getContractAt("KhetChain", contractAddress);

  await (await contract.grantUserRole(farmer.address, FARMER_ROLE)).wait();
  await (await contract.grantUserRole(dealer.address, DEALER_ROLE)).wait();
  await (await contract.grantUserRole(retailer.address, RETAILER_ROLE)).wait();

  console.log("Roles granted:");
  console.log("  Farmer:", farmer.address);
  console.log("  Dealer:", dealer.address);
  console.log("  Retailer:", retailer.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
