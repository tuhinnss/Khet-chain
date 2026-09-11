import { useState } from "react";
import { FairPriceCrop } from "../types";

export default function FairPricePage() {
  const [crops] = useState<FairPriceCrop[]>([
    {
      cropName: "Tomato (Native Hybrid)",
      category: "Vegetables",
      currentSupplyChainPrice: 28,
      referenceMSP: 30,
      unit: "kg",
      priceDifference: -2,
      trend: "stable",
      lastUpdated: "Today, 10:00 AM",
    },
    {
      cropName: "Basmati Rice (Pusa 1121)",
      category: "Cereals",
      currentSupplyChainPrice: 42,
      referenceMSP: 38,
      unit: "kg",
      priceDifference: 4,
      trend: "increasing",
      lastUpdated: "Today, 09:30 AM",
    },
    {
      cropName: "Wheat (Sharbati A-Grade)",
      category: "Cereals",
      currentSupplyChainPrice: 26,
      referenceMSP: 24,
      unit: "kg",
      priceDifference: 2,
      trend: "stable",
      lastUpdated: "Today, 09:30 AM",
    },
    {
      cropName: "Onion (Nashik Red)",
      category: "Vegetables",
      currentSupplyChainPrice: 22,
      referenceMSP: 25,
      unit: "kg",
      priceDifference: -3,
      trend: "decreasing",
      lastUpdated: "Today, 10:15 AM",
    },
    {
      cropName: "Potato (Jyoti Fresh)",
      category: "Vegetables",
      currentSupplyChainPrice: 18,
      referenceMSP: 16,
      unit: "kg",
      priceDifference: 2,
      trend: "stable",
      lastUpdated: "Today, 10:15 AM",
    },
    {
      cropName: "Mustard Seed (Yellow)",
      category: "Oilseeds",
      currentSupplyChainPrice: 56,
      referenceMSP: 54,
      unit: "kg",
      priceDifference: 2,
      trend: "increasing",
      lastUpdated: "Today, 08:45 AM",
    },
    {
      cropName: "Alphonso Mango",
      category: "Fruits",
      currentSupplyChainPrice: 120,
      referenceMSP: 110,
      unit: "kg",
      priceDifference: 10,
      trend: "increasing",
      lastUpdated: "Today, 11:00 AM",
    },
  ]);

  return (
    <div className="page fair-price-page">
      <header className="page-header">
        <div>
          <span className="badge-role">MARKET TRANSPARENCY</span>
          <h1>Fair Price & MSP Reference Monitor</h1>
          <p className="subtitle">
            Ensuring transparent pricing across the farm-to-consumer supply chain
          </p>
        </div>
      </header>

      {/* Official Transparency Disclaimer */}
      <div className="disclaimer-banner">
        <span className="disclaimer-icon">ℹ️</span>
        <div>
          <strong>Reference Price Notice:</strong> Current displayed MSP and market benchmarks are
          <strong> reference price — demo data</strong> for hackathon evaluation. KHETCHAIN's modular
          architecture is designed to consume live mandi feeds from Agmarknet / e-NAM government price APIs.
        </div>
      </div>

      {/* Price Table Card */}
      <section className="card">
        <h2>Live Supply Chain vs. Reference Price Comparison</h2>
        <div className="table-responsive">
          <table className="price-table">
            <thead>
              <tr>
                <th>Crop & Variety</th>
                <th>Category</th>
                <th>Current Supply Chain Price</th>
                <th>Reference MSP Benchmark</th>
                <th>Difference</th>
                <th>Price Trend</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {crops.map((c, i) => {
                const isFair = c.priceDifference >= 0;
                return (
                  <tr key={i}>
                    <td>
                      <strong>{c.cropName}</strong>
                    </td>
                    <td><span className="category-pill">{c.category}</span></td>
                    <td className="table-price-col">₹{c.currentSupplyChainPrice}/{c.unit}</td>
                    <td>₹{c.referenceMSP}/{c.unit}</td>
                    <td className={isFair ? "diff-positive" : "diff-negative"}>
                      {c.priceDifference > 0 ? `+₹${c.priceDifference}` : `₹${c.priceDifference}`}/{c.unit}
                    </td>
                    <td>
                      <span className={`trend-pill ${c.trend}`}>
                        {c.trend === "increasing" ? "↗ Increasing" : c.trend === "decreasing" ? "↘ Decreasing" : "→ Stable"}
                      </span>
                    </td>
                    <td>
                      <span className={`fair-badge ${isFair ? "fair-good" : "fair-alert"}`}>
                        {isFair ? "✓ Fair / Above MSP" : "⚠️ Below Reference"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Methodology Section */}
      <section className="card">
        <h3>How Fair Pricing Works in KHETCHAIN</h3>
        <div className="features-grid" style={{ marginTop: "1rem" }}>
          <div className="feature-card">
            <h4>1. Farm-Gate Base Recording</h4>
            <p>Farmers register their true harvest price on-chain, eliminating arbitrary middleman suppression.</p>
          </div>
          <div className="feature-card">
            <h4>2. Transparent Logistics Markup</h4>
            <p>Distributors and wholesalers log exact transport, storage, and handling costs at each checkpoint.</p>
          </div>
          <div className="feature-card">
            <h4>3. Consumer Value Assurance</h4>
            <p>Consumers can verify what percentage of the shelf price went directly to the farmer who grew their food.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
