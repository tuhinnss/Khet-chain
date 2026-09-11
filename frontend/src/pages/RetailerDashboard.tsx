import { useState } from "react";
import { Link } from "react-router-dom";
import { getBatch, getHistory } from "../api/batch.api";
import { addSupplyChainEvent } from "../api/supplychain.api";
import { connectWallet, getContract, ensurePolygonAmoyNetwork } from "../hooks/useWallet";
import { useAuth } from "../context/AuthContext";
import QRScanner from "../components/qr/QRScanner";
import QRGenerator from "../components/qr/QRGenerator";
import ProvenanceTimeline from "../components/batch/ProvenanceTimeline";
import StatusBadge from "../components/common/StatusBadge";
import TransactionBadge from "../components/common/TransactionBadge";
import { Batch, SupplyChainEvent } from "../types";
import { getErrorMessage } from "../utils/errors";

export default function RetailerDashboard() {
  const { user } = useAuth();
  const [batchId, setBatchId] = useState("");
  const [batch, setBatch] = useState<Batch | null>(null);
  const [events, setEvents] = useState<SupplyChainEvent[]>([]);
  const [msg, setMsg] = useState("");
  const [latestTxHash, setLatestTxHash] = useState("");
  const [loading, setLoading] = useState(false);

  // Retailer Final Inspection Form
  const [shelfForm, setShelfForm] = useState({
    action: "RETAIL_READY",
    quality: "GOOD",
    finalPrice: "28",
    storeLocation: "FreshDirect Supermarket, Bandra West, Mumbai",
    shelfDetails: "Misted Organic Produce Display Aisle 2",
  });

  async function loadBatch(idToLoad?: number) {
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

  function handleScan(data: string) {
    try {
      const parsed = JSON.parse(data);
      setBatchId(String(parsed.batchId));
      loadBatch(parsed.batchId);
    } catch {
      const match = data.match(/(\d+)/);
      if (match) {
        setBatchId(match[1]);
        loadBatch(Number(match[1]));
      }
    }
  }

  async function markRetailReady(e: React.FormEvent) {
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
        actorRole: "RETAILER",
        action: "RETAIL_READY",
        price: shelfForm.finalPrice ? BigInt(shelfForm.finalPrice) : 0n,
        quantity: batch.quantity,
        location: shelfForm.storeLocation,
        quality: shelfForm.quality,
        transportDetails: "Store shelf arrival & shelf-life inspection",
        storageDetails: shelfForm.shelfDetails,
        timestamp: Math.floor(Date.now() / 1000),
        metadataURI: "",
      };

      // 1. Record final retail event
      const eventTx = await contract.addSupplyChainEvent(batch.batchId, onChainEvent);
      setMsg("Recording retail receipt on Polygon Amoy...");
      const eventReceipt = await eventTx.wait();
      setLatestTxHash(eventReceipt.hash);

      // 2. Update status to RetailReady (enum 6)
      const statusTx = await contract.updateStatus(batch.batchId, 6);
      await statusTx.wait();

      await addSupplyChainEvent({
        batchId: batch.batchId,
        txHash: eventReceipt.hash,
        actorRole: "RETAILER",
        action: "RETAIL_READY",
        price: shelfForm.finalPrice,
        location: shelfForm.storeLocation,
        quality: shelfForm.quality,
        storageDetails: shelfForm.shelfDetails,
      }).catch(() => {});

      setMsg(`Batch #${batch.batchId} marked Retail Ready on Polygon Amoy! QR code active.`);
      loadBatch(batch.batchId);
    } catch (err) {
      setMsg(getErrorMessage(err, "Failed to update retail status"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page retailer-page">
      <header className="page-header">
        <div>
          <span className="badge-role">RETAILER DASHBOARD</span>
          <h1>Store Receipt, QR Generation & Consumer Verification</h1>
          <p className="subtitle">Accept wholesale produce, perform final shelf inspections, and generate print-ready consumer QR codes</p>
        </div>
      </header>

      {msg && (
        <div className={`alert ${msg.includes("failed") ? "error" : "success"}`}>
          {msg}
          {latestTxHash && <TransactionBadge txHash={latestTxHash} label="Tx Hash" />}
        </div>
      )}

      {/* Batch Lookup & QR Scan */}
      <section className="card">
        <h2>🔍 Scan or Enter Received Produce Batch</h2>
        <div className="search-batch-row">
          <input
            placeholder="Enter Batch ID (e.g. 1)"
            value={batchId}
            onChange={(e) => setBatchId(e.target.value)}
            className="search-input"
          />
          <button type="button" onClick={() => loadBatch()} className="btn-primary">
            Load Produce Record
          </button>
        </div>

        <div style={{ marginTop: "1rem" }}>
          <h4>Or Scan Incoming Crate QR:</h4>
          <QRScanner onScan={handleScan} />
        </div>
      </section>

      {batch && (
        <>
          {/* Produce Details & Status */}
          <section className="card">
            <div className="batch-card-header">
              <div>
                <h2>{batch.cropName}</h2>
                <p className="subtitle">Batch #{batch.batchId} ({batch.batchStringId || `KHC-2026-${String(batch.batchId).padStart(6, "0")}`})</p>
              </div>
              <StatusBadge status={batch.status} />
            </div>

            <div className="produce-meta-grid" style={{ marginTop: "1rem" }}>
              <div className="meta-box">
                <span className="meta-label">Origin Farm</span>
                <span className="meta-value">📍 {batch.location}</span>
              </div>
              <div className="meta-box">
                <span className="meta-label">Batch Size</span>
                <span className="meta-value">{batch.quantity} {batch.unit || "kg"}</span>
              </div>
              <div className="meta-box">
                <span className="meta-label">Certification</span>
                <span className="meta-value">🌱 {batch.certification || "Standard"}</span>
              </div>
              <div className="meta-box">
                <span className="meta-label">Farmer Wallet</span>
                <span className="meta-value"><code>{batch.farmerAddress.slice(0, 8)}...</code></span>
              </div>
            </div>
          </section>

          {/* Core Feature: Retail QR Code Generator */}
          <section className="card qr-retailer-section">
            <div className="section-header">
              <h2>📱 Consumer Traceability QR Code</h2>
              <p className="subtitle">
                Print this QR code sticker for customer packaging, retail shelves, or vegetable crates.
              </p>
            </div>

            <QRGenerator
              batchId={batch.batchId}
              batchStringId={batch.batchStringId}
              cropName={batch.cropName}
              showDetails={true}
            />
          </section>

          {/* Final Shelf Inspection Form */}
          <section className="card">
            <h3>🛒 Final Quality Inspection & Shelf Activation</h3>
            <form onSubmit={markRetailReady} className="form">
              <div className="form-row grid-2">
                <label>
                  Final Quality Grade
                  <select
                    value={shelfForm.quality}
                    onChange={(e) => setShelfForm({ ...shelfForm, quality: e.target.value })}
                  >
                    <option value="GOOD">GOOD (Fresh / Prime Retail Quality)</option>
                    <option value="MEDIUM">MEDIUM (Standard Consumer Grade)</option>
                    <option value="BAD">BAD (Reject / Do not display)</option>
                  </select>
                </label>
                <label>
                  Final Consumer Retail Price (₹ per unit) *
                  <input
                    type="number"
                    value={shelfForm.finalPrice}
                    onChange={(e) => setShelfForm({ ...shelfForm, finalPrice: e.target.value })}
                    required
                  />
                </label>
              </div>

              <label>
                Supermarket Store Location *
                <input
                  value={shelfForm.storeLocation}
                  onChange={(e) => setShelfForm({ ...shelfForm, storeLocation: e.target.value })}
                  required
                />
              </label>

              <label>
                Display / Shelf Placement Details
                <input
                  value={shelfForm.shelfDetails}
                  onChange={(e) => setShelfForm({ ...shelfForm, shelfDetails: e.target.value })}
                />
              </label>

              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? "Activating on Polygon Amoy..." : "✅ Mark Retail Ready & Publish to Consumers"}
              </button>
            </form>
          </section>

          {/* Complete Provenance Timeline */}
          <section className="card">
            <h2>📜 Full Supply Chain Verification History</h2>
            <ProvenanceTimeline events={events} />
          </section>
        </>
      )}
    </div>
  );
}
