// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title KhetChain
 * @notice Decentralized agricultural supply chain with RBAC, bidding escrow, and provenance tracking.
 */
contract KhetChain is AccessControl, ReentrancyGuard, Pausable {
    bytes32 public constant FARMER_ROLE = keccak256("FARMER_ROLE");
    bytes32 public constant DEALER_ROLE = keccak256("DEALER_ROLE");
    bytes32 public constant RETAILER_ROLE = keccak256("RETAILER_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    enum BatchStatus {
        Created,
        Listed,
        BidReceived,
        Sold,
        InTransit,
        Delivered,
        RetailReady
    }

    struct ProduceBatch {
        uint256 batchId;
        string cropName;
        uint256 quantity;
        uint256 harvestDate;
        string location;
        address farmerAddress;
        address currentOwner;
        uint256 currentPrice;
        BatchStatus status;
        bytes32 qrHash;
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
    mapping(uint256 => Bid[]) private batchBids;
    mapping(uint256 => uint256) public acceptedBidIndex;
    mapping(uint256 => ProvenanceRecord[]) private batchHistory;
    mapping(uint256 => mapping(address => uint256)) public dealerBidIndex;

    event BatchRegistered(
        uint256 indexed batchId,
        address indexed farmer,
        string cropName,
        bytes32 qrHash
    );
    event ListingCreated(uint256 indexed batchId, uint256 price);
    event BidPlaced(uint256 indexed batchId, address indexed dealer, uint256 amount);
    event BidAccepted(uint256 indexed batchId, address indexed dealer, uint256 amount);
    event OwnershipTransferred(
        uint256 indexed batchId,
        address indexed from,
        address indexed to
    );
    event StatusUpdated(
        uint256 indexed batchId,
        BatchStatus oldStatus,
        BatchStatus newStatus
    );
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
            role == FARMER_ROLE || role == DEALER_ROLE || role == RETAILER_ROLE,
            "Invalid role"
        );
        _grantRole(role, account);
    }

    function registerBatch(
        string calldata cropName,
        uint256 quantity,
        uint256 harvestDate,
        string calldata location,
        bytes32 qrHash
    ) external onlyRole(FARMER_ROLE) whenNotPaused returns (uint256) {
        require(quantity > 0, "Quantity required");
        require(qrHash != bytes32(0), "QR hash required");

        batchCounter++;
        uint256 batchId = batchCounter;

        batches[batchId] = ProduceBatch({
            batchId: batchId,
            cropName: cropName,
            quantity: quantity,
            harvestDate: harvestDate,
            location: location,
            farmerAddress: msg.sender,
            currentOwner: msg.sender,
            currentPrice: 0,
            status: BatchStatus.Created,
            qrHash: qrHash
        });

        _recordProvenance(batchId, address(0), msg.sender, BatchStatus.Created, "registered");

        emit BatchRegistered(batchId, msg.sender, cropName, qrHash);
        return batchId;
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

        _recordProvenance(batchId, msg.sender, msg.sender, BatchStatus.Listed, "listed");

        emit ListingCreated(batchId, price);
        emit StatusUpdated(batchId, BatchStatus.Created, BatchStatus.Listed);
    }

    function placeBid(uint256 batchId) external payable onlyRole(DEALER_ROLE) whenNotPaused {
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

        _recordProvenance(batchId, previousOwner, dealer, BatchStatus.Sold, "sold");
        emit BidAccepted(batchId, dealer, amount);
        emit OwnershipTransferred(batchId, previousOwner, dealer);
        emit StatusUpdated(batchId, oldStatus, BatchStatus.Sold);
    }

    function transferOwnership(uint256 batchId, address newOwner)
        external
        whenNotPaused
    {
        ProduceBatch storage batch = _getBatch(batchId);
        require(batch.currentOwner == msg.sender, "Not owner");
        require(newOwner != address(0), "Invalid address");
        require(newOwner != msg.sender, "Same owner");

        if (hasRole(DEALER_ROLE, msg.sender)) {
            require(hasRole(RETAILER_ROLE, newOwner), "Dealer can only transfer to retailer");
        } else if (hasRole(RETAILER_ROLE, msg.sender)) {
            require(hasRole(RETAILER_ROLE, newOwner), "Retailer transfer restricted");
        } else {
            revert("Unauthorized transfer");
        }

        address previousOwner = batch.currentOwner;
        batch.currentOwner = newOwner;

        _recordProvenance(batchId, previousOwner, newOwner, batch.status, "transferred");
        emit OwnershipTransferred(batchId, previousOwner, newOwner);
    }

    function updateStatus(uint256 batchId, BatchStatus newStatus) external whenNotPaused {
        ProduceBatch storage batch = _getBatch(batchId);
        require(batch.currentOwner == msg.sender, "Not owner");
        _validateStatusTransition(batch.status, newStatus, msg.sender);

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

    function getBatchHistory(uint256 batchId) external view returns (ProvenanceRecord[] memory) {
        return batchHistory[batchId];
    }

    function getBids(uint256 batchId) external view returns (Bid[] memory) {
        return batchBids[batchId];
    }

    function generateQRMetadata(uint256 batchId)
        external
        view
        returns (uint256 id, bytes32 qrHash, string memory cropName, BatchStatus status)
    {
        ProduceBatch memory batch = _getBatch(batchId);
        return (batch.batchId, batch.qrHash, batch.cropName, batch.status);
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

    function _validateStatusTransition(
        BatchStatus current,
        BatchStatus next,
        address actor
    ) internal view {
        if (hasRole(DEALER_ROLE, actor)) {
            require(
                (current == BatchStatus.Sold && next == BatchStatus.InTransit) ||
                    (current == BatchStatus.InTransit && next == BatchStatus.Delivered),
                "Invalid dealer transition"
            );
            return;
        }
        if (hasRole(RETAILER_ROLE, actor)) {
            require(
                current == BatchStatus.Delivered && next == BatchStatus.RetailReady,
                "Invalid retailer transition"
            );
            return;
        }
        revert("Unauthorized status update");
    }
}
