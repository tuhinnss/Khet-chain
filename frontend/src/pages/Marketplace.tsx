import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getListings } from "../api/listing.api";
import { Listing } from "../types";

export default function Marketplace() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [cropFilter, setCropFilter] = useState("");

  useEffect(() => {
    getListings({ cropName: cropFilter || undefined }).then(setListings).catch(() => setListings([]));
  }, [cropFilter]);

  return (
    <div className="page">
      <header className="page-header">
        <h1>Produce Marketplace</h1>
        <input
          className="search-input"
          placeholder="Filter by crop…"
          value={cropFilter}
          onChange={(e) => setCropFilter(e.target.value)}
        />
      </header>
      <div className="batch-grid">
        {listings.map((l) => (
          <div key={l._id} className="batch-card">
            <h3>{l.cropName}</h3>
            <p>Batch #{l.batchId} · {l.quantity} kg</p>
            <p className="price">{(Number(l.askingPrice) / 1e18 || Number(l.askingPrice)).toFixed(4)} ETH</p>
            <Link to={`/batch/${l.batchId}`}>View batch →</Link>
          </div>
        ))}
        {listings.length === 0 && <p className="muted">No active listings.</p>}
      </div>
    </div>
  );
}
