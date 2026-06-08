import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  const KhetChain = await ethers.getContractFactory("KhetChain");
  const contract = await KhetChain.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("KhetChain deployed to:", address);

  const deployment = {
    address,
    network: (await ethers.provider.getNetwork()).name,
    chainId: Number((await ethers.provider.getNetwork()).chainId),
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
  };

  const outDir = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(outDir, { recursive: true });
  const file = path.join(outDir, `khetchain-${deployment.chainId}.json`);
  fs.writeFileSync(file, JSON.stringify(deployment, null, 2));
  console.log("Deployment saved to:", file);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
