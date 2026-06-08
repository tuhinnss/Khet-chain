import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { verifyBatch } from "../api/batch.api";
import ProvenanceTimeline from "../components/batch/ProvenanceTimeline";
import StatusBadge from "../components/common/StatusBadge";
import QRScanner from "../components/qr/QRScanner";
import { ProvenanceRecord, Batch } from "../types";

export default function ConsumerVerify() {
  const { batchId: paramId } = useParams();
  const [search] = useSearchParams();
  const [data, setData] = useState<{
    authentic: boolean;
    batch: Batch & { onChain?: Batch };
    history: ProvenanceRecord[];
  } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (paramId) load(Number(paramId), search.get("hash") ?? undefined);
  }, [paramId, search]);

  async function load(id: number, hash?: string) {
    setError("");
    try {
      const result = await verifyBatch(id, hash);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    }
  }

  function handleScan(raw: string) {
    try {
      const parsed = JSON.parse(raw);
      load(parsed.batchId, parsed.hash);
    } catch {
      const match = raw.match(/(\d+)/);
      if (match) load(Number(match[1]));
    }
  }

  const batch = data?.batch?.onChain ?? data?.batch;

  return (
    <div className="page consumer-page">
      <header className="page-header center">
        <h1>Verify Produce Authenticity</h1>
        <p className="subtitle">Scan a QR code or enter a batch ID — no login required</p>
      </header>

      <section className="card">
        <h2>Scan QR Code</h2>
        <QRScanner onScan={handleScan} />
      </section>

      {error && <div className="alert error">{error}</div>}

      {data && batch && (
        <section className="card verify-result">
          <div className={`authenticity ${data.authentic ? "valid" : "invalid"}`}>
            {data.authentic ? "✓ Authentic — On-chain record verified" : "✗ Hash mismatch — Verify manually"}
          </div>
          <div className="verify-details">
            <h2>{batch.cropName}</h2>
            <StatusBadge status={batch.status} />
            <dl>
              <dt>Batch ID</dt><dd>#{batch.batchId}</dd>
              <dt>Quantity</dt><dd>{batch.quantity} kg</dd>
              <dt>Location</dt><dd>{batch.location}</dd>
              <dt>Current Owner</dt><dd>{batch.currentOwner}</dd>
              <dt>Farmer</dt><dd>{batch.farmerAddress}</dd>
            </dl>
          </div>
          <h3>Supply Chain History</h3>
          <ProvenanceTimeline history={data.history} />
        </section>
      )}
    </div>
  );
}
