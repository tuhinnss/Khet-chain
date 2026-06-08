import { expect } from "chai";
import { ethers } from "hardhat";
import { KhetChain } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("KhetChain", () => {
  let contract: KhetChain;
  let admin: SignerWithAddress;
  let farmer: SignerWithAddress;
  let dealer: SignerWithAddress;
  let retailer: SignerWithAddress;

  const FARMER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("FARMER_ROLE"));
  const DEALER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("DEALER_ROLE"));
  const RETAILER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("RETAILER_ROLE"));
  const QR_HASH = ethers.keccak256(ethers.toUtf8Bytes("batch-1-qr"));

  beforeEach(async () => {
    [admin, farmer, dealer, retailer] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("KhetChain");
    contract = await Factory.deploy();
    await contract.waitForDeployment();

    await contract.grantUserRole(farmer.address, FARMER_ROLE);
    await contract.grantUserRole(dealer.address, DEALER_ROLE);
    await contract.grantUserRole(retailer.address, RETAILER_ROLE);
  });

  it("registers a batch and creates listing", async () => {
    await expect(
      contract.connect(farmer).registerBatch("Wheat", 100, 1700000000, "Punjab", QR_HASH)
    ).to.emit(contract, "BatchRegistered");

    await contract.connect(farmer).createListing(1, ethers.parseEther("1"));
    const batch = await contract.getBatch(1);
    expect(batch.status).to.equal(1); // Listed
  });

  it("accepts bid with escrow", async () => {
    await contract.connect(farmer).registerBatch("Rice", 50, 1700000000, "Kerala", QR_HASH);
    await contract.connect(farmer).createListing(1, ethers.parseEther("0.5"));

    await contract.connect(dealer).placeBid(1, { value: ethers.parseEther("0.6") });
    await contract.connect(farmer).acceptBid(1, 0);

    const batch = await contract.getBatch(1);
    expect(batch.currentOwner).to.equal(dealer.address);
    expect(batch.status).to.equal(3); // Sold
  });

  it("tracks provenance history", async () => {
    await contract.connect(farmer).registerBatch("Corn", 80, 1700000000, "MP", QR_HASH);
    const history = await contract.getBatchHistory(1);
    expect(history.length).to.be.greaterThan(0);
  });

  it("verifies QR hash", async () => {
    await contract.connect(farmer).registerBatch("Soy", 30, 1700000000, "MH", QR_HASH);
    const [authentic] = await contract.verifyBatch.staticCall(1, QR_HASH);
    expect(authentic).to.equal(true);
  });
});
