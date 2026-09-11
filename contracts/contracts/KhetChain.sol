// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title KhetChain
 * @notice Real Web3 Agricultural Traceability & Provenance Platform on Ethereum Sepolia.
 * Records end-to-end supply chain checkpoints from Farmer -> Distributor -> Wholesaler -> Retailer -> Consumer.
 */
contract KhetChain is AccessControl, ReentrancyGuard, Pausable {

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant FARMER_ROLE = keccak256("FARMER_ROLE");
    bytes32 public constant DISTRIBUTOR_ROLE = keccak256("DISTRIBUTOR_ROLE");
    bytes32 public constant WHOLESALER_ROLE = keccak256("WHOLESALER_ROLE");
    bytes32 public constant DEALER_ROLE = keccak256("DEALER_ROLE"); // Alias / partner role for Distributor
    bytes32 public constant RETAILER_ROLE = keccak256("RETAILER_ROLE");

    enum BatchStatus {
        Created,
        Listed,
        BidReceived,
        Sold,
        InTransit,
        Delivered,
        RetailReady,
        Completed
    }

    struct SupplyChainEvent {
        address actor;
        string actorRole;
        string action;
        uint256 price;
        uint256 quantity;
        string location;
        string quality;
        string transportDetails;
        string storageDetails;
        uint256 timestamp;
        string metadataURI;
    }

    struct ProduceBatch {
        uint256 batchId;
        string batchStringId;
        string cropName;
        uint256 quantity;
        string unit;
        uint256 harvestDate;
        string location;
        string certification;
        string description;
        address farmerAddress;
        address currentOwner;
        uint256 currentPrice;
        BatchStatus status;
        bytes32 qrHash;
        uint256 createdAt;
        bool active;
    }

    struct Bid {
        address dealer;
        uint256 amount;
        uint256 timestamp;
        bool active;
    }

    struct ProvenanceRecord {
        address from;
        address to;
        BatchStatus status;
        uint256 timestamp;
        string action;
    }

    uint256 public batchCounter;

    mapping(uint256 => ProduceBatch) public batches;
    mapping(uint256 => SupplyChainEvent[]) private batchEvents;
    mapping(uint256 => ProvenanceRecord[]) private batchHistory;
    mapping(uint256 => Bid[]) private batchBids;
    mapping(uint256 => uint256) public acceptedBidIndex;
    mapping(uint256 => mapping(address => uint256)) public dealerBidIndex;

    event BatchCreated(
        uint256 indexed batchId,
        string batchStringId,
        address indexed farmer,
        string cropName,
        uint256 quantity,
        string unit,
        bytes32 qrHash
    );

    event BatchRegistered(
        uint256 indexed batchId,
        address indexed farmer,
        string cropName,
        bytes32 qrHash
    );

    event SupplyChainEventAdded(
        uint256 indexed batchId,
        address indexed actor,
        string actorRole,
        string action,
        uint256 price,
        string quality,
        string location,
        uint256 timestamp
    );

    event ListingCreated(uint256 indexed batchId, uint256 price);
    event BidPlaced(uint256 indexed batchId, address indexed dealer, uint256 amount);
    event BidAccepted(uint256 indexed batchId, address indexed dealer, uint256 amount);
    event OwnershipTransferred(
        uint256 indexed batchId,
        address indexed from,
        address indexed to
    );
    event BatchTransferred(
        uint256 indexed batchId,
        address indexed from,
        address indexed to,
        string newRole,
        uint256 price
    );
    event StatusUpdated(
        uint256 indexed batchId,
        BatchStatus oldStatus,
        BatchStatus newStatus
    );
    event PriceUpdated(uint256 indexed batchId, uint256 oldPrice, uint256 newPrice);
    event QualityChecked(uint256 indexed batchId, address indexed inspector, string quality);
    event QRVerified(uint256 indexed batchId, address indexed verifier, uint256 timestamp);

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }

    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }

    function grantUserRole(address account, bytes32 role) external onlyRole(ADMIN_ROLE) {
        require(
            role == FARMER_ROLE ||
            role == DISTRIBUTOR_ROLE ||
            role == WHOLESALER_ROLE ||
            role == DEALER_ROLE ||
            role == RETAILER_ROLE,
            "Invalid role"
        );
        _grantRole(role, account);
    }

    function _uint2str(uint256 _i) internal pure returns (string memory _uintAsString) {
        if (_i == 0) {
            return "0";
        }
        uint256 j = _i;
        uint256 len;
        while (j != 0) {
            len++;
            j /= 10;
        }
        bytes memory bstr = new bytes(len);
        uint256 k = len;
        while (_i != 0) {
            k = k - 1;
            uint8 temp = (48 + uint8(_i - (_i / 10) * 10));
            bytes1 b1 = bytes1(temp);
            bstr[k] = b1;
            _i /= 10;
        }
        return string(bstr);
    }

    function _formatBatchStringId(uint256 id) internal pure returns (string memory) {
        bytes memory idBytes = bytes(_uint2str(id));
        bytes memory padded = new bytes(6);
        uint256 padLen = idBytes.length >= 6 ? 0 : 6 - idBytes.length;
        for (uint256 i = 0; i < padLen; i++) {
            padded[i] = "0";
        }
        for (uint256 i = 0; i < idBytes.length && (padLen + i) < 6; i++) {
            padded[padLen + i] = idBytes[i];
        }
        return string(abi.encodePacked("KHC-2026-", padded));
    }

    function _registerBatch(
        string memory cropName,
        uint256 quantity,
        string memory unit,
        uint256 harvestDate,
        string memory location,
        string memory certification,
        string memory description,
        uint256 initialPrice,
        bytes32 qrHash
    ) internal returns (uint256) {
        require(bytes(cropName).length > 0, "Crop name required");
        require(quantity > 0, "Quantity required");
        require(qrHash != bytes32(0), "QR hash required");

        batchCounter++;
        uint256 batchId = batchCounter;
        string memory batchStr = _formatBatchStringId(batchId);

        batches[batchId] = ProduceBatch({
            batchId: batchId,
            batchStringId: batchStr,
            cropName: cropName,
            quantity: quantity,
            unit: bytes(unit).length > 0 ? unit : "kg",
            harvestDate: harvestDate > 0 ? harvestDate : block.timestamp,
            location: location,
            certification: certification,
            description: description,
            farmerAddress: msg.sender,
            currentOwner: msg.sender,
            currentPrice: initialPrice,
            status: BatchStatus.Created,
            qrHash: qrHash,
            createdAt: block.timestamp,
            active: true
        });

        // Record initial harvest supply chain event
        SupplyChainEvent memory initialEvent = SupplyChainEvent({
            actor: msg.sender,
            actorRole: "FARMER",
            action: "HARVESTED",
            price: initialPrice,
            quantity: quantity,
            location: location,
            quality: "GOOD",
            transportDetails: "On-farm storage",
            storageDetails: "Barn / Farm facility",
            timestamp: block.timestamp,
            metadataURI: ""
        });
        batchEvents[batchId].push(initialEvent);

        _recordProvenance(batchId, address(0), msg.sender, BatchStatus.Created, "Harvest registered on-chain");

        emit BatchCreated(batchId, batchStr, msg.sender, cropName, quantity, batches[batchId].unit, qrHash);
        emit BatchRegistered(batchId, msg.sender, cropName, qrHash);
        emit SupplyChainEventAdded(batchId, msg.sender, "FARMER", "HARVESTED", initialPrice, "GOOD", location, block.timestamp);

        return batchId;
    }

    /**
     * @notice Register a new produce batch on-chain with detailed farm parameters.
     */
    function registerBatch(
        string calldata cropName,
        uint256 quantity,
        string calldata unit,
        uint256 harvestDate,
        string calldata location,
        string calldata certification,
        string calldata description,
        uint256 initialPrice,
        bytes32 qrHash
    ) external onlyRole(FARMER_ROLE) whenNotPaused returns (uint256) {
        return _registerBatch(
            cropName,
            quantity,
            unit,
            harvestDate,
            location,
            certification,
            description,
            initialPrice,
            qrHash
        );
    }

    /**
     * @notice Backward compatible registerBatch overload
     */
    function registerBatch(
        string calldata cropName,
        uint256 quantity,
        uint256 harvestDate,
        string calldata location,
        bytes32 qrHash
    ) external onlyRole(FARMER_ROLE) whenNotPaused returns (uint256) {
        return _registerBatch(
            cropName,
            quantity,
            "kg",
            harvestDate,
            location,
            "Standard",
            "",
            0,
            qrHash
        );
    }

    /**
     * @notice Adds an immutable supply chain event (Quality Check, Storage Update, Transport, etc.)
     */
    function addSupplyChainEvent(
        uint256 batchId,
        SupplyChainEvent calldata evt
    ) external whenNotPaused {
        ProduceBatch storage batch = _getBatch(batchId);
        require(batch.active, "Batch inactive");
        require(
            batch.currentOwner == msg.sender ||
            hasRole(ADMIN_ROLE, msg.sender) ||
            hasRole(DISTRIBUTOR_ROLE, msg.sender) ||
            hasRole(WHOLESALER_ROLE, msg.sender) ||
            hasRole(DEALER_ROLE, msg.sender) ||
            hasRole(RETAILER_ROLE, msg.sender),
            "Unauthorized actor"
        );

        batchEvents[batchId].push(evt);

        if (evt.price > 0 && evt.price != batch.currentPrice) {
            uint256 oldPrice = batch.currentPrice;
            batch.currentPrice = evt.price;
            emit PriceUpdated(batchId, oldPrice, evt.price);
        }

        if (bytes(evt.quality).length > 0) {
            emit QualityChecked(batchId, msg.sender, evt.quality);
        }

        _recordProvenance(batchId, msg.sender, msg.sender, batch.status, evt.action);

        emit SupplyChainEventAdded(
            batchId,
            evt.actor != address(0) ? evt.actor : msg.sender,
            evt.actorRole,
            evt.action,
            evt.price,
            evt.quality,
            evt.location,
            block.timestamp
        );
    }

    /**
     * @notice Transfer produce ownership along the supply chain.
     */
    function transferOwnership(
        uint256 batchId,
        address newOwner,
        string calldata newRole,
        string calldata location,
        string calldata transportDetails,
        string calldata storageDetails,
        string calldata quality,
        uint256 transferPrice
    ) external whenNotPaused {
        ProduceBatch storage batch = _getBatch(batchId);
        require(batch.currentOwner == msg.sender, "Not current batch owner");
        require(newOwner != address(0), "Invalid new owner");
        require(newOwner != msg.sender, "Cannot transfer to self");

        address previousOwner = batch.currentOwner;
        batch.currentOwner = newOwner;
        if (transferPrice > 0) {
            batch.currentPrice = transferPrice;
        }

        SupplyChainEvent memory transferEvent = SupplyChainEvent({
            actor: msg.sender,
            actorRole: newRole,
            action: "TRANSFERRED",
            price: transferPrice > 0 ? transferPrice : batch.currentPrice,
            quantity: batch.quantity,
            location: location,
            quality: bytes(quality).length > 0 ? quality : "GOOD",
            transportDetails: transportDetails,
            storageDetails: storageDetails,
            timestamp: block.timestamp,
            metadataURI: ""
        });
        batchEvents[batchId].push(transferEvent);

        _recordProvenance(batchId, previousOwner, newOwner, batch.status, "Transferred produce custody");

        emit OwnershipTransferred(batchId, previousOwner, newOwner);
        emit BatchTransferred(batchId, previousOwner, newOwner, newRole, transferPrice);
        emit SupplyChainEventAdded(
            batchId,
            msg.sender,
            newRole,
            "TRANSFERRED",
            transferPrice > 0 ? transferPrice : batch.currentPrice,
            quality,
            location,
            block.timestamp
        );
    }

    /**
     * @notice Simplified transfer ownership matching original signature
     */
    function transferOwnership(uint256 batchId, address newOwner) external whenNotPaused {
        ProduceBatch storage batch = _getBatch(batchId);
        require(batch.currentOwner == msg.sender, "Not owner");
        require(newOwner != address(0), "Invalid address");
        require(newOwner != msg.sender, "Same owner");

        address previousOwner = batch.currentOwner;
        batch.currentOwner = newOwner;

        SupplyChainEvent memory transferEvent = SupplyChainEvent({
            actor: msg.sender,
            actorRole: "ACTOR",
            action: "TRANSFERRED",
            price: batch.currentPrice,
            quantity: batch.quantity,
            location: batch.location,
            quality: "GOOD",
            transportDetails: "Standard custody transfer",
            storageDetails: "In transit/warehouse",
            timestamp: block.timestamp,
            metadataURI: ""
        });
        batchEvents[batchId].push(transferEvent);

        _recordProvenance(batchId, previousOwner, newOwner, batch.status, "transferred");
        emit OwnershipTransferred(batchId, previousOwner, newOwner);
    }

    function createListing(uint256 batchId, uint256 price)
        external
        onlyRole(FARMER_ROLE)
        whenNotPaused
    {
        ProduceBatch storage batch = _getBatch(batchId);
        require(batch.currentOwner == msg.sender, "Not owner");
        require(
            batch.status == BatchStatus.Created || batch.status == BatchStatus.BidReceived,
            "Invalid status"
        );

        batch.currentPrice = price;
        batch.status = BatchStatus.Listed;

        SupplyChainEvent memory listingEvent = SupplyChainEvent({
            actor: msg.sender,
            actorRole: "FARMER",
            action: "LISTED",
            price: price,
            quantity: batch.quantity,
            location: batch.location,
            quality: "GOOD",
            transportDetails: "Awaiting pickup",
            storageDetails: "Farm cold store",
            timestamp: block.timestamp,
            metadataURI: ""
        });
        batchEvents[batchId].push(listingEvent);

        _recordProvenance(batchId, msg.sender, msg.sender, BatchStatus.Listed, "listed");

        emit ListingCreated(batchId, price);
        emit StatusUpdated(batchId, BatchStatus.Created, BatchStatus.Listed);
    }

    function placeBid(uint256 batchId) external payable whenNotPaused {
        require(
            hasRole(DEALER_ROLE, msg.sender) || hasRole(DISTRIBUTOR_ROLE, msg.sender),
            "Must be Dealer/Distributor"
        );
        ProduceBatch storage batch = _getBatch(batchId);
        require(batch.status == BatchStatus.Listed || batch.status == BatchStatus.BidReceived, "Not listed");
        require(msg.value > 0, "Bid amount required");
        require(msg.value >= batch.currentPrice || batch.currentPrice == 0, "Bid below asking price");

        uint256 existingIdx = dealerBidIndex[batchId][msg.sender];
        if (existingIdx > 0 && batchBids[batchId][existingIdx - 1].active) {
            Bid storage existing = batchBids[batchId][existingIdx - 1];
            require(msg.value > existing.amount, "Must exceed previous bid");
            payable(msg.sender).transfer(existing.amount);
            existing.active = false;
        }

        batchBids[batchId].push(
            Bid({dealer: msg.sender, amount: msg.value, timestamp: block.timestamp, active: true})
        );
        dealerBidIndex[batchId][msg.sender] = batchBids[batchId].length;

        BatchStatus oldStatus = batch.status;
        if (batch.status == BatchStatus.Listed) {
            batch.status = BatchStatus.BidReceived;
            emit StatusUpdated(batchId, oldStatus, BatchStatus.BidReceived);
        }

        emit BidPlaced(batchId, msg.sender, msg.value);
    }

    function acceptBid(uint256 batchId, uint256 bidIndex)
        external
        onlyRole(FARMER_ROLE)
        nonReentrant
        whenNotPaused
    {
        ProduceBatch storage batch = _getBatch(batchId);
        require(batch.farmerAddress == msg.sender, "Not farmer");
        require(
            batch.status == BatchStatus.BidReceived || batch.status == BatchStatus.Listed,
            "No bids to accept"
        );

        Bid[] storage bids = batchBids[batchId];
        require(bidIndex < bids.length, "Invalid bid index");
        Bid storage winningBid = bids[bidIndex];
        require(winningBid.active, "Bid inactive");

        address dealer = winningBid.dealer;
        uint256 amount = winningBid.amount;
        winningBid.active = false;
        acceptedBidIndex[batchId] = bidIndex;

        for (uint256 i = 0; i < bids.length; i++) {
            if (i != bidIndex && bids[i].active) {
                payable(bids[i].dealer).transfer(bids[i].amount);
                bids[i].active = false;
            }
        }

        address previousOwner = batch.currentOwner;
        batch.currentOwner = dealer;
        batch.currentPrice = amount;
        BatchStatus oldStatus = batch.status;
        batch.status = BatchStatus.Sold;

        payable(msg.sender).transfer(amount);

        SupplyChainEvent memory soldEvent = SupplyChainEvent({
            actor: dealer,
            actorRole: "DISTRIBUTOR",
            action: "PURCHASED",
            price: amount,
            quantity: batch.quantity,
            location: batch.location,
            quality: "GOOD",
            transportDetails: "Pickup scheduled",
            storageDetails: "Ready for logistics",
            timestamp: block.timestamp,
            metadataURI: ""
        });
        batchEvents[batchId].push(soldEvent);

        _recordProvenance(batchId, previousOwner, dealer, BatchStatus.Sold, "sold");
        emit BidAccepted(batchId, dealer, amount);
        emit OwnershipTransferred(batchId, previousOwner, dealer);
        emit StatusUpdated(batchId, oldStatus, BatchStatus.Sold);
    }

    function updateStatus(uint256 batchId, BatchStatus newStatus) external whenNotPaused {
        ProduceBatch storage batch = _getBatch(batchId);
        require(batch.currentOwner == msg.sender || hasRole(ADMIN_ROLE, msg.sender), "Not owner/admin");

        BatchStatus oldStatus = batch.status;
        batch.status = newStatus;

        _recordProvenance(batchId, msg.sender, msg.sender, newStatus, "status_updated");
        emit StatusUpdated(batchId, oldStatus, newStatus);
    }

    function verifyBatch(uint256 batchId, bytes32 scannedHash)
        external
        returns (bool authentic, ProduceBatch memory batch)
    {
        batch = _getBatch(batchId);
        authentic = batch.qrHash == scannedHash && batch.qrHash != bytes32(0);
        emit QRVerified(batchId, msg.sender, block.timestamp);
    }

    function getBatch(uint256 batchId) external view returns (ProduceBatch memory) {
        return _getBatch(batchId);
    }

    function getSupplyChainEvents(uint256 batchId) external view returns (SupplyChainEvent[] memory) {
        _getBatch(batchId); // Reverts if batch does not exist
        return batchEvents[batchId];
    }

    function getBatchHistory(uint256 batchId) external view returns (ProvenanceRecord[] memory) {
        return batchHistory[batchId];
    }

    function getBids(uint256 batchId) external view returns (Bid[] memory) {
        return batchBids[batchId];
    }

    function generateQRMetadata(uint256 batchId)
        external
        view
        returns (uint256 id, string memory stringId, bytes32 qrHash, string memory cropName, BatchStatus status)
    {
        ProduceBatch memory batch = _getBatch(batchId);
        return (batch.batchId, batch.batchStringId, batch.qrHash, batch.cropName, batch.status);
    }

    function _getBatch(uint256 batchId) internal view returns (ProduceBatch storage batch) {
        batch = batches[batchId];
        require(batch.batchId != 0, "Batch not found");
    }

    function _recordProvenance(
        uint256 batchId,
        address from,
        address to,
        BatchStatus status,
        string memory action
    ) internal {
        batchHistory[batchId].push(
            ProvenanceRecord({
                from: from,
                to: to,
                status: status,
                timestamp: block.timestamp,
                action: action
            })
        );
    }
}
