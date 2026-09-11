import { Link, useNavigate } from "react-router-dom";
import { connectWallet } from "../hooks/useWallet";
import { useState } from "react";

export default function LandingPage() {
  const navigate = useNavigate();
  const [connecting, setConnecting] = useState(false);

  const handleConnectWallet = async () => {
    setConnecting(true);
    try {
      await connectWallet();
      navigate("/register");
    } catch (err) {
      alert(err instanceof Error ? err.message : "MetaMask connection failed");
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div className="landing-page">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-badge">
          <span>Decentralized Agriculture on Ethereum Sepolia Testnet</span>
        </div>
        <h1 className="hero-title">
          Transparent. Traceable. <em>Trusted.</em>
        </h1>
        <p className="hero-subtitle">
          From Farm to Consumer, Verified. KHETCHAIN connects farmers, distributors, wholesalers,
          and retailers on the blockchain to deliver authentic, tamper-proof produce traceability.
        </p>

        <div className="hero-cta-group">
          <button
            type="button"
            onClick={handleConnectWallet}
            disabled={connecting}
            className="btn-hero-primary"
          >
            {connecting ? "Connecting..." : "Connect MetaMask"}
          </button>
          <Link to="/trace/1" className="btn-hero-secondary">
            Explore Demo Batch (QR Trace)
          </Link>
          <Link to="/fair-price" className="btn-hero-ghost">
            View Fair Price (MSP)
          </Link>
        </div>

        <a href="/docs/PS451.pdf" target="_blank" rel="noopener noreferrer" className="docs-link">
          Read Docs — Problem Statement &amp; Proposed Solution
        </a>

        <div className="hero-stats-bar">
          <div className="hero-stat-card">
            <span className="stat-number">100%</span>
            <span className="stat-text">On-Chain Provenance</span>
          </div>
          <div className="hero-stat-card">
            <span className="stat-number">Ethereum</span>
            <span className="stat-text">Sepolia Testnet (11155111)</span>
          </div>
          <div className="hero-stat-card">
            <span className="stat-number">Instant</span>
            <span className="stat-text">QR Camera Verification</span>
          </div>
          <div className="hero-stat-card">
            <span className="stat-number">Fair</span>
            <span className="stat-text">Transparent Pricing</span>
          </div>
        </div>
      </section>

      {/* Demo Workflow Section */}
      <section className="demo-callout-section">
        <div className="demo-callout-card">
          <h2>Try the Complete Demo Journey</h2>
          <p>
            Experience the full lifecycle of an <strong>Organic Tomato (Batch #1)</strong> from Nalbari, Assam
            to Mumbai Supermarket Shelf.
          </p>
          <div className="demo-buttons">
            <Link to="/trace/1" className="btn-primary">
              View Verified Batch #1 Trace
            </Link>
            <Link to="/register" className="btn-secondary">
              Register as Actor
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
