import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Navbar from "./components/common/Navbar";
import ProtectedRoute from "./components/common/ProtectedRoute";
import LandingPage from "./pages/LandingPage";
import TracePage from "./pages/TracePage";
import FairPricePage from "./pages/FairPricePage";
import FarmerDashboard from "./pages/FarmerDashboard";
import DistributorDashboard from "./pages/DistributorDashboard";
import WholesalerDashboard from "./pages/WholesalerDashboard";
import RetailerDashboard from "./pages/RetailerDashboard";
import Marketplace from "./pages/Marketplace";
import BatchDetails from "./pages/BatchDetails";
import BidManagement from "./pages/BidManagement";
import Login from "./pages/Login";
import Register from "./pages/Register";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Navbar />
        <main>
          <Routes>
            {/* Public Consumer Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/trace/:batchId" element={<TracePage />} />
            <Route path="/trace" element={<TracePage />} />
            <Route path="/verify/:batchId" element={<TracePage />} />
            <Route path="/verify" element={<TracePage />} />
            <Route path="/fair-price" element={<FairPricePage />} />
            <Route path="/marketplace" element={<Marketplace />} />
            <Route path="/batch/:id" element={<BatchDetails />} />

            {/* Auth Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Role-Protected Supply Chain Actor Dashboards */}
            <Route
              path="/farmer"
              element={
                <ProtectedRoute roles={["farmer"]}>
                  <FarmerDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/distributor"
              element={
                <ProtectedRoute roles={["distributor", "dealer"]}>
                  <DistributorDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dealer"
              element={
                <ProtectedRoute roles={["dealer", "distributor"]}>
                  <DistributorDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/wholesaler"
              element={
                <ProtectedRoute roles={["wholesaler"]}>
                  <WholesalerDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/retailer"
              element={
                <ProtectedRoute roles={["retailer"]}>
                  <RetailerDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/bids"
              element={
                <ProtectedRoute roles={["farmer"]}>
                  <BidManagement />
                </ProtectedRoute>
              }
            />
          </Routes>
        </main>
      </BrowserRouter>
    </AuthProvider>
  );
}
