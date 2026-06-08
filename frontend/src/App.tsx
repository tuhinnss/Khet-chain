import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Navbar from "./components/common/Navbar";
import ProtectedRoute from "./components/common/ProtectedRoute";
import Login from "./pages/Login";
import Register from "./pages/Register";
import FarmerDashboard from "./pages/FarmerDashboard";
import DealerDashboard from "./pages/DealerDashboard";
import RetailerDashboard from "./pages/RetailerDashboard";
import ConsumerVerify from "./pages/ConsumerVerify";
import BatchDetails from "./pages/BatchDetails";
import Marketplace from "./pages/Marketplace";
import BidManagement from "./pages/BidManagement";

function Home() {
  return (
    <div className="hero">
      <h1>Transparent agriculture,<br /><em>from farm to fork</em></h1>
      <p>Register produce on-chain, trade through dealers and retailers, and let consumers verify every step with a QR scan.</p>
      <div className="hero-actions">
        <a href="/register" className="btn-primary">Get Started</a>
        <a href="/verify" className="btn-secondary">Verify Produce</a>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Navbar />
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/verify" element={<ConsumerVerify />} />
            <Route path="/verify/:batchId" element={<ConsumerVerify />} />
            <Route path="/marketplace" element={<Marketplace />} />
            <Route path="/batch/:id" element={<BatchDetails />} />
            <Route path="/farmer" element={<ProtectedRoute roles={["farmer"]}><FarmerDashboard /></ProtectedRoute>} />
            <Route path="/dealer" element={<ProtectedRoute roles={["dealer"]}><DealerDashboard /></ProtectedRoute>} />
            <Route path="/retailer" element={<ProtectedRoute roles={["retailer"]}><RetailerDashboard /></ProtectedRoute>} />
            <Route path="/bids" element={<ProtectedRoute roles={["farmer"]}><BidManagement /></ProtectedRoute>} />
          </Routes>
        </main>
      </BrowserRouter>
    </AuthProvider>
  );
}
