import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { parseEther } from "ethers";
import { getDashboardStats, getBatch } from "../api/batch.api";
import { getListings } from "../api/listing.api";
import { placeBid } from "../api/bid.api";
import { addSupplyChainEvent } from "../api/supplychain.api";
import { connectWallet, getContract, ensureSepoliaNetwork } from "../hooks/useWallet";
import { syncRole, getRoleStatus } from "../api/auth.api";
import { useAuth } from "../context/AuthContext";
import StatusBadge from "../components/common/StatusBadge";
import QRScanner from "../components/qr/QRScanner";
import TransactionBadge from "../components/common/TransactionBadge";
import { Listing, Batch } from "../types";
import { getErrorMessage } from "../utils/errors";

export default function DistributorDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Record<string, number>>({});
  const [listings, setListings] = useState<Listing[]>([]);
  const [bidAmounts, setBidAmounts] = useState<Record<number, string>>({});
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [searchBatchId, setSearchBatchId] = useState("");
  const [msg, setMsg] = useState("");
  const [latestTxHash, setLatestTxHash] = useState("");
  const [connectedWallet, setConnectedWallet] = useState("");
  const [loading, setLoading] = useState(false);

  // Supply Chain Event Form
  const [eventForm, setEventForm] = useState({
    action: "TRANSPORTED",
    location: "Guwahati Logistics Hub -> Kolkata Terminal",
    quality: "GOOD",
    transportDetails: "Refrigerated Reefer Truck AS-01-EF-4321, Temp: 6°C",
    storageDetails: "Cold Storage Zone B, Humidity: 85%",
    price: "22",
  });

  // Transfer Ownership Form
  const [transferForm, setTransferForm] = useState({
    newOwner: "",
    newRole: "WHOLESALER",
    location: "Navi Mumbai APMC Mandi",
    transportDetails: "Interstate Cold Express",
    storageDetails: "Mandi Silo / Warehouse #3",
    price: "25",
  });

  useEffect(() => {
    getDashboardStats().then(setStats).catch(() => {});
    loadListings();
    connectWallet().then(setConnectedWallet).catch(() => setConnectedWallet(""));
  }, []);

  async function loadListings() {
    const data = await getListings().catch(() => []);
    setListings(data);
  }

  async function handleSearchBatch(idToSearch?: number) {
    const id = idToSearch || Number(searchBatchId);
    if (!id) return;
    setLoading(true);
    setMsg("");
    try {
      const data = await getBatch(id);
      setSelectedBatch(data);
      setMsg(`Loaded Batch #${id} (${data.cropName})`);
    } catch (err) {
      setMsg(getErrorMessage(err, "Batch search failed"));
    } finally {
      setLoading(false);
    }
  }

  function handleQRScan(data: string) {
    try {
      const parsed = JSON.parse(data);
      handleSearchBatch(parsed.batchId);
    } catch {
      const match = data.match(/(\d+)/);
      if (match) handleSearchBatch(Number(match[1]));
    }
  }

  async function submitBid(batchId: number) {
    const amount = bidAmounts[batchId];
    if (!amount) return;
    setLoading(true);
    setMsg("");
    try {
      await ensureSepoliaNetwork();
      const contract = await getContract();
      const tx = await contract.placeBid(batchId, { value: parseEther(amount) });
      const receipt = await tx.wait();
      setLatestTxHash(receipt.hash);
      await placeBid({ batchId, amount, txHash: receipt.hash }).catch(() => {});
      setMsg(`Bid of ${amount} MATIC placed on-chain for batch #${batchId}!`);
      loadListings();
    } catch (err) {
      setMsg(getErrorMessage(err, "Bid failed"));
    } finally {
      setLoading(false);
    }
  }

  async function submitSupplyChainEvent(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedBatch) return;
    setLoading(true);
    setMsg("");
    setLatestTxHash("");

    try {
      await ensureSepoliaNetwork();
      const contract = await getContract();

      const onChainEvent = {
        actor: user?.walletAddress || connectedWallet,
        actorRole: "DISTRIBUTOR",
        action: eventForm.action,
        price: eventForm.price ? BigInt(eventForm.price) : 0n,
        quantity: selectedBatch.quantity,
        location: eventForm.location,
        quality: eventForm.quality,
        transportDetails: eventForm.transportDetails,
        storageDetails: eventForm.storageDetails,
        timestamp: Math.floor(Date.now() / 1000),
        metadataURI: "",
      };

      const tx = await contract.addSupplyChainEvent(selectedBatch.batchId, onChainEvent);
      setMsg("Recording supply chain event on Ethereum Sepolia...");
      const receipt = await tx.wait();
      setLatestTxHash(receipt.hash);

      await addSupplyChainEvent({
        batchId: selectedBatch.batchId,
        txHash: receipt.hash,
        actorRole: "DISTRIBUTOR",
        action: eventForm.action,
        price: eventForm.price,
        quantity: selectedBatch.quantity,
        location: eventForm.location,
        quality: eventForm.quality,
        transportDetails: eventForm.transportDetails,
        storageDetails: eventForm.storageDetails,
      }).catch(() => {});

      setMsg(`Supply chain event [${eventForm.action}] successfully recorded on Ethereum Sepolia!`);
      handleSearchBatch(selectedBatch.batchId);
    } catch (err) {
      setMsg(getErrorMessage(err, "Event recording failed"));
    } finally {
      setLoading(false);
    }
  }

  async function submitTransfer(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedBatch || !transferForm.newOwner) return;
    setLoading(true);
    setMsg("");

    try {
      await ensureSepoliaNetwork();
      const contract = await getContract();

      const tx = await contract["transferOwnership(uint256,address,string,string,string,string,string,uint256)"](
        selectedBatch.batchId,
        transferForm.newOwner,
        transferForm.newRole,
        transferForm.location,
        transferForm.transportDetails,
        transferForm.storageDetails,
        "GOOD",
        transferForm.price ? BigInt(transferForm.price) : 0n
      );

      setMsg("Transferring batch custody on Ethereum Sepolia...");
      const receipt = await tx.wait();
      setLatestTxHash(receipt.hash);

      await addSupplyChainEvent({
        batchId: selectedBatch.batchId,
        txHash: receipt.hash,
        actorRole: "DISTRIBUTOR",
        action: "TRANSFERRED",
        price: transferForm.price,
        location: transferForm.location,
        transportDetails: transferForm.transportDetails,
        storageDetails: transferForm.storageDetails,
        newOwner: transferForm.newOwner,
      }).catch(() => {});

      setMsg(`Batch #${selectedBatch.batchId} custody transferred on-chain to ${transferForm.newRole}!`);
      handleSearchBatch(selectedBatch.batchId);
    } catch (err) {
      setMsg(getErrorMessage(err, "Transfer failed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page distributor-page">
      <header className="page-header">
        <div>
          <span className="badge-role">DISTRIBUTOR / TRADER DASHBOARD</span>
          <h1>Logistics & Transit Operations</h1>
          <p className="subtitle">Bid on farm listings, log temperature cold chain checkpoints, and transfer custody</p>
        </div>

        <div className="stat-row">
          <div className="stat">
            <span>{stats.myBids ?? 0}</span>
            <label>My Active Bids</label>
          </div>
          <div className="stat">
            <span>{stats.wonBatches ?? 0}</span>
            <label>Custody Batches</label>
          </div>
        </div>
      </header>

      {msg && (
        <div className={`alert ${msg.includes("failed") ? "error" : "success"}`}>
          {msg}
          {latestTxHash && <TransactionBadge txHash={latestTxHash} label="Tx Hash" />}
        </div>
      )}

      {/* Search & QR Scan Section */}
      <section className="card">
        <h2>🔍 Find Batch to Audit or Update</h2>
        <div className="search-batch-row">
          <input
            type="number"
            placeholder="Enter Batch ID (e.g. 1)"
            value={searchBatchId}
            onChange={(e) => setSearchBatchId(e.target.value)}
            className="search-input"
          />
          <button type="button" onClick={() => handleSearchBatch()} className="btn-primary">
            Load Batch Details
          </button>
        </div>

        <div style={{ marginTop: "1rem" }}>
          <h4>Or Scan Batch QR Code:</h4>
          <QRScanner onScan={handleQRScan} />
        </div>
      </section>

      {/* Selected Batch Operations */}
      {selectedBatch && (
        <div className="batch-operations-grid">
          {/* Details Overview */}
          <section className="card">
            <div className="batch-card-header">
              <h3>{selectedBatch.cropName}</h3>
              <StatusBadge status={selectedBatch.status} />
            </div>
            <p><strong>Batch ID:</strong> #{selectedBatch.batchId}</p>
            <p><strong>Quantity:</strong> {selectedBatch.quantity} {selectedBatch.unit || "kg"}</p>
            <p><strong>Location:</strong> {selectedBatch.location}</p>
            <p><strong>Farmer:</strong> <code>{selectedBatch.farmerAddress}</code></p>
            <p><strong>Current Owner:</strong> <code>{selectedBatch.currentOwner}</code></p>
            <Link to={`/trace/${selectedBatch.batchId}`} className="btn-ghost-sm" style={{ marginTop: "0.5rem" }}>
              Open Public Trace Page ↗
            </Link>
          </section>

          {/* Record Supply Chain Event Form */}
          <section className="card">
            <h3>📝 Record Supply Chain Checkpoint</h3>
            <form onSubmit={submitSupplyChainEvent} className="form">
              <div className="form-row grid-2">
                <label>
                  Action Checkpoint
                  <select
                    value={eventForm.action}
                    onChange={(e) => setEventForm({ ...eventForm, action: e.target.value })}
                  >
                    <option value="PURCHASED">PURCHASED (Acquired from Farmer)</option>
                    <option value="TRANSPORTED">TRANSPORTED (In Logistics)</option>
                    <option value="STORED">STORED (Cold Chain Facility)</option>
                    <option value="QUALITY_CHECKED">QUALITY_CHECKED (Audit)</option>
                  </select>
                </label>
                <label>
                  Quality Status
                  <select
                    value={eventForm.quality}
                    onChange={(e) => setEventForm({ ...eventForm, quality: e.target.value })}
                  >
                    <option value="GOOD">GOOD (Grade A / Prime)</option>
                    <option value="MEDIUM">MEDIUM (Standard / Fair)</option>
                    <option value="BAD">BAD (Damaged / Spoiled)</option>
                  </select>
                </label>
              </div>

              <div className="form-row grid-2">
                <label>
                  Current Transit Location
                  <input
                    value={eventForm.location}
                    onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
                    required
                  />
                </label>
                <label>
                  Cumulative Price / Cost (₹)
                  <input
                    type="number"
                    value={eventForm.price}
                    onChange={(e) => setEventForm({ ...eventForm, price: e.target.value })}
                  />
                </label>
              </div>

              <label>
                Transport Details (Truck, Vehicle #, Temp)
                <input
                  value={eventForm.transportDetails}
                  onChange={(e) => setEventForm({ ...eventForm, transportDetails: e.target.value })}
                />
              </label>

              <label>
                Storage Facility & Humidity Details
                <input
                  value={eventForm.storageDetails}
                  onChange={(e) => setEventForm({ ...eventForm, storageDetails: e.target.value })}
                />
              </label>

              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? "Logging Event on Sepolia..." : "⛓️ Record Checkpoint On-Chain"}
              </button>
            </form>
          </section>

          {/* Custody Transfer Form */}
          <section className="card">
            <h3>🤝 Transfer Custody to Wholesaler / Mandi</h3>
            <form onSubmit={submitTransfer} className="form">
              <label>
                Recipient Wallet Address *
                <input
                  value={transferForm.newOwner}
                  onChange={(e) => setTransferForm({ ...transferForm, newOwner: e.target.value })}
                  placeholder="0x..."
                  required
                />
              </label>

              <div className="form-row grid-2">
                <label>
                  Recipient Role
                  <select
                    value={transferForm.newRole}
                    onChange={(e) => setTransferForm({ ...transferForm, newRole: e.target.value })}
                  >
                    <option value="WHOLESALER">WHOLESALER</option>
                    <option value="RETAILER">RETAILER</option>
                  </select>
                </label>
                <label>
                  Wholesale Sale Price (₹ per unit)
                  <input
                    type="number"
                    value={transferForm.price}
                    onChange={(e) => setTransferForm({ ...transferForm, price: e.target.value })}
                  />
                </label>
              </div>

              <label>
                Transfer Destination Mandi / Hub
                <input
                  value={transferForm.location}
                  onChange={(e) => setTransferForm({ ...transferForm, location: e.target.value })}
                />
              </label>

              <button type="submit" className="btn-secondary" disabled={loading}>
                {loading ? "Executing Transfer..." : "Transfer Custody on Blockchain"}
              </button>
            </form>
          </section>
        </div>
      )}

      {/* Active Marketplace Listings */}
      <section className="card">
        <div className="section-header-inline">
          <h2>Marketplace Produce Batches Available for Bid</h2>
          <Link to="/marketplace">View all →</Link>
        </div>

        {listings.length === 0 ? (
          <p className="muted">No produce currently listed on marketplace. Farmers will list batches after registration.</p>
        ) : (
          <div className="batch-grid">
            {listings.map((l) => (
              <div key={l._id} className="batch-card">
                <div className="batch-card-header">
                  <h3>{l.cropName}</h3>
                  <StatusBadge status="Listed" />
                </div>
                <p><strong>Batch:</strong> #{l.batchId}</p>
                <p><strong>Quantity:</strong> {l.quantity} kg</p>
                <p className="price">Asking: {(Number(l.askingPrice) / 1e18 || Number(l.askingPrice)).toFixed(4)} MATIC</p>
                <div className="inline-form">
                  <input
                    placeholder="Bid (MATIC)"
                    value={bidAmounts[l.batchId] ?? ""}
                    onChange={(e) => setBidAmounts({ ...bidAmounts, [l.batchId]: e.target.value })}
                  />
                  <button type="button" onClick={() => submitBid(l.batchId)} className="btn-primary-sm">
                    Place Escrow Bid
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
