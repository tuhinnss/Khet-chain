import { FormEvent, useState } from "react";
import { transferOwnership, updateStatus } from "../api/transfer.api";
import { getHistory } from "../api/batch.api";
import { getContract } from "../hooks/useWallet";
import QRScanner from "../components/qr/QRScanner";
import ProvenanceTimeline from "../components/batch/ProvenanceTimeline";
import { ProvenanceRecord } from "../types";

export default function RetailerDashboard() {
  const [batchId, setBatchId] = useState("");
  const [newOwner, setNewOwner] = useState("");
  const [history, setHistory] = useState<ProvenanceRecord[]>([]);
  const [msg, setMsg] = useState("");

  async function verifyBatch(id: number) {
    const data = await getHistory(id);
    setHistory(data.history ?? []);
    setBatchId(String(id));
    setMsg(`Loaded provenance for batch #${id}`);
  }

  function handleScan(data: string) {
    try {
      const parsed = JSON.parse(data);
      verifyBatch(parsed.batchId);
    } catch {
      const match = data.match(/(\d+)/);
      if (match) verifyBatch(Number(match[1]));
    }
  }

  async function handleTransfer(e: FormEvent) {
    e.preventDefault();
    const id = Number(batchId);
    try {
      const contract = await getContract();
      const tx = await contract.transferOwnership(id, newOwner);
      const receipt = await tx.wait();
      await transferOwnership({ batchId: id, newOwner, txHash: receipt.hash, toRole: "retailer" });
      setMsg("Ownership transferred on-chain");
      await verifyBatch(id);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Transfer failed");
    }
  }

  async function markRetailReady() {
    const id = Number(batchId);
    try {
      const contract = await getContract();
      const tx = await contract.updateStatus(id, 6);
      const receipt = await tx.wait();
      await updateStatus({ batchId: id, status: "RetailReady", txHash: receipt.hash });
      setMsg("Batch marked Retail Ready");
      await verifyBatch(id);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Status update failed");
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1>Retailer Dashboard</h1>
        <p className="subtitle">Receive produce, verify provenance, update ownership</p>
      </header>

      {msg && <div className="alert">{msg}</div>}

      <section className="card">
        <h2>Scan Batch QR</h2>
        <QRScanner onScan={handleScan} />
        <div className="inline-form" style={{ marginTop: "1rem" }}>
          <input placeholder="Batch ID" value={batchId} onChange={(e) => setBatchId(e.target.value)} />
          <button onClick={() => verifyBatch(Number(batchId))} className="btn-secondary">Load History</button>
        </div>
      </section>

      {history.length > 0 && (
        <section className="card">
          <h2>Provenance Timeline</h2>
          <ProvenanceTimeline history={history} />
        </section>
      )}

      <section className="card">
        <h2>Transfer Ownership</h2>
        <form onSubmit={handleTransfer} className="form">
          <label>
            New owner wallet
            <input value={newOwner} onChange={(e) => setNewOwner(e.target.value)} required />
          </label>
          <button type="submit" className="btn-primary">Transfer on Blockchain</button>
        </form>
        <button onClick={markRetailReady} className="btn-secondary" style={{ marginTop: "1rem" }}>
          Mark Retail Ready
        </button>
      </section>
    </div>
  );
}
