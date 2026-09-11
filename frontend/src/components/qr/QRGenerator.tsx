import { useEffect, useState, useRef } from "react";
import QRCode from "qrcode";

interface QRGeneratorProps {
  batchId: number | string;
  batchStringId?: string;
  cropName?: string;
  url?: string;
  showDetails?: boolean;
}

export default function QRGenerator({
  batchId,
  batchStringId,
  cropName,
  url,
  showDetails = true,
}: QRGeneratorProps) {
  const [dataUrl, setDataUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const displayId = batchStringId || `KHC-2026-${String(batchId).padStart(6, "0")}`;
  const targetUrl = url || `${window.location.origin}/trace/${batchId}`;

  useEffect(() => {
    QRCode.toDataURL(targetUrl, {
      width: 320,
      margin: 2,
      color: {
        dark: "#1b4332",
        light: "#ffffff",
      },
      errorCorrectionLevel: "H",
    })
      .then(setDataUrl)
      .catch((err) => console.error("QR Code generation error:", err));
  }, [targetUrl]);

  const handleDownload = () => {
    if (!dataUrl) return;
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `KHETCHAIN_${displayId}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(targetUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="qr-generator-card" ref={printRef}>
      <div className="qr-header">
        <span className="qr-badge">KHETCHAIN VERIFIED</span>
        <h4>{cropName ? `${cropName} — ` : ""}{displayId}</h4>
      </div>

      <div className="qr-image-wrapper">
        {dataUrl ? (
          <img src={dataUrl} alt={`QR Code for batch ${displayId}`} className="qr-main-img" />
        ) : (
          <div className="qr-skeleton">Generating QR Code...</div>
        )}
      </div>

      {showDetails && (
        <div className="qr-meta-info">
          <p className="qr-instruction">
            Scan with smartphone camera to view immutable supply chain journey.
          </p>
          <div className="qr-url-row">
            <code className="qr-url-text">{targetUrl}</code>
            <button
              type="button"
              onClick={handleCopyUrl}
              className="btn-ghost-sm"
              title="Copy verification link"
            >
              {copied ? "✓ Copied" : "Copy Link"}
            </button>
          </div>
        </div>
      )}

      <div className="qr-actions no-print">
        <button type="button" onClick={handleDownload} className="btn-secondary-sm">
          📥 Download PNG
        </button>
        <button type="button" onClick={handlePrint} className="btn-secondary-sm">
          🖨️ Print QR Label
        </button>
        <a href={targetUrl} target="_blank" rel="noopener noreferrer" className="btn-primary-sm">
          Open Trace Page ↗
        </a>
      </div>
    </div>
  );
}
