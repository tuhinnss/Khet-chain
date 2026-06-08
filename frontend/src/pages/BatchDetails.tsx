import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getBatch, getHistory } from "../api/batch.api";
import ProvenanceTimeline from "../components/batch/ProvenanceTimeline";
import StatusBadge from "../components/common/StatusBadge";
import { Batch, ProvenanceRecord } from "../types";

export default function BatchDetails() {
  const { id } = useParams();
  const [batch, setBatch] = useState<Batch | null>(null);
  const [history, setHistory] = useState<ProvenanceRecord[]>([]);

  useEffect(() => {
    if (!id) return;
    getBatch(Number(id)).then((d) => setBatch(d));
    getHistory(Number(id)).then((d) => setHistory(d.history ?? []));
  }, [id]);

  if (!batch) return <div className="page"><p className="muted">Loading…</p></div>;

  return (
    <div className="page">
      <header className="page-header">
        <h1>{batch.cropName}</h1>
        <StatusBadge status={batch.status} />
      </header>
      <section className="card">
        <dl className="detail-grid">
          <dt>Batch ID</dt><dd>#{batch.batchId}</dd>
          <dt>Quantity</dt><dd>{batch.quantity} {batch.unit ?? "kg"}</dd>
          <dt>Location</dt><dd>{batch.location}</dd>
          <dt>Harvest</dt><dd>{new Date(batch.harvestDate).toLocaleDateString()}</dd>
          <dt>Owner</dt><dd>{batch.currentOwner}</dd>
          <dt>Farmer</dt><dd>{batch.farmerAddress}</dd>
        </dl>
        {batch.qrCodeDataUrl && (
          <div className="qr-display">
            <img src={batch.qrCodeDataUrl} alt="Batch QR" />
            <p className="muted">{batch.verificationUrl}</p>
          </div>
        )}
      </section>
      <section className="card">
        <h2>Provenance</h2>
        <ProvenanceTimeline history={history} />
      </section>
    </div>
  );
}
