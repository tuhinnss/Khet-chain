import { ProvenanceRecord } from "../../types";
import StatusBadge from "../common/StatusBadge";

export default function ProvenanceTimeline({ history }: { history: ProvenanceRecord[] }) {
  if (!history?.length) return <p className="muted">No provenance records yet.</p>;

  return (
    <div className="timeline">
      {history.map((record, i) => (
        <div key={i} className="timeline-item">
          <div className="timeline-dot" />
          <div className="timeline-content">
            <div className="timeline-header">
              <strong>{record.action}</strong>
              <StatusBadge status={record.status} />
            </div>
            <p className="timeline-meta">
              {new Date(record.timestamp).toLocaleString()}
            </p>
            <p className="timeline-addresses">
              {record.from !== "0x0000000000000000000000000000000000000000" && (
                <span>From: {shortAddr(record.from)}</span>
              )}
              {record.to !== record.from && <span>To: {shortAddr(record.to)}</span>}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function shortAddr(addr: string) {
  if (!addr || addr === "system") return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}
