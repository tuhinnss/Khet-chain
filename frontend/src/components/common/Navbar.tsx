import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const dashboardPath =
    user?.role === "farmer"
      ? "/farmer"
      : user?.role === "dealer"
        ? "/dealer"
        : user?.role === "retailer"
          ? "/retailer"
          : "/";

  return (
    <nav className="navbar">
      <Link to="/" className="brand">
        <span className="brand-mark">◈</span> KhetChain
      </Link>
      <div className="nav-links">
        <Link to="/verify">Verify</Link>
        <Link to="/marketplace">Marketplace</Link>
        {user ? (
          <>
            <Link to={dashboardPath}>Dashboard</Link>
            <button
              className="btn-ghost"
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
      </div>
    </nav>
  );
}
