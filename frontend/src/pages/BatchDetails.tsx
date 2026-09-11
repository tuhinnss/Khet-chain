import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getBatch, getHistory } from "../api/batch.api";
import ProvenanceTimeline from "../components/batch/ProvenanceTimeline";
import StatusBadge from "../components/common/StatusBadge";
import QRGenerator from "../components/qr/QRGenerator";
import { Batch, SupplyChainEvent } from "../types";

export default function BatchDetails() {
  const { id } = useParams();
  const [batch, setBatch] = useState<Batch | null>(null);
  const [events, setEvents] = useState<SupplyChainEvent[]>([]);

  useEffect(() => {
    if (!id) return;
    getBatch(Number(id)).then((d) => {
      setBatch(d);
      if (d.supplyChainEvents) setEvents(d.supplyChainEvents);
    });
    getHistory(Number(id)).then((d) => {
      if (d.supplyChainEvents) setEvents(d.supplyChainEvents);
    });
  }, [id]);

  if (!batch) return <div className="page"><p className="muted">Loading batch record from blockchain...</p></div>;

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <span className="badge-role">BATCH #{batch.batchId}</span>
          <h1>{batch.cropName}</h1>
          <p className="subtitle">Location: {batch.location} · Harvested: {new Date(batch.harvestDate).toLocaleDateString()}</p>
        </div>
        <StatusBadge status={batch.status} />
      </header>

      <section className="card">
        <dl className="verification-dl">
          <dt>Batch ID:</dt>
          <dd>#{batch.batchId} ({batch.batchStringId || `KHC-2026-${String(batch.batchId).padStart(6, "0")}`})</dd>

          <dt>Quantity:</dt>
          <dd>{batch.quantity} {batch.unit ?? "kg"}</dd>

          <dt>Origin Farm:</dt>
          <dd>📍 {batch.location}</dd>

          <dt>Certification:</dt>
          <dd>🌱 {batch.certification || "Standard"}</dd>

          <dt>Current Custodian:</dt>
          <dd><code>{batch.currentOwner}</code></dd>

          <dt>Farmer Wallet:</dt>
          <dd><code>{batch.farmerAddress}</code></dd>

          <dt>Public Trace:</dt>
          <dd>
            <Link to={`/trace/${batch.batchId}`} className="tx-btn explorer-link">
              Open Consumer Trace Page ↗
            </Link>
          </dd>
        </dl>
      </section>

      <section className="card">
        <h2>📱 Batch QR Verification Code</h2>
        <QRGenerator batchId={batch.batchId} batchStringId={batch.batchStringId} cropName={batch.cropName} />
      </section>

      <section className="card">
        <h2>🌾 Provenance Supply Chain Timeline</h2>
        <ProvenanceTimeline events={events} />
      </section>
    </div>
  );
}
