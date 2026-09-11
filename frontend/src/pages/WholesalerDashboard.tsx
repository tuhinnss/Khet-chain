import { useState } from "react";
import { Link } from "react-router-dom";
import { getBatch, getHistory } from "../api/batch.api";
import { addSupplyChainEvent } from "../api/supplychain.api";
import { connectWallet, getContract, ensurePolygonAmoyNetwork } from "../hooks/useWallet";
import { useAuth } from "../context/AuthContext";
import StatusBadge from "../components/common/StatusBadge";
import ProvenanceTimeline from "../components/batch/ProvenanceTimeline";
import QRScanner from "../components/qr/QRScanner";
import TransactionBadge from "../components/common/TransactionBadge";
import { Batch, SupplyChainEvent } from "../types";
import { getErrorMessage } from "../utils/errors";

export default function WholesalerDashboard() {
  const { user } = useAuth();
  const [batchId, setBatchId] = useState("");
  const [batch, setBatch] = useState<Batch | null>(null);
  const [events, setEvents] = useState<SupplyChainEvent[]>([]);
  const [msg, setMsg] = useState("");
  const [latestTxHash, setLatestTxHash] = useState("");
  const [loading, setLoading] = useState(false);

  // Wholesaler Checkpoint Form
  const [eventForm, setEventForm] = useState({
    action: "WHOLESALE_AUDIT",
    quality: "GOOD",
    location: "Navi Mumbai APMC Mandi, Maharashtra",
    transportDetails: "Interstate Transit Received & Weighed",
    storageDetails: "Mandi Grain Silo / Cold Facility #4",
    price: "25",
  });

  // Transfer to Retailer Form
  const [retailerTransfer, setRetailerTransfer] = useState({
    retailerAddress: "",
    retailPrice: "28",
    location: "FreshDirect Supermarket Hub, Mumbai",
    transportDetails: "Refrigerated City Logistics Van",
    storageDetails: "Shelf Display Ready",
  });

  async function loadBatchDetails(idToLoad?: number) {
    const id = idToLoad || Number(batchId);
    if (!id) return;
    setLoading(true);
    setMsg("");
    try {
      const b = await getBatch(id);
      setBatch(b);
      const h = await getHistory(id).catch(() => ({ supplyChainEvents: [] }));
      setEvents(h.supplyChainEvents || b.supplyChainEvents || []);
      setMsg(`Loaded Batch #${id} (${b.cropName})`);
    } catch (err) {
      setMsg(getErrorMessage(err, "Failed to load batch"));
    } finally {
      setLoading(false);
    }
  }

  function handleQRScan(data: string) {
    try {
      const parsed = JSON.parse(data);
      setBatchId(String(parsed.batchId));
      loadBatchDetails(parsed.batchId);
    } catch {
      const match = data.match(/(\d+)/);
      if (match) {
        setBatchId(match[1]);
        loadBatchDetails(Number(match[1]));
      }
    }
  }

  async function submitWholesaleEvent(e: React.FormEvent) {
    e.preventDefault();
    if (!batch) return;
    setLoading(true);
    setMsg("");
    setLatestTxHash("");

    try {
      await ensurePolygonAmoyNetwork();
      await connectWallet();
      const contract = await getContract();

      const onChainEvent = {
        actor: user?.walletAddress || "",
        actorRole: "WHOLESALER",
        action: eventForm.action,
        price: eventForm.price ? BigInt(eventForm.price) : 0n,
        quantity: batch.quantity,
        location: eventForm.location,
        quality: eventForm.quality,
        transportDetails: eventForm.transportDetails,
        storageDetails: eventForm.storageDetails,
        timestamp: Math.floor(Date.now() / 1000),
        metadataURI: "",
      };

      const tx = await contract.addSupplyChainEvent(batch.batchId, onChainEvent);
      setMsg("Recording wholesale audit on Polygon Amoy...");
      const receipt = await tx.wait();
      setLatestTxHash(receipt.hash);

      await addSupplyChainEvent({
        batchId: batch.batchId,
        txHash: receipt.hash,
        actorRole: "WHOLESALER",
        action: eventForm.action,
        price: eventForm.price,
        quantity: batch.quantity,
        location: eventForm.location,
        quality: eventForm.quality,
        transportDetails: eventForm.transportDetails,
        storageDetails: eventForm.storageDetails,
      }).catch(() => {});

      setMsg(`Wholesale checkpoint [${eventForm.action}] recorded on blockchain!`);
      loadBatchDetails(batch.batchId);
    } catch (err) {
      setMsg(getErrorMessage(err, "Event recording failed"));
    } finally {
      setLoading(false);
    }
  }

  async function submitTransferToRetailer(e: React.FormEvent) {
    e.preventDefault();
    if (!batch || !retailerTransfer.retailerAddress) return;
    setLoading(true);
    setMsg("");

    try {
      await ensurePolygonAmoyNetwork();
      await connectWallet();
      const contract = await getContract();

      const tx = await contract["transferOwnership(uint256,address,string,string,string,string,string,uint256)"](
        batch.batchId,
        retailerTransfer.retailerAddress,
        "RETAILER",
        retailerTransfer.location,
        retailerTransfer.transportDetails,
        retailerTransfer.storageDetails,
        "GOOD",
        retailerTransfer.retailPrice ? BigInt(retailerTransfer.retailPrice) : 0n
      );

      setMsg("Transferring batch custody to Retailer on Polygon Amoy...");
      const receipt = await tx.wait();
      setLatestTxHash(receipt.hash);

      await addSupplyChainEvent({
        batchId: batch.batchId,
        txHash: receipt.hash,
        actorRole: "WHOLESALER",
        action: "TRANSFERRED",
        price: retailerTransfer.retailPrice,
        location: retailerTransfer.location,
        transportDetails: retailerTransfer.transportDetails,
        storageDetails: retailerTransfer.storageDetails,
        newOwner: retailerTransfer.retailerAddress,
      }).catch(() => {});

      setMsg(`Batch #${batch.batchId} custody transferred to Retailer!`);
      loadBatchDetails(batch.batchId);
    } catch (err) {
      setMsg(getErrorMessage(err, "Transfer failed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page wholesaler-page">
      <header className="page-header">
        <div>
          <span className="badge-role">WHOLESALER / MANDI HUB DASHBOARD</span>
          <h1>Mandi & Bulk Distribution Operations</h1>
          <p className="subtitle">Audit incoming bulk shipments, record quality grading, and dispatch to supermarkets</p>
        </div>
      </header>

      {msg && (
        <div className={`alert ${msg.includes("failed") ? "error" : "success"}`}>
          {msg}
          {latestTxHash && <TransactionBadge txHash={latestTxHash} label="Tx Hash" />}
        </div>
      )}

      {/* Search & Scan */}
      <section className="card">
        <h2>🔍 Lookup Produce Batch</h2>
        <div className="search-batch-row">
          <input
            placeholder="Enter Batch ID (e.g. 1)"
            value={batchId}
            onChange={(e) => setBatchId(e.target.value)}
            className="search-input"
          />
          <button type="button" onClick={() => loadBatchDetails()} className="btn-primary">
            Load History & Details
          </button>
        </div>

        <div style={{ marginTop: "1rem" }}>
          <h4>Or Scan Batch QR:</h4>
          <QRScanner onScan={handleQRScan} />
        </div>
      </section>

      {batch && (
        <>
          {/* Produce Overview Card */}
          <section className="card">
            <div className="batch-card-header">
              <div>
                <h2>{batch.cropName} (#{batch.batchId})</h2>
                <p className="subtitle">Origin: {batch.location} · {batch.quantity} {batch.unit || "kg"}</p>
              </div>
              <StatusBadge status={batch.status} />
            </div>
            <p><strong>Current Owner:</strong> <code>{batch.currentOwner}</code></p>
            <p><strong>Certification:</strong> {batch.certification || "Standard"}</p>
            <Link to={`/trace/${batch.batchId}`} className="link">View Public Trace Page →</Link>
          </section>

          {/* Timeline of events so far */}
          <section className="card">
            <h2>📜 Provenance History Checkpoints</h2>
            <ProvenanceTimeline events={events} />
          </section>

          <div className="batch-operations-grid">
            {/* Record Wholesale Event */}
            <section className="card">
              <h3>📝 Add Wholesale Checkpoint Event</h3>
              <form onSubmit={submitWholesaleEvent} className="form">
                <label>
                  Quality Grading
                  <select
                    value={eventForm.quality}
                    onChange={(e) => setEventForm({ ...eventForm, quality: e.target.value })}
                  >
                    <option value="GOOD">GOOD (Grade A / Premium)</option>
                    <option value="MEDIUM">MEDIUM (Standard Market Grade)</option>
                    <option value="BAD">BAD (Rejection Candidate)</option>
                  </select>
                </label>

                <label>
                  Mandi Location
                  <input
                    value={eventForm.location}
                    onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
                  />
                </label>

                <label>
                  Storage Silo / Temperature Log
                  <input
                    value={eventForm.storageDetails}
                    onChange={(e) => setEventForm({ ...eventForm, storageDetails: e.target.value })}
                  />
                </label>

                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? "Recording on Amoy..." : "Record Checkpoint on Blockchain"}
                </button>
              </form>
            </section>

            {/* Transfer to Retailer */}
            <section className="card">
              <h3>🛒 Dispatch / Transfer to Retailer</h3>
              <form onSubmit={submitTransferToRetailer} className="form">
                <label>
                  Retailer Wallet Address *
                  <input
                    value={retailerTransfer.retailerAddress}
                    onChange={(e) => setRetailerTransfer({ ...retailerTransfer, retailerAddress: e.target.value })}
                    placeholder="0x..."
                    required
                  />
                </label>

                <label>
                  Retail Supply Price (₹ per unit)
                  <input
                    type="number"
                    value={retailerTransfer.retailPrice}
                    onChange={(e) => setRetailerTransfer({ ...retailerTransfer, retailPrice: e.target.value })}
                  />
                </label>

                <label>
                  Retail Store Destination
                  <input
                    value={retailerTransfer.location}
                    onChange={(e) => setRetailerTransfer({ ...retailerTransfer, location: e.target.value })}
                  />
                </label>

                <button type="submit" className="btn-secondary" disabled={loading}>
                  {loading ? "Transferring on Amoy..." : "Transfer to Retailer on Blockchain"}
                </button>
              </form>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
