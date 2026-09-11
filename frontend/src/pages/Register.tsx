import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getNonce, register } from "../api/auth.api";
import { useAuth } from "../context/AuthContext";
import { connectWallet, signMessage, ensurePolygonAmoyNetwork } from "../hooks/useWallet";
import { UserRole } from "../types";
import { getErrorMessage } from "../utils/errors";

export default function Register() {
  const [form, setForm] = useState({
    email: "",
    password: "",
    name: "",
    role: "farmer" as UserRole,
    businessName: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { setSession } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await ensurePolygonAmoyNetwork();
      const walletAddress = await connectWallet();
      const { message } = await getNonce(walletAddress);
      const signature = await signMessage(message);
      const { token, user } = await register({
        email: form.email,
        password: form.password,
        name: form.name,
        role: form.role,
        businessName: form.businessName || undefined,
        walletAddress,
        signature,
        message,
      });
      setSession(token, user);

      // Route by role
      if (user.role === "farmer") navigate("/farmer");
      else if (user.role === "distributor" || user.role === "dealer") navigate("/distributor");
      else if (user.role === "wholesaler") navigate("/wholesaler");
      else if (user.role === "retailer") navigate("/retailer");
      else navigate("/");
    } catch (err) {
      setError(getErrorMessage(err, "Registration failed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Join KHETCHAIN</h1>
        <p className="subtitle">
          Connect MetaMask and select your role in the farm-to-consumer agricultural supply chain
        </p>

        <form onSubmit={handleSubmit} className="form">
          <label>
            Full Name / Contact Person *
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Ramu Sharma"
              required
            />
          </label>
          <label>
            Email Address *
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="name@farm.com"
              required
            />
          </label>
          <label>
            Password *
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          </label>
          <label>
            Supply Chain Actor Role *
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
            >
              <option value="farmer">🌱 Farmer / Producer</option>
              <option value="distributor">🚛 Distributor / Logistics Trader</option>
              <option value="wholesaler">🏪 Wholesaler / Mandi Operator</option>
              <option value="retailer">🛒 Retailer / Supermarket</option>
            </select>
          </label>
          <label>
            Business / Farm / Store Name (optional)
            <input
              value={form.businessName}
              onChange={(e) => setForm({ ...form, businessName: e.target.value })}
              placeholder="e.g. Assam Organic Producers FPO"
            />
          </label>

          {error && <p className="error-text">{error}</p>}

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "Signing with MetaMask..." : "🦊 Connect Wallet & Register"}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account? <Link to="/login">Login with Wallet</Link>
        </p>
      </div>
    </div>
  );
}
