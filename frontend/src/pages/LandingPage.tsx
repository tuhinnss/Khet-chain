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
          <span>🌿 Decentralized Agriculture on Ethereum Sepolia Testnet</span>
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
            {connecting ? "Connecting..." : "🦊 Connect MetaMask"}
          </button>
          <Link to="/trace/1" className="btn-hero-secondary">
            🔍 Explore Demo Batch (QR Trace)
          </Link>
          <Link to="/fair-price" className="btn-hero-ghost">
            📊 View Fair Price (MSP)
          </Link>
        </div>

        <div className="hero-stats-bar">
          <div className="hero-stat-card">
            <span className="stat-number">100%</span>
            <span className="stat-text">On-Chain Provenance</span>
          </div>
          <div className="hero-stat-card">
            <span className="stat-number">Polygon</span>
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

      {/* How It Works Flow */}
      <section className="how-it-works-section">
        <div className="section-header center">
          <h2>How It Works</h2>
          <p className="subtitle">Every step in the agricultural supply chain is recorded on-chain</p>
        </div>

        <div className="supply-chain-flow-grid">
          <div className="flow-step-card">
            <div className="flow-step-number">1</div>
            <div className="flow-step-icon">🌱</div>
            <h3>Farmer</h3>
            <p>Harvests produce, registers batch on-chain with location, certification, and asking price.</p>
          </div>

          <div className="flow-arrow">→</div>

          <div className="flow-step-card">
            <div className="flow-step-number">2</div>
            <div className="flow-step-icon">🚛</div>
            <h3>Distributor</h3>
            <p>Purchases batch, logs temperature-controlled transit, and updates initial quality check.</p>
          </div>

          <div className="flow-arrow">→</div>

          <div className="flow-step-card">
            <div className="flow-step-number">3</div>
            <div className="flow-step-icon">🏪</div>
            <h3>Wholesaler</h3>
            <p>Receives cargo at mandi/hub, conducts storage quality audit, and transfers custody.</p>
          </div>

          <div className="flow-arrow">→</div>

          <div className="flow-step-card">
            <div className="flow-step-number">4</div>
            <div className="flow-step-icon">🛒</div>
            <h3>Retailer</h3>
            <p>Performs final quality inspection, lists in inventory, and prints public QR code labels.</p>
          </div>

          <div className="flow-arrow">→</div>

          <div className="flow-step-card consumer-step">
            <div className="flow-step-number">5</div>
            <div className="flow-step-icon">🍽️</div>
            <h3>Consumer</h3>
            <p>Scans QR on fruit/vegetable with phone camera. Views complete authentic journey without wallet.</p>
          </div>
        </div>
      </section>

      {/* Core Features */}
      <section className="features-section">
        <div className="section-header center">
          <h2>Core Capabilities</h2>
          <p className="subtitle">Enterprise-grade Web3 features tailored for agriculture</p>
        </div>

        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">⛓️</div>
            <h3>Immutable Traceability</h3>
            <p>All supply chain events are recorded directly on Ethereum Sepolia testnet. Past records cannot be altered or deleted.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">💰</div>
            <h3>Transparent Pricing</h3>
            <p>Track markups at each stage from farm gate to retail shelf, promoting fair margins for farmers and consumers.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">🛡️</div>
            <h3>Quality Verification</h3>
            <p>Checkpoints record quality status (GOOD, MEDIUM, BAD), storage conditions, and cold chain temperature logs.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">📱</div>
            <h3>QR-Based Verification</h3>
            <p>Consumers simply scan the retail QR code with any smartphone camera — no wallet or Web3 knowledge required.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">👨‍🌾</div>
            <h3>Farmer Empowerment</h3>
            <p>Simplified dashboard designed for low digital friction. Direct listing and escrow bidding ensure prompt payment.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">🚫</div>
            <h3>Fraud & Counterfeit Reduction</h3>
            <p>Cryptographic QR hashing ensures counterfeit produce or invalid batches are immediately flagged.</p>
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
