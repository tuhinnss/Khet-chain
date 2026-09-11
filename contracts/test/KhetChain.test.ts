import { expect } from "chai";
import { ethers } from "hardhat";
import { KhetChain } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("KhetChain Smart Contract", () => {
  let contract: KhetChain;
  let admin: SignerWithAddress;
  let farmer: SignerWithAddress;
  let distributor: SignerWithAddress;
  let wholesaler: SignerWithAddress;
  let retailer: SignerWithAddress;
  let consumer: SignerWithAddress;

  const FARMER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("FARMER_ROLE"));
  const DISTRIBUTOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("DISTRIBUTOR_ROLE"));
  const WHOLESALER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("WHOLESALER_ROLE"));
  const DEALER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("DEALER_ROLE"));
  const RETAILER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("RETAILER_ROLE"));
  const QR_HASH = ethers.keccak256(ethers.toUtf8Bytes("KHC-2026-000001-QR-SEED"));

  beforeEach(async () => {
    [admin, farmer, distributor, wholesaler, retailer, consumer] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("KhetChain");
    contract = await Factory.deploy();
    await contract.waitForDeployment();

    // Grant roles
    await contract.grantUserRole(farmer.address, FARMER_ROLE);
    await contract.grantUserRole(distributor.address, DISTRIBUTOR_ROLE);
    await contract.grantUserRole(distributor.address, DEALER_ROLE);
    await contract.grantUserRole(wholesaler.address, WHOLESALER_ROLE);
    await contract.grantUserRole(retailer.address, RETAILER_ROLE);
  });

  it("1. Create batch: successfully registers produce on-chain with full metadata", async () => {
    const harvestTimestamp = Math.floor(Date.now() / 1000);
    const tx = await contract.connect(farmer)["registerBatch(string,uint256,string,uint256,string,string,string,uint256,bytes32)"](
      "Organic Tomato",
      500,
      "kg",
      harvestTimestamp,
      "Nalbari, Assam",
      "India Organic / NPOP Certified",
      "Fresh farm vine-ripened tomatoes",
      ethers.parseEther("0.05"),
      QR_HASH
    );
    await expect(tx).to.emit(contract, "BatchCreated");

    const batch = await contract.getBatch(1);
    expect(batch.batchId).to.equal(1n);
    expect(batch.cropName).to.equal("Organic Tomato");
    expect(batch.quantity).to.equal(500n);
    expect(batch.unit).to.equal("kg");
    expect(batch.farmerAddress).to.equal(farmer.address);
    expect(batch.currentOwner).to.equal(farmer.address);
    expect(batch.certification).to.equal("India Organic / NPOP Certified");
    expect(batch.batchStringId).to.include("KHC-2026-");
  });

  it("2. Retrieve batch: fetches accurate batch information and initial harvest event", async () => {
    await contract.connect(farmer)["registerBatch(string,uint256,uint256,string,bytes32)"](
      "Wheat",
      1000,
      1700000000,
      "Punjab, India",
      QR_HASH
    );

    const batch = await contract.getBatch(1);
    expect(batch.cropName).to.equal("Wheat");
    expect(batch.quantity).to.equal(1000n);

    const events = await contract.getSupplyChainEvents(1);
    expect(events.length).to.equal(1);
    expect(events[0].actorRole).to.equal("FARMER");
    expect(events[0].action).to.equal("HARVESTED");
  });

  it("3. Add supply chain event: logs checkpoints along the supply chain", async () => {
    await contract.connect(farmer)["registerBatch(string,uint256,uint256,string,bytes32)"](
      "Alphonso Mango",
      200,
      1700000000,
      "Ratnagiri, MH",
      QR_HASH
    );

    const event = {
      actor: distributor.address,
      actorRole: "DISTRIBUTOR",
      action: "TRANSPORTED",
      price: ethers.parseEther("0.1"),
      quantity: 200,
      location: "Pune Cold Chain Facility",
      quality: "GOOD",
      transportDetails: "Refrigerated Truck MH-12-AB-1234, Temp: 4°C",
      storageDetails: "Zone 3 Warehouse",
      timestamp: Math.floor(Date.now() / 1000),
      metadataURI: "ipfs://QmTransportHash123",
    };

    await expect(contract.connect(distributor).addSupplyChainEvent(1, event))
      .to.emit(contract, "SupplyChainEventAdded");

    const events = await contract.getSupplyChainEvents(1);
    expect(events.length).to.equal(2);
    expect(events[1].action).to.equal("TRANSPORTED");
    expect(events[1].location).to.equal("Pune Cold Chain Facility");
    expect(events[1].transportDetails).to.include("Refrigerated Truck");
  });

  it("4. Transfer ownership: enables custody transfer from Distributor to Wholesaler to Retailer", async () => {
    await contract.connect(farmer)["registerBatch(string,uint256,uint256,string,bytes32)"](
      "Basmati Rice",
      800,
      1700000000,
      "Haryana",
      QR_HASH
    );

    // Farmer creates listing & Distributor buys
    await contract.connect(farmer).createListing(1, ethers.parseEther("0.5"));
    await contract.connect(distributor).placeBid(1, { value: ethers.parseEther("0.5") });
    await contract.connect(farmer).acceptBid(1, 0);

    let batch = await contract.getBatch(1);
    expect(batch.currentOwner).to.equal(distributor.address);

    // Distributor transfers custody to Wholesaler with rich event
    await contract.connect(distributor)["transferOwnership(uint256,address,string,string,string,string,string,uint256)"](
      1,
      wholesaler.address,
      "WHOLESALER",
      "Azadpur Mandi, Delhi",
      "Dry Cargo Truck HR-01-XY-9876",
      "Grain Silo #4",
      "GOOD",
      ethers.parseEther("0.55")
    );

    batch = await contract.getBatch(1);
    expect(batch.currentOwner).to.equal(wholesaler.address);
    expect(batch.currentPrice).to.equal(ethers.parseEther("0.55"));

    // Wholesaler transfers to Retailer
    await contract.connect(wholesaler)["transferOwnership(uint256,address,string,string,string,string,string,uint256)"](
      1,
      retailer.address,
      "RETAILER",
      "Supermarket Hub, Mumbai",
      "Local Delivery Van",
      "Shelf Ready Refrigerated Display",
      "GOOD",
      ethers.parseEther("0.65")
    );

    batch = await contract.getBatch(1);
    expect(batch.currentOwner).to.equal(retailer.address);
  });

  it("5. Update price: updates produce price when added through supply chain checkpoint", async () => {
    await contract.connect(farmer)["registerBatch(string,uint256,uint256,string,bytes32)"](
      "Organic Apples",
      300,
      1700000000,
      "Shimla, HP",
      QR_HASH
    );

    const priceEvent = {
      actor: farmer.address,
      actorRole: "FARMER",
      action: "PRICE_UPDATE",
      price: ethers.parseEther("0.08"),
      quantity: 300,
      location: "Shimla",
      quality: "GOOD",
      transportDetails: "",
      storageDetails: "",
      timestamp: Math.floor(Date.now() / 1000),
      metadataURI: "",
    };

    await expect(contract.connect(farmer).addSupplyChainEvent(1, priceEvent))
      .to.emit(contract, "PriceUpdated")
      .withArgs(1, 0n, ethers.parseEther("0.08"));

    const batch = await contract.getBatch(1);
    expect(batch.currentPrice).to.equal(ethers.parseEther("0.08"));
  });

  it("6. Quality check: logs quality checkpoint and emits event", async () => {
    await contract.connect(farmer)["registerBatch(string,uint256,uint256,string,bytes32)"](
      "Grapes",
      150,
      1700000000,
      "Nashik, MH",
      QR_HASH
    );

    const qualityEvent = {
      actor: distributor.address,
      actorRole: "DISTRIBUTOR",
      action: "QUALITY_CHECKED",
      price: 0n,
      quantity: 150,
      location: "Inspection Facility Nashik",
      quality: "GOOD",
      transportDetails: "",
      storageDetails: "Grade A Approved",
      timestamp: Math.floor(Date.now() / 1000),
      metadataURI: "ipfs://QmLabReportGrapes",
    };

    await expect(contract.connect(distributor).addSupplyChainEvent(1, qualityEvent))
      .to.emit(contract, "QualityChecked")
      .withArgs(1, distributor.address, "GOOD");
  });

  it("7. Unauthorized transfer: prevents non-owners from transferring batch", async () => {
    await contract.connect(farmer)["registerBatch(string,uint256,uint256,string,bytes32)"](
      "Potatoes",
      500,
      1700000000,
      "UP, India",
      QR_HASH
    );

    // Wholesaler is not the owner yet (farmer is)
    await expect(
      contract.connect(wholesaler)["transferOwnership(uint256,address)"](1, retailer.address)
    ).to.be.revertedWith("Not owner");
  });

  it("8. Invalid batch: querying nonexistent batch reverts with 'Batch not found'", async () => {
    await expect(contract.getBatch(999)).to.be.revertedWith("Batch not found");
    await expect(contract.getSupplyChainEvents(999)).to.be.revertedWith("Batch not found");
  });

  it("9. Empty/invalid inputs: rejects empty crop name and zero quantity", async () => {
    await expect(
      contract.connect(farmer)["registerBatch(string,uint256,string,uint256,string,string,string,uint256,bytes32)"](
        "",
        500,
        "kg",
        1700000000,
        "Assam",
        "Organic",
        "",
        0,
        QR_HASH
      )
    ).to.be.revertedWith("Crop name required");

    await expect(
      contract.connect(farmer)["registerBatch(string,uint256,string,uint256,string,string,string,uint256,bytes32)"](
        "Rice",
        0,
        "kg",
        1700000000,
        "Assam",
        "Organic",
        "",
        0,
        QR_HASH
      )
    ).to.be.revertedWith("Quantity required");
  });

  it("10. Event emission: verifies QR hash and emits QRVerified event", async () => {
    await contract.connect(farmer)["registerBatch(string,uint256,uint256,string,bytes32)"](
      "Mustard Seeds",
      100,
      1700000000,
      "Rajasthan",
      QR_HASH
    );

    await expect(contract.connect(consumer).verifyBatch(1, QR_HASH))
      .to.emit(contract, "QRVerified");

    const [authentic] = await contract.verifyBatch.staticCall(1, QR_HASH);
    expect(authentic).to.equal(true);
  });
});
