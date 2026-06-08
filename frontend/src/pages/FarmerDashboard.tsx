import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { parseEther } from "ethers";
import { getDashboardStats, syncBatch, listBatches } from "../api/batch.api";
import { createListing } from "../api/listing.api";
import { getBids, acceptBid } from "../api/bid.api";
import { useAuth } from "../context/AuthContext";
import { connectWallet, computeQrHash, getContract } from "../hooks/useWallet";
import { syncRole, getRoleStatus } from "../api/auth.api";
import StatusBadge from "../components/common/StatusBadge";
import { Batch } from "../types";
import { getErrorMessage } from "../utils/errors";

export default function FarmerDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Record<string, number>>({});
  const [batches, setBatches] = useState<Batch[]>([]);
  const [form, setForm] = useState({ cropName: "", quantity: "", harvestDate: "", location: "" });
  const [listingPrice, setListingPrice] = useState<Record<number, string>>({});
  const [bids, setBids] = useState<Record<number, { onChainBids: { index: number; dealer: string; amount: string; active: boolean }[] }>>({});
  const [msg, setMsg] = useState("");
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
    const wallet = await connectWallet();
    setConnectedWallet(wallet);
    if (wallet.toLowerCase() !== user!.walletAddress.toLowerCase()) {
      throw new Error(
        `Wallet mismatch. Frame/MetaMask is using ${wallet.slice(0, 6)}…${wallet.slice(-4)} but you registered as ${user!.walletAddress.slice(0, 6)}…${user!.walletAddress.slice(-4)}. Switch to the correct account.`
      );
    }
    return wallet;
  }

  async function syncRoleOnServer(): Promise<void> {
    await syncRole();
    const { hasRole } = await getRoleStatus();
    if (!hasRole) {
      throw new Error("Farmer role still missing. Is the backend running? Was the contract redeployed?");
    }
  }

  async function registerBatch(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg("");
    try {
      await verifyWallet();
      const { hasRole } = await getRoleStatus();
      if (!hasRole) await syncRoleOnServer();
      const contract = await getContract();
      const counter = await contract.batchCounter();
      const nextId = Number(counter) + 1;
      const qrHash = computeQrHash(nextId, form.cropName, user!.walletAddress);
      const tx = await contract.registerBatch(
        form.cropName,
        Number(form.quantity),
        Math.floor(new Date(form.harvestDate).getTime() / 1000),
        form.location,
        qrHash
      );
      const receipt = await tx.wait();
      const batch = await syncBatch({
        txHash: receipt.hash,
        cropName: form.cropName,
        quantity: Number(form.quantity),
        harvestDate: form.harvestDate,
        location: form.location,
      });
      setBatches((prev) => [batch, ...prev]);
      setMsg(`Batch #${batch.batchId} registered on-chain.`);
      setForm({ cropName: "", quantity: "", harvestDate: "", location: "" });
    } catch (err) {
      setMsg(getErrorMessage(err, "Registration failed"));
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
      await createListing({ batchId, askingPrice: price, txHash: receipt.hash });
      setMsg(`Batch #${batchId} listed at ${price} ETH`);
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
      await acceptBid({ batchId, bidIndex, txHash: receipt.hash });
      setMsg(`Bid accepted for batch #${batchId}`);
      await loadBids(batchId);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Accept failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Farmer Dashboard</h1>
          <p className="subtitle">Register produce, manage listings and bids</p>
        </div>
        <div className="stat-row">
          <div className="stat"><span>{stats.batches ?? 0}</span><label>Batches</label></div>
          <div className="stat"><span>{stats.activeListings ?? 0}</span><label>Active Listings</label></div>
        </div>
      </header>

      {msg && <div className="alert">{msg}</div>}

      <section className="card">
        <p className="muted" style={{ marginBottom: "0.75rem" }}>
          Registered wallet: <code>{user?.walletAddress}</code>
          {connectedWallet && (
            <> · Connected: <code>{connectedWallet}</code></>
          )}
        </p>
        <p className="error-text" style={{ marginBottom: "0.75rem" }}>
          If MetaMask shows <strong>grantUserRole</strong>, reject it. Click "Sync Blockchain Role" instead — roles are granted server-side.
        </p>
        <button
          type="button"
          className="btn-secondary"
          style={{ marginBottom: "1rem" }}
          onClick={async () => {
            try {
              await verifyWallet();
              await syncRoleOnServer();
              setMsg("Blockchain role synced via server. You can register batches now.");
            } catch (err) {
              setMsg(getErrorMessage(err, "Sync failed"));
            }
          }}
        >
          Sync Blockchain Role (server-side)
        </button>
      </section>

      <section className="card">
        <h2>Register Produce Batch</h2>
        <form onSubmit={registerBatch} className="form grid-2">
          <label>Crop<input value={form.cropName} onChange={(e) => setForm({ ...form, cropName: e.target.value })} required /></label>
          <label>Quantity (kg)<input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} required /></label>
          <label>Harvest Date<input type="date" value={form.harvestDate} onChange={(e) => setForm({ ...form, harvestDate: e.target.value })} required /></label>
          <label>Location<input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} required /></label>
          <button type="submit" className="btn-primary" disabled={loading}>Register on Blockchain</button>
        </form>
      </section>

      <section className="card">
        <h2>Your Batches</h2>
        <Link to="/bids" className="link">Manage all bids →</Link>
        {batches.length === 0 && <p className="muted">Register a batch to get started.</p>}
        <div className="batch-grid">
          {batches.map((b) => (
            <div key={b.batchId} className="batch-card">
              <div className="batch-card-header">
                <h3>{b.cropName}</h3>
                <StatusBadge status={b.status} />
              </div>
              <p>Batch #{b.batchId} · {b.quantity} kg · {b.location}</p>
              {b.qrCodeDataUrl && <img src={b.qrCodeDataUrl} alt="QR" className="qr-thumb" />}
              <div className="inline-form">
                <input placeholder="Price (ETH)" value={listingPrice[b.batchId] ?? ""} onChange={(e) => setListingPrice({ ...listingPrice, [b.batchId]: e.target.value })} />
                <button onClick={() => listBatch(b.batchId)} className="btn-secondary">List</button>
                <button onClick={() => loadBids(b.batchId)} className="btn-ghost">View Bids</button>
              </div>
              {bids[b.batchId] && (
                <div className="bid-list">
                  {bids[b.batchId].onChainBids
                    ?.filter((bid) => bid.active)
                    .map((bid) => (
                      <div key={bid.index} className="bid-item">
                        <span>{bid.dealer.slice(0, 8)}… — {(Number(bid.amount) / 1e18).toFixed(4)} ETH</span>
                        <button onClick={() => handleAccept(b.batchId, bid.index)} className="btn-primary-sm">Accept</button>
                      </div>
                    ))}
                </div>
              )}
              <Link to={`/batch/${b.batchId}`}>View details →</Link>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
