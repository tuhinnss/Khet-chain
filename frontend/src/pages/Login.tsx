import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getNonce, login } from "../api/auth.api";
import { useAuth } from "../context/AuthContext";
import { connectWallet, signMessage } from "../hooks/useWallet";
import { getErrorMessage } from "../utils/errors";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
      const { token, user } = await login({ email, password, walletAddress, signature, message });
      setSession(token, user);
      navigate(user.role === "farmer" ? "/farmer" : user.role === "dealer" ? "/dealer" : "/retailer");
    } catch (err) {
      setError(getErrorMessage(err, "Login failed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Welcome back</h1>
        <p className="subtitle">Sign in with email + MetaMask message signature. Your on-chain role is synced automatically on login.</p>
        <form onSubmit={handleSubmit} className="form">
          <label>
            Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label>
            Password
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>
          {error && <p className="error-text">{error}</p>}
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "Connecting MetaMask…" : "Login with MetaMask"}
          </button>
        </form>
        <p className="auth-footer">
          New here? <Link to="/register">Create account</Link>
        </p>
      </div>
    </div>
  );
}
