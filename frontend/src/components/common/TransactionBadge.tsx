import { useState } from "react";
import { EXPLORER_URL } from "../../utils/constants";

interface TransactionBadgeProps {
  txHash: string;
  label?: string;
  showLink?: boolean;
}

export default function TransactionBadge({ txHash, label, showLink = true }: TransactionBadgeProps) {
  const [copied, setCopied] = useState(false);

  if (!txHash) return null;

  const shortHash = `${txHash.slice(0, 6)}...${txHash.slice(-4)}`;
  const explorerLink = `${EXPLORER_URL}/tx/${txHash}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(txHash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="tx-badge-container">
      {label && <span className="tx-label">{label}: </span>}
      <code className="tx-hash" title={txHash}>
        {shortHash}
      </code>
      <button
        type="button"
        onClick={copyToClipboard}
        className="tx-btn copy-btn"
        title="Copy transaction hash"
      >
        {copied ? "✓ Copied" : "📋"}
      </button>
      {showLink && (
        <a
          href={explorerLink}
          target="_blank"
          rel="noopener noreferrer"
          className="tx-btn explorer-link"
          title="View on Polygon Amoy Explorer"
        >
          View on Explorer ↗
        </a>
      )}
    </div>
  );
}
