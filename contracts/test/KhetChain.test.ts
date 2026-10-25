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
  let dealer2: SignerWithAddress;

  const FARMER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("FARMER_ROLE"));
  const DISTRIBUTOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("DISTRIBUTOR_ROLE"));
  const WHOLESALER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("WHOLESALER_ROLE"));
  const DEALER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("DEALER_ROLE"));
  const RETAILER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("RETAILER_ROLE"));
  const QR_HASH = ethers.keccak256(ethers.toUtf8Bytes("KHC-2026-000001-QR-SEED"));

  beforeEach(async () => {
    [admin, farmer, distributor, wholesaler, retailer, consumer, dealer2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("KhetChain");
    contract = await Factory.deploy();
    await contract.waitForDeployment();

    // Grant roles
    await contract.grantUserRole(farmer.address, FARMER_ROLE);
    await contract.grantUserRole(distributor.address, DISTRIBUTOR_ROLE);
    await contract.grantUserRole(distributor.address, DEALER_ROLE);
    await contract.grantUserRole(wholesaler.address, WHOLESALER_ROLE);
    await contract.grantUserRole(retailer.address, RETAILER_ROLE);
    await contract.grantUserRole(dealer2.address, DEALER_ROLE);
  });

  async function registerSimpleBatch(crop = "Wheat") {
    await contract.connect(farmer)["registerBatch(string,uint256,uint256,string,bytes32)"](
      crop,
      100,
      1700000000,
      "Punjab",
      QR_HASH
    );
  }

  // Lists batch `id` and sells it to the distributor, who becomes the custodian.
  async function sellToDistributor(id: number, price = "0.1") {
    await contract.connect(farmer).createListing(id, ethers.parseEther(price));
    await contract.connect(distributor).placeBid(id, { value: ethers.parseEther(price) });
    await contract.connect(farmer).acceptBid(id, 0);
  }

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
    await sellToDistributor(1);

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
    // HARVESTED, LISTED, PURCHASED, then ours
    expect(events.length).to.equal(4);
    expect(events[3].action).to.equal("TRANSPORTED");
    expect(events[3].location).to.equal("Pune Cold Chain Facility");
    expect(events[3].transportDetails).to.include("Refrigerated Truck");
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
    await sellToDistributor(1);

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

  describe("Registrar role", () => {
    const REGISTRAR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("REGISTRAR_ROLE"));
    const ADMIN_ROLE = ethers.keccak256(ethers.toUtf8Bytes("ADMIN_ROLE"));

    it("can grant and revoke actor roles", async () => {
      const registrar = consumer;
      await contract.grantRole(REGISTRAR_ROLE, registrar.address);

      await contract.connect(registrar).grantUserRole(dealer2.address, FARMER_ROLE);
      expect(await contract.hasRole(FARMER_ROLE, dealer2.address)).to.equal(true);

      await contract.connect(registrar).revokeUserRole(dealer2.address, FARMER_ROLE);
      expect(await contract.hasRole(FARMER_ROLE, dealer2.address)).to.equal(false);
    });

    it("cannot hand out admin or registrar power, or pause", async () => {
      const registrar = consumer;
      await contract.grantRole(REGISTRAR_ROLE, registrar.address);

      await expect(
        contract.connect(registrar).grantUserRole(registrar.address, ADMIN_ROLE)
      ).to.be.revertedWith("Invalid role");
      await expect(
        contract.connect(registrar).grantUserRole(dealer2.address, REGISTRAR_ROLE)
      ).to.be.revertedWith("Invalid role");
      await expect(
        contract.connect(registrar).grantRole(ADMIN_ROLE, registrar.address)
      ).to.be.revertedWithCustomError(contract, "AccessControlUnauthorizedAccount");
      await expect(contract.connect(registrar).pause()).to.be.revertedWithCustomError(
        contract,
        "AccessControlUnauthorizedAccount"
      );
    });

    it("rejects role changes from accounts without registrar or admin role", async () => {
      await expect(
        contract.connect(farmer).grantUserRole(consumer.address, FARMER_ROLE)
      ).to.be.revertedWith("Not role manager");
      await expect(
        contract.connect(farmer).revokeUserRole(distributor.address, DEALER_ROLE)
      ).to.be.revertedWith("Not role manager");
    });
  });

  describe("Provenance access control", () => {
    const checkpoint = (overrides: Record<string, unknown> = {}) => ({
      actor: ethers.ZeroAddress,
      actorRole: "DISTRIBUTOR",
      action: "QUALITY_CHECKED",
      price: 0n,
      quantity: 100,
      location: "Somewhere",
      quality: "GOOD",
      transportDetails: "",
      storageDetails: "",
      timestamp: 0,
      metadataURI: "",
      ...overrides,
    });

    it("rejects checkpoints from role holders who don't hold the batch", async () => {
      await registerSimpleBatch();
      await expect(
        contract.connect(distributor).addSupplyChainEvent(1, checkpoint())
      ).to.be.revertedWith("Unauthorized actor");
    });

    it("stops a bidder from repricing a listing through a checkpoint", async () => {
      await registerSimpleBatch();
      await contract.connect(farmer).createListing(1, ethers.parseEther("1"));

      await expect(
        contract.connect(distributor).addSupplyChainEvent(1, checkpoint({ price: 1n }))
      ).to.be.revertedWith("Unauthorized actor");
      expect((await contract.getBatch(1)).currentPrice).to.equal(ethers.parseEther("1"));
    });

    it("records the real sender and block time, not caller-supplied values", async () => {
      await registerSimpleBatch();
      await contract
        .connect(farmer)
        .addSupplyChainEvent(1, checkpoint({ actor: consumer.address, timestamp: 1 }));

      const events = await contract.getSupplyChainEvents(1);
      const recorded = events[events.length - 1];
      expect(recorded.actor).to.equal(farmer.address);
      expect(recorded.timestamp).to.be.greaterThan(1n);
    });
  });

  describe("Sale state machine", () => {
    it("blocks custody transfer while a batch is listed", async () => {
      await registerSimpleBatch();
      await contract.connect(farmer).createListing(1, ethers.parseEther("0.1"));

      await expect(
        contract.connect(farmer)["transferOwnership(uint256,address)"](1, wholesaler.address)
      ).to.be.revertedWith("Batch is listed for sale");
      await expect(
        contract.connect(farmer)["transferOwnership(uint256,address,string,string,string,string,string,uint256)"](
          1, wholesaler.address, "WHOLESALER", "", "", "", "GOOD", 0
        )
      ).to.be.revertedWith("Batch is listed for sale");
    });

    it("stops the original farmer from selling a batch they no longer hold", async () => {
      const farmer2 = consumer;
      await contract.grantUserRole(farmer2.address, FARMER_ROLE);
      await registerSimpleBatch();
      await contract.connect(farmer)["transferOwnership(uint256,address)"](1, farmer2.address);
      await contract.connect(farmer2).createListing(1, ethers.parseEther("0.1"));
      await contract.connect(distributor).placeBid(1, { value: ethers.parseEther("0.1") });

      await expect(contract.connect(farmer).acceptBid(1, 0)).to.be.revertedWith("Not owner");
      await expect(contract.connect(farmer2).acceptBid(1, 0)).to.changeEtherBalance(
        farmer2,
        ethers.parseEther("0.1")
      );
    });

    it("only allows forward logistics transitions after a sale", async () => {
      await registerSimpleBatch();
      await sellToDistributor(1);
      const asOwner = contract.connect(distributor);

      await expect(asOwner.updateStatus(1, 1)).to.be.revertedWith("Invalid status transition"); // Listed
      await expect(asOwner.updateStatus(1, 3)).to.be.revertedWith("Invalid status transition"); // Sold
      await asOwner.updateStatus(1, 4); // InTransit
      await asOwner.updateStatus(1, 5); // Delivered
      await asOwner.updateStatus(1, 4); // next hop
      await asOwner.updateStatus(1, 6); // RetailReady
      await expect(asOwner.updateStatus(1, 4)).to.be.revertedWith("Invalid status transition");
      await asOwner.updateStatus(1, 7); // Completed
      await expect(asOwner.updateStatus(1, 6)).to.be.revertedWith("Invalid status transition");
    });

    it("cannot skip the marketplace while bids are escrowed", async () => {
      await registerSimpleBatch();
      await contract.connect(farmer).createListing(1, ethers.parseEther("0.1"));
      await expect(contract.connect(farmer).updateStatus(1, 4)).to.be.revertedWith(
        "Invalid status transition"
      );
    });
  });

  describe("Bid escrow", () => {
    it("pays the seller and lets losing bidders reclaim their escrow", async () => {
      await registerSimpleBatch();
      await contract.connect(farmer).createListing(1, ethers.parseEther("0.1"));
      await contract.connect(distributor).placeBid(1, { value: ethers.parseEther("0.1") });
      await contract.connect(dealer2).placeBid(1, { value: ethers.parseEther("0.2") });

      await expect(contract.connect(farmer).acceptBid(1, 1)).to.changeEtherBalances(
        [farmer, contract],
        [ethers.parseEther("0.2"), -ethers.parseEther("0.2")]
      );

      await expect(contract.connect(distributor).withdrawBid(1))
        .to.emit(contract, "BidWithdrawn")
        .withArgs(1, distributor.address, ethers.parseEther("0.1"));
      expect(await ethers.provider.getBalance(await contract.getAddress())).to.equal(0n);

      await expect(contract.connect(distributor).withdrawBid(1)).to.be.revertedWith("Bid inactive");
      await expect(contract.connect(dealer2).withdrawBid(1)).to.be.revertedWith("Bid inactive");
      await expect(contract.connect(consumer).withdrawBid(1)).to.be.revertedWith("No bid");
    });

    it("refunds the superseded bid when a dealer raises it", async () => {
      await registerSimpleBatch();
      await contract.connect(farmer).createListing(1, ethers.parseEther("0.1"));
      await contract.connect(distributor).placeBid(1, { value: ethers.parseEther("0.1") });

      await expect(
        contract.connect(distributor).placeBid(1, { value: ethers.parseEther("0.15") })
      ).to.changeEtherBalance(distributor, -ethers.parseEther("0.05"));
    });

    it("lets a bidder cancel before the sale", async () => {
      await registerSimpleBatch();
      await contract.connect(farmer).createListing(1, ethers.parseEther("0.1"));
      await contract.connect(distributor).placeBid(1, { value: ethers.parseEther("0.1") });

      await expect(contract.connect(distributor).withdrawBid(1)).to.changeEtherBalance(
        distributor,
        ethers.parseEther("0.1")
      );
      await expect(contract.connect(farmer).acceptBid(1, 0)).to.be.revertedWith("Bid inactive");
    });

    it("a bidder that rejects ETH cannot block the sale", async () => {
      const rejecter = await (await ethers.getContractFactory("RejectingBidder")).deploy();
      await contract.grantUserRole(await rejecter.getAddress(), DEALER_ROLE);

      await registerSimpleBatch();
      await contract.connect(farmer).createListing(1, ethers.parseEther("0.1"));
      await rejecter.bid(await contract.getAddress(), 1, { value: ethers.parseEther("0.1") });
      await contract.connect(dealer2).placeBid(1, { value: ethers.parseEther("0.2") });

      await contract.connect(farmer).acceptBid(1, 1);
      expect((await contract.getBatch(1)).currentOwner).to.equal(dealer2.address);
    });

    it("allows reclaiming a bid while the contract is paused", async () => {
      await registerSimpleBatch();
      await contract.connect(farmer).createListing(1, ethers.parseEther("0.1"));
      await contract.connect(distributor).placeBid(1, { value: ethers.parseEther("0.1") });
      await contract.connect(admin).pause();

      await expect(contract.connect(distributor).withdrawBid(1)).to.changeEtherBalance(
        distributor,
        ethers.parseEther("0.1")
      );
    });
  });
});
