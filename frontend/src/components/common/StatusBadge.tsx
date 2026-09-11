import { BATCH_STATUS_LABELS } from "../../utils/constants";

interface StatusBadgeProps {
  status: string;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const normalized = (status || "Created").toLowerCase();

  let badgeClass = "badge-created";
  if (normalized.includes("list")) badgeClass = "badge-listed";
  else if (normalized.includes("bid")) badgeClass = "badge-bidreceived";
  else if (normalized.includes("sold")) badgeClass = "badge-sold";
  else if (normalized.includes("transit")) badgeClass = "badge-intransit";
  else if (normalized.includes("deliver")) badgeClass = "badge-delivered";
  else if (normalized.includes("retail") || normalized.includes("ready")) badgeClass = "badge-retailready";
  else if (normalized.includes("complete")) badgeClass = "badge-completed";

  const label = BATCH_STATUS_LABELS[status] || status;

  return <span className={`badge ${badgeClass}`}>{label}</span>;
}

export function QualityBadge({ quality }: { quality?: string }) {
  const q = (quality || "GOOD").toUpperCase();
  let badgeClass = "quality-good";
  if (q === "MEDIUM") badgeClass = "quality-medium";
  else if (q === "BAD") badgeClass = "quality-bad";

  return <span className={`quality-badge ${badgeClass}`}>● Quality: {q}</span>;
}
