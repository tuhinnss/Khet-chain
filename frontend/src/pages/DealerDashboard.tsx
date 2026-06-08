import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { parseEther } from "ethers";
import { getDashboardStats } from "../api/batch.api";
import { getListings } from "../api/listing.api";
import { placeBid } from "../api/bid.api";
import { connectWallet, getContract } from "../hooks/useWallet";
import { syncRole, getRoleStatus } from "../api/auth.api";
import { useAuth } from "../context/AuthContext";
import StatusBadge from "../components/common/StatusBadge";
import QRScanner from "../components/qr/QRScanner";
import { Listing } from "../types";
import { getErrorMessage } from "../utils/errors";

export default function DealerDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Record<string, number>>({});
  const [listings, setListings] = useState<Listing[]>([]);
  const [bidAmounts, setBidAmounts] = useState<Record<number, string>>({});
  const [scanResult, setScanResult] = useState("");
  const [msg, setMsg] = useState("");
  const [connectedWallet, setConnectedWallet] = useState("");

  useEffect(() => {
    getDashboardStats().then(setStats).catch(() => {});
    loadListings();
    connectWallet().then(setConnectedWallet).catch(() => setConnectedWallet(""));
  }, []);

  async function verifyWallet(): Promise<string> {
    const wallet = await connectWallet();
    setConnectedWallet(wallet);
    if (wallet.toLowerCase() !== user!.walletAddress.toLowerCase()) {
      throw new Error(
        `Wallet mismatch. Connected ${wallet.slice(0, 6)}…${wallet.slice(-4)} but registered as ${user!.walletAddress.slice(0, 6)}…${user!.walletAddress.slice(-4)}.`
      );
    }
    return wallet;
  }

  async function syncRoleOnServer(): Promise<void> {
    await syncRole();
    const { hasRole } = await getRoleStatus();
    if (!hasRole) {
      throw new Error("Dealer role still missing. Is the backend running? Was the contract redeployed?");
    }
  }

  async function loadListings() {
    const data = await getListings();
    setListings(data);
  }

  async function submitBid(batchId: number) {
    const amount = bidAmounts[batchId];
    if (!amount) return;
    try {
      await verifyWallet();
      const contract = await getContract();
      const tx = await contract.placeBid(batchId, { value: parseEther(amount) });
      const receipt = await tx.wait();
      await placeBid({ batchId, amount, txHash: receipt.hash });
      setMsg(`Bid placed on batch #${batchId}`);
    } catch (err) {
      setMsg(getErrorMessage(err, "Bid failed"));
    }
  }

  function handleScan(data: string) {
    try {
      const parsed = JSON.parse(data);
      setScanResult(`Batch #${parsed.batchId} — ${parsed.verify}`);
      window.location.href = parsed.verify || `/verify/${parsed.batchId}`;
    } catch {
      setScanResult(data);
    }
  }

  async function markInTransit(batchId: number) {
    try {
      const contract = await getContract();
      const tx = await contract.updateStatus(batchId, 4);
      const receipt = await tx.wait();
      const { updateStatus } = await import("../api/transfer.api");
      await updateStatus({ batchId, status: "InTransit", txHash: receipt.hash });
      setMsg(`Batch #${batchId} marked In Transit`);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Status update failed");
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Dealer Dashboard</h1>
          <p className="subtitle">Browse listings, place bids, track shipments</p>
        </div>
        <div className="stat-row">
          <div className="stat"><span>{stats.myBids ?? 0}</span><label>My Bids</label></div>
          <div className="stat"><span>{stats.wonBatches ?? 0}</span><label>Won Batches</label></div>
        </div>
      </header>

      {msg && <div className="alert">{msg}</div>}

      <section className="card">
        <p className="muted" style={{ marginBottom: "0.75rem" }}>
          Registered wallet: <code>{user?.walletAddress}</code>
          {connectedWallet && <> · Connected: <code>{connectedWallet}</code></>}
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
              setMsg("Blockchain role synced via server. You can place bids now.");
            } catch (err) {
              setMsg(getErrorMessage(err, "Sync failed"));
            }
          }}
        >
          Sync Blockchain Role (server-side)
        </button>
      </section>

      <section className="card">
        <h2>Scan QR on Receipt</h2>
        <QRScanner onScan={handleScan} />
        {scanResult && <p>{scanResult}</p>}
      </section>

      <section className="card">
        <h2>Active Listings</h2>
        <Link to="/marketplace">Browse marketplace →</Link>
        <div className="batch-grid">
          {listings.map((l) => (
            <div key={l._id} className="batch-card">
              <div className="batch-card-header">
                <h3>{l.cropName}</h3>
                <StatusBadge status="Listed" />
              </div>
              <p>Batch #{l.batchId} · {l.quantity} kg</p>
              <p>Asking: {(Number(l.askingPrice) / 1e18 || Number(l.askingPrice)).toFixed(4)} ETH</p>
              <div className="inline-form">
                <input placeholder="Bid (ETH)" value={bidAmounts[l.batchId] ?? ""} onChange={(e) => setBidAmounts({ ...bidAmounts, [l.batchId]: e.target.value })} />
                <button onClick={() => submitBid(l.batchId)} className="btn-primary">Place Bid</button>
              </div>
              <button onClick={() => markInTransit(l.batchId)} className="btn-secondary">Mark In Transit</button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
