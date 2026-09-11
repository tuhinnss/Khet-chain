import { SupplyChainEvent, ProvenanceRecord } from "../../types";
import { QualityBadge } from "../common/StatusBadge";
import TransactionBadge from "../common/TransactionBadge";

interface ProvenanceTimelineProps {
  events?: SupplyChainEvent[];
  history?: ProvenanceRecord[];
}

export default function ProvenanceTimeline({ events = [], history = [] }: ProvenanceTimelineProps) {
  // If we have rich SupplyChainEvents, prioritize them
  if (events && events.length > 0) {
    return (
      <div className="supply-chain-timeline">
        {events.map((evt, idx) => {
          const roleUpper = (evt.actorRole || "ACTOR").toUpperCase();
          const actionUpper = (evt.action || "CHECKPOINT").toUpperCase();
          const dateStr = evt.timestamp
            ? new Date(evt.timestamp).toLocaleString("en-IN", {
                dateStyle: "medium",
                timeStyle: "short",
              })
            : "Timestamp recorded";

          let roleIcon = "🌱";
          if (roleUpper.includes("DISTRIBUTOR") || roleUpper.includes("DEALER")) roleIcon = "🚛";
          else if (roleUpper.includes("WHOLESALER")) roleIcon = "🏪";
          else if (roleUpper.includes("RETAILER")) roleIcon = "🛒";
          else if (roleUpper.includes("CONSUMER")) roleIcon = "🍽️";

          return (
            <div key={idx} className="timeline-node">
              <div className="timeline-marker">
                <span className="timeline-icon">{roleIcon}</span>
                {idx < events.length - 1 && <div className="timeline-stem" />}
              </div>

              <div className="timeline-content-card">
                <div className="timeline-card-header">
                  <div className="timeline-role-action">
                    <span className="timeline-role-pill">{roleUpper}</span>
                    <span className="timeline-action-title">{actionUpper}</span>
                  </div>
                  <span className="timeline-date">{dateStr}</span>
                </div>

                <div className="timeline-grid-details">
                  {evt.location && (
                    <div className="timeline-detail-item">
                      <span className="detail-label">📍 Location:</span>
                      <span className="detail-value">{evt.location}</span>
                    </div>
                  )}

                  {evt.price && evt.price !== "0" && (
                    <div className="timeline-detail-item">
                      <span className="detail-label">💰 Price:</span>
                      <span className="detail-value price-highlight">
                        {Number(evt.price) > 1e12
                          ? `${(Number(evt.price) / 1e18).toFixed(4)} MATIC`
                          : `₹${evt.price}`}
                      </span>
                    </div>
                  )}

                  {evt.quantity > 0 && (
                    <div className="timeline-detail-item">
                      <span className="detail-label">📦 Quantity:</span>
                      <span className="detail-value">{evt.quantity} kg</span>
                    </div>
                  )}

                  {evt.quality && (
                    <div className="timeline-detail-item">
                      <QualityBadge quality={evt.quality} />
                    </div>
                  )}

                  {evt.transportDetails && (
                    <div className="timeline-detail-item full-width">
                      <span className="detail-label">🚚 Transport:</span>
                      <span className="detail-value">{evt.transportDetails}</span>
                    </div>
                  )}

                  {evt.storageDetails && (
                    <div className="timeline-detail-item full-width">
                      <span className="detail-label">🏬 Storage:</span>
                      <span className="detail-value">{evt.storageDetails}</span>
                    </div>
                  )}
                </div>

                <div className="timeline-card-footer">
                  <div className="actor-address-row">
                    <span className="actor-label">Signer Wallet:</span>
                    <code className="actor-address">
                      {evt.actor ? `${evt.actor.slice(0, 8)}...${evt.actor.slice(-6)}` : "Verified on-chain"}
                    </code>
                    <span className="verified-badge-inline">✓ On-Chain Verified</span>
                  </div>

                  {evt.txHash && (
                    <TransactionBadge txHash={evt.txHash} label="Tx" />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Fallback to basic provenance history if supplyChainEvents array is empty
  if (history && history.length > 0) {
    return (
      <div className="supply-chain-timeline">
        {history.map((record, index) => (
          <div key={index} className="timeline-node">
            <div className="timeline-marker">
              <span className="timeline-icon">🔗</span>
              {index < history.length - 1 && <div className="timeline-stem" />}
            </div>
            <div className="timeline-content-card">
              <div className="timeline-card-header">
                <span className="timeline-role-pill">{record.status || "EVENT"}</span>
                <span className="timeline-date">{new Date(record.timestamp).toLocaleString()}</span>
              </div>
              <p className="timeline-action-title">{record.action}</p>
              <div className="timeline-addresses">
                <span>From: <code>{record.from.slice(0, 6)}...{record.from.slice(-4)}</code></span>
                <span>To: <code>{record.to.slice(0, 6)}...{record.to.slice(-4)}</code></span>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return <p className="muted">No supply chain events recorded yet.</p>;
}
