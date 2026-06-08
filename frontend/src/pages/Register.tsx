import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getNonce, register } from "../api/auth.api";
import { useAuth } from "../context/AuthContext";
import { connectWallet, signMessage } from "../hooks/useWallet";
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
      navigate(user.role === "farmer" ? "/farmer" : user.role === "dealer" ? "/dealer" : "/retailer");
    } catch (err) {
      setError(getErrorMessage(err, "Registration failed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Join KhetChain</h1>
        <p className="subtitle">Create your account — MetaMask will ask you to <strong>sign a message only</strong> (free, no gas)</p>
        <p className="error-text" style={{ marginBottom: "1rem" }}>
          If MetaMask shows a <strong>transaction</strong> called <code>grantUserRole</code>, reject it. That is not part of signup. On-chain roles are granted automatically when you <strong>log in</strong>.
        </p>
        <form onSubmit={handleSubmit} className="form">
          <label>
            Name
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </label>
          <label>
            Email
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </label>
          <label>
            Password
            <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          </label>
          <label>
            Role
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}>
              <option value="farmer">Farmer</option>
              <option value="dealer">Dealer</option>
              <option value="retailer">Retailer</option>
            </select>
          </label>
          <label>
            Business name (optional)
            <input value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} />
          </label>
          {error && <p className="error-text">{error}</p>}
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "Waiting for MetaMask…" : "Sign message & register"}
          </button>
        </form>
        <p className="auth-footer">
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </div>
    </div>
  );
}
