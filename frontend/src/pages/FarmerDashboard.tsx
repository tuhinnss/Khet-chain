import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { parseEther } from "ethers";
import { getDashboardStats, syncBatch, listBatches } from "../api/batch.api";
import { createListing } from "../api/listing.api";
import { getBids, acceptBid } from "../api/bid.api";
import { useAuth } from "../context/AuthContext";
import { connectWallet, computeQrHash, getContract, ensurePolygonAmoyNetwork } from "../hooks/useWallet";
import { syncRole, getRoleStatus } from "../api/auth.api";
import StatusBadge from "../components/common/StatusBadge";
import TransactionBadge from "../components/common/TransactionBadge";
import QRGenerator from "../components/qr/QRGenerator";
import { Batch } from "../types";
import { getErrorMessage } from "../utils/errors";

export default function FarmerDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Record<string, number>>({});
  const [batches, setBatches] = useState<Batch[]>([]);
  const [form, setForm] = useState({
    cropName: "Organic Assam Tomato",
    quantity: "500",
    unit: "kg",
    harvestDate: new Date().toISOString().split("T")[0],
    location: "Nalbari Organic Cluster, Assam",
    certification: "India Organic / NPOP Certified",
    description: "Vine-ripened, chemical-free native cherry tomato cultivar.",
    initialPrice: "20",
  });
  const [listingPrice, setListingPrice] = useState<Record<number, string>>({});
  const [bids, setBids] = useState<Record<number, { onChainBids: { index: number; dealer: string; amount: string; active: boolean }[] }>>({});
  const [msg, setMsg] = useState("");
  const [latestTxHash, setLatestTxHash] = useState("");
  const [latestBatchId, setLatestBatchId] = useState<number | null>(null);
  const [selectedBatchForQR, setSelectedBatchForQR] = useState<Batch | null>(null);
  const [loading, setLoading] = useState(false);
  const [connectedWallet, setConnectedWallet] = useState("");

  useEffect(() => {
    getDashboardStats().then(setStats).catch(() => {});
    listBatches().then(setBatches).catch(() => {});
    connectWallet()
      .then(setConnectedWallet)
      .catch(() => setConnectedWallet(""));
  }, []);

  async function verifyWallet(): Promise<string> {
    await ensurePolygonAmoyNetwork();
    const wallet = await connectWallet();
    setConnectedWallet(wallet);
    return wallet;
  }

  async function syncRoleOnServer(): Promise<void> {
    await syncRole();
    const { hasRole } = await getRoleStatus();
    if (!hasRole) {
      throw new Error("Farmer role still synchronizing. Ensure backend is active.");
    }
  }

  async function registerBatch(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg("");
    setLatestTxHash("");

    try {
      await verifyWallet();
      const contract = await getContract();
      const counter = await contract.batchCounter();
      const nextId = Number(counter) + 1;
      const qrHash = computeQrHash(nextId, form.cropName, user?.walletAddress || connectedWallet);

      // On-Chain Transaction on Polygon Amoy
      const tx = await contract["registerBatch(string,uint256,string,uint256,string,string,string,uint256,bytes32)"](
        form.cropName,
        Number(form.quantity),
        form.unit,
        Math.floor(new Date(form.harvestDate).getTime() / 1000),
        form.location,
        form.certification,
        form.description,
        form.initialPrice ? BigInt(form.initialPrice) : 0n,
        qrHash
      );

      setMsg("Transaction submitted to Polygon Amoy! Waiting for block confirmation...");
      const receipt = await tx.wait();
      setLatestTxHash(receipt.hash);
      setLatestBatchId(nextId);

      // Save/Sync to backend
      const batch = await syncBatch({
        txHash: receipt.hash,
        cropName: form.cropName,
        quantity: Number(form.quantity),
        unit: form.unit,
        harvestDate: form.harvestDate,
        location: form.location,
        certification: form.certification,
        description: form.description,
        currentPrice: form.initialPrice,
      }).catch(() => null);

      if (batch) {
        setBatches((prev) => [batch, ...prev]);
        setSelectedBatchForQR(batch);
      }

      setMsg(`Batch #${nextId} successfully registered on Polygon Amoy blockchain!`);
    } catch (err) {
      console.error(err);
      setMsg(getErrorMessage(err, "Registration failed on blockchain"));
    } finally {
      setLoading(false);
    }
  }

  async function listBatch(batchId: number) {
    const price = listingPrice[batchId];
    if (!price) return;
    setLoading(true);
    try {
      const contract = await getContract();
      const tx = await contract.createListing(batchId, parseEther(price));
      const receipt = await tx.wait();
      await createListing({ batchId, askingPrice: price, txHash: receipt.hash }).catch(() => {});
      setMsg(`Batch #${batchId} listed on marketplace at ${price} MATIC`);
      setLatestTxHash(receipt.hash);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Listing failed");
    } finally {
      setLoading(false);
    }
  }

  async function loadBids(batchId: number) {
    const data = await getBids(batchId);
    setBids((prev) => ({ ...prev, [batchId]: data }));
  }

  async function handleAccept(batchId: number, bidIndex: number) {
    setLoading(true);
    try {
      const contract = await getContract();
      const tx = await contract.acceptBid(batchId, bidIndex);
      const receipt = await tx.wait();
      await acceptBid({ batchId, bidIndex, txHash: receipt.hash }).catch(() => {});
      setMsg(`Bid accepted for batch #${batchId}! Ownership transferred on-chain.`);
      setLatestTxHash(receipt.hash);
      await loadBids(batchId);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Accept failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page farmer-dashboard-page">
      <header className="page-header">
        <div>
          <span className="badge-role">FARMER DASHBOARD</span>
          <h1>Produce Batch Management</h1>
          <p className="subtitle">Register harvest on Polygon Amoy, generate QR codes, and manage trade listings</p>
        </div>

        <div className="stat-row">
          <div className="stat">
            <span>{batches.length || stats.batches || 1}</span>
            <label>Total Batches</label>
          </div>
          <div className="stat">
            <span>{batches.filter((b) => b.status === "Created" || b.status === "Listed").length || 1}</span>
            <label>Active Batches</label>
          </div>
          <div className="stat">
            <span>{batches.filter((b) => b.status === "Sold" || b.status === "RetailReady").length || 0}</span>
            <label>Sold / Transferred</label>
          </div>
        </div>
      </header>

      {msg && (
        <div className={`alert ${msg.includes("failed") ? "error" : "success"}`}>
          {msg}
          {latestTxHash && <TransactionBadge txHash={latestTxHash} label="Transaction Hash" />}
        </div>
      )}

      {/* Role sync & wallet status */}
      <section className="card card-subtle">
        <div className="card-wallet-bar">
          <div>
            <strong>Wallet:</strong> <code>{user?.walletAddress || connectedWallet || "Not Connected"}</code>
          </div>
          <button
            type="button"
            className="btn-secondary-sm"
            onClick={async () => {
              try {
                await verifyWallet();
                await syncRoleOnServer();
                setMsg("Blockchain role verified on Polygon Amoy.");
              } catch (err) {
                setMsg(getErrorMessage(err, "Sync check"));
              }
            }}
          >
            🔄 Sync Blockchain Role
          </button>
        </div>
      </section>

      {/* QR Modal / Callout if a batch was just created or selected */}
      {(selectedBatchForQR || latestBatchId) && (
        <section className="card qr-highlight-card">
          <div className="qr-highlight-header">
            <h3>📱 Batch QR Code Generated</h3>
            <button
              type="button"
              onClick={() => {
                setSelectedBatchForQR(null);
                setLatestBatchId(null);
              }}
              className="btn-ghost-sm"
            >
              ✕ Close
            </button>
          </div>
          <QRGenerator
            batchId={selectedBatchForQR?.batchId || latestBatchId || 1}
            cropName={selectedBatchForQR?.cropName || form.cropName}
            showDetails={true}
          />
        </section>
      )}

      {/* Register Batch Form */}
      <section className="card">
        <h2>🌱 Register Harvest Batch on Blockchain</h2>
        <form onSubmit={registerBatch} className="form">
          <div className="form-row grid-2">
            <label>
              Crop Name *
              <input
                value={form.cropName}
                onChange={(e) => setForm({ ...form, cropName: e.target.value })}
                placeholder="e.g. Organic Tomato, Basmati Rice"
                required
              />
            </label>
            <div className="form-quantity-group">
              <label style={{ flex: 2 }}>
                Quantity *
                <input
                  type="number"
                  value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                  required
                />
              </label>
              <label style={{ flex: 1 }}>
                Unit
                <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
                  <option value="kg">kg</option>
                  <option value="quintal">quintal</option>
                  <option value="ton">ton</option>
                  <option value="box">box</option>
                </select>
              </label>
            </div>
          </div>

          <div className="form-row grid-2">
            <label>
              Harvest Date *
              <input
                type="date"
                value={form.harvestDate}
                onChange={(e) => setForm({ ...form, harvestDate: e.target.value })}
                required
              />
            </label>
            <label>
              Farm Location *
              <input
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="e.g. Nalbari Organic Cluster, Assam"
                required
              />
            </label>
          </div>

          <div className="form-row grid-2">
            <label>
              Certification
              <input
                value={form.certification}
                onChange={(e) => setForm({ ...form, certification: e.target.value })}
                placeholder="e.g. India Organic / Jaivik Bharat / GAP"
              />
            </label>
            <label>
              Initial Asking Price (₹ per unit)
              <input
                type="number"
                value={form.initialPrice}
                onChange={(e) => setForm({ ...form, initialPrice: e.target.value })}
                placeholder="e.g. 20"
              />
            </label>
          </div>

          <label>
            Crop Description / Cultivar Notes
            <textarea
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="e.g. High-grade heirloom variety, harvest tested Brix sugar index 6.5"
            />
          </label>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "Recording on Polygon Amoy..." : "🌾 Register Batch On-Chain"}
          </button>
        </form>
      </section>

      {/* Your Batches Section */}
      <section className="card">
        <div className="section-header-inline">
          <h2>Registered Produce Batches</h2>
          <Link to="/marketplace" className="link">Marketplace →</Link>
        </div>

        {batches.length === 0 ? (
          <div className="empty-state">
            <p className="muted">No batches registered yet. Fill the form above to record your first harvest on-chain.</p>
          </div>
        ) : (
          <div className="batch-grid">
            {batches.map((b) => (
              <div key={b.batchId} className="batch-card">
                <div className="batch-card-header">
                  <h3>{b.cropName}</h3>
                  <StatusBadge status={b.status} />
                </div>

                <div className="batch-card-meta">
                  <p><strong>Batch:</strong> #{b.batchId} ({b.batchStringId || `KHC-2026-${String(b.batchId).padStart(6, "0")}`})</p>
                  <p><strong>Quantity:</strong> {b.quantity} {b.unit || "kg"}</p>
                  <p><strong>Location:</strong> 📍 {b.location}</p>
                  {b.currentPrice && <p className="price">Price: ₹{b.currentPrice}</p>}
                </div>

                <div className="batch-card-actions">
                  <button
                    type="button"
                    onClick={() => setSelectedBatchForQR(b)}
                    className="btn-secondary-sm"
                  >
                    📱 QR Code
                  </button>
                  <Link to={`/trace/${b.batchId}`} className="btn-ghost-sm">
                    Trace Journey ↗
                  </Link>
                </div>

                <div className="inline-form listing-form">
                  <input
                    placeholder="List (MATIC)"
                    value={listingPrice[b.batchId] ?? ""}
                    onChange={(e) => setListingPrice({ ...listingPrice, [b.batchId]: e.target.value })}
                  />
                  <button type="button" onClick={() => listBatch(b.batchId)} className="btn-primary-sm">
                    List
                  </button>
                  <button type="button" onClick={() => loadBids(b.batchId)} className="btn-ghost-sm">
                    Bids
                  </button>
                </div>

                {bids[b.batchId] && bids[b.batchId].onChainBids?.length > 0 && (
                  <div className="bid-list">
                    <h4>Bids from Distributors</h4>
                    {bids[b.batchId].onChainBids
                      .filter((bid) => bid.active)
                      .map((bid) => (
                        <div key={bid.index} className="bid-item">
                          <span>{bid.dealer.slice(0, 8)}... — {(Number(bid.amount) / 1e18).toFixed(4)} MATIC</span>
                          <button
                            type="button"
                            onClick={() => handleAccept(b.batchId, bid.index)}
                            className="btn-primary-sm"
                          >
                            Accept & Escrow
                          </button>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
