import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  console.log("==========================================");
  console.log("KHETCHAIN CONTRACT DEPLOYMENT");
  console.log("==========================================");
  console.log("Deployer address:", deployer.address);
  console.log("Network:", network.name, `(Chain ID: ${network.chainId})`);

  const KhetChain = await ethers.getContractFactory("KhetChain");
  const contract = await KhetChain.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log(">>> KhetChain successfully deployed to:", address);

  const registrar = await grantRegistrar(address, deployer.address);

  const deployment = {
    address,
    network: network.name,
    chainId: Number(network.chainId),
    deployer: deployer.address,
    registrar,
    deployedAt: new Date().toISOString(),
  };

  // 1. Save deployment record in contracts/deployments
  const outDir = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(outDir, { recursive: true });
  const file = path.join(outDir, `khetchain-${deployment.chainId}.json`);
  fs.writeFileSync(file, JSON.stringify(deployment, null, 2));
  console.log("Saved deployment metadata to:", file);

  // 2. Export Artifact / ABI to Frontend & Backend
  const artifactPath = path.join(__dirname, "..", "artifacts", "contracts", "KhetChain.sol", "KhetChain.json");
  if (fs.existsSync(artifactPath)) {
    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf-8"));
    const abiOnly = JSON.stringify(artifact.abi, null, 2);

    const frontendAbiDir = path.join(__dirname, "..", "..", "frontend", "src", "abi");
    const backendAbiDir = path.join(__dirname, "..", "..", "backend", "src", "abi");

    fs.mkdirSync(frontendAbiDir, { recursive: true });
    fs.mkdirSync(backendAbiDir, { recursive: true });

    fs.writeFileSync(path.join(frontendAbiDir, "KhetChain.json"), abiOnly);
    fs.writeFileSync(path.join(backendAbiDir, "KhetChain.json"), abiOnly);

    console.log("Synced Contract ABI to frontend/src/abi and backend/src/abi");
  }

  console.log("==========================================");
  console.log(`Set VITE_CONTRACT_ADDRESS=${address} in frontend/.env`);
  console.log(`Set KHETCHAIN_CONTRACT_ADDRESS=${address} in backend/.env / root .env`);
  console.log("==========================================");
}

/**
 * The backend relayer only needs to grant/revoke actor roles, so it gets
 * REGISTRAR_ROLE rather than running with the deployer's full admin key.
 * Address comes from REGISTRAR_ADDRESS, else is derived from RELAYER_PRIVATE_KEY.
 */
async function grantRegistrar(contractAddress: string, deployerAddress: string): Promise<string | null> {
  let relayer = process.env.REGISTRAR_ADDRESS || "";
  if (!relayer && process.env.RELAYER_PRIVATE_KEY) {
    try {
      relayer = new ethers.Wallet(process.env.RELAYER_PRIVATE_KEY).address;
    } catch {
      console.warn("RELAYER_PRIVATE_KEY is not a valid key; skipping REGISTRAR_ROLE grant.");
    }
  }

  if (!relayer) {
    console.warn("No relayer configured. Grant REGISTRAR_ROLE to your backend relayer before approving users.");
    return null;
  }
  if (relayer.toLowerCase() === deployerAddress.toLowerCase()) {
    console.warn(
      "WARNING: the relayer is the deployer, so the backend holds full admin rights. " +
        "Use a separate RELAYER_PRIVATE_KEY (it only needs REGISTRAR_ROLE and some gas)."
    );
    return relayer;
  }

  const contract = await ethers.getContractAt("KhetChain", contractAddress);
  await (await contract.grantRole(await contract.REGISTRAR_ROLE(), relayer)).wait();
  console.log("Granted REGISTRAR_ROLE to relayer:", relayer);
  return relayer;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
