import { BATCH_STATUS_LABELS } from "../../utils/constants";

export default function StatusBadge({ status }: { status: string }) {
  const slug = status.toLowerCase().replace(/\s/g, "");
  return <span className={`badge badge-${slug}`}>{BATCH_STATUS_LABELS[status] ?? status}</span>;
}
