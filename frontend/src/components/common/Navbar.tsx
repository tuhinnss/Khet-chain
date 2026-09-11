import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import WalletButton from "./WalletButton";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const getDashboardPath = () => {
    if (!user) return "/login";
    switch (user.role) {
      case "farmer":
        return "/farmer";
      case "distributor":
      case "dealer":
        return "/distributor";
      case "wholesaler":
        return "/wholesaler";
      case "retailer":
        return "/retailer";
      default:
        return "/";
    }
  };

  return (
    <nav className="navbar">
      <div className="navbar-brand-group">
        <Link to="/" className="brand">
          <span className="brand-mark">K</span>
          <span className="brand-name">KHETCHAIN</span>
        </Link>
        <span className="network-pill-header">Ethereum Sepolia</span>
      </div>

      <div className="nav-links">
        <Link to="/">Home</Link>
        <Link to="/trace/1">Trace Batch</Link>
        <Link to="/marketplace">Marketplace</Link>
        <Link to="/fair-price">Fair Price (MSP)</Link>

        {user ? (
          <>
            <Link to={getDashboardPath()} className="nav-dashboard-link">
              Dashboard ({user.role.toUpperCase()})
            </Link>
            <button
              type="button"
              className="btn-ghost-sm"
              onClick={() => {
                logout();
                navigate("/login");
              }}
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login">Login</Link>
            <Link to="/register" className="btn-primary-sm">
              Register
            </Link>
          </>
        )}

        <WalletButton />
      </div>
    </nav>
  );
}
