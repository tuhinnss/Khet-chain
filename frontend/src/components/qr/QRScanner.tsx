import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";

interface Props {
  onScan: (data: string) => void;
}

export default function QRScanner({ onScan }: Props) {
  const [error, setError] = useState("");
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const started = useRef(false);

  useEffect(() => {
    const id = "qr-reader";
    const scanner = new Html5Qrcode(id);
    scannerRef.current = scanner;

    if (!started.current) {
      started.current = true;
      scanner
        .start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decoded) => onScan(decoded),
          () => {}
        )
        .catch((err) => setError(String(err)));
    }

    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, [onScan]);

  return (
    <div className="qr-scanner">
      <div id="qr-reader" />
      {error && <p className="error-text">{error}</p>}
    </div>
  );
}
