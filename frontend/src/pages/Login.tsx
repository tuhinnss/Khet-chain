import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getNonce, login } from "../api/auth.api";
import { useAuth } from "../context/AuthContext";
import { connectWallet, signMessage, ensurePolygonAmoyNetwork } from "../hooks/useWallet";
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
      await ensurePolygonAmoyNetwork();
      const walletAddress = await connectWallet();
      const { message } = await getNonce(walletAddress);
      const signature = await signMessage(message);
      const { token, user } = await login({ email, password, walletAddress, signature, message });
      setSession(token, user);

      if (user.role === "farmer") navigate("/farmer");
      else if (user.role === "distributor" || user.role === "dealer") navigate("/distributor");
      else if (user.role === "wholesaler") navigate("/wholesaler");
      else if (user.role === "retailer") navigate("/retailer");
      else navigate("/");
    } catch (err) {
      setError(getErrorMessage(err, "Login failed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Welcome Back to KHETCHAIN</h1>
        <p className="subtitle">
          Sign in with your email and sign the authentication message in MetaMask
        </p>

        <form onSubmit={handleSubmit} className="form">
          <label>
            Email Address *
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@farm.com"
              required
            />
          </label>
          <label>
            Password *
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>

          {error && <p className="error-text">{error}</p>}

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "Authenticating with MetaMask..." : "🦊 Sign In with MetaMask"}
          </button>
        </form>

        <p className="auth-footer">
          Don't have an account yet? <Link to="/register">Create Account</Link>
        </p>
      </div>
    </div>
  );
}
