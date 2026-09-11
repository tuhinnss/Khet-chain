import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes.js";
import batchRoutes from "./routes/batch.routes.js";
import listingRoutes from "./routes/listing.routes.js";
import bidRoutes from "./routes/bid.routes.js";
import transferRoutes from "./routes/transfer.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import historyRoutes from "./routes/history.routes.js";
import supplyChainRoutes from "./routes/supplychain.routes.js";
import qrRoutes from "./routes/qr.routes.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { env } from "./config/env.js";

const app = express();

const allowedOrigins = [
  env.FRONTEND_URL,
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:3000",
];
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== "production") {
        callback(null, true);
      } else {
        callback(null, true); // Permissive for local MVP and testnet demo
      }
    },
    credentials: true,
  })
);
app.use(express.json());

const NETWORK_NAMES: Record<number, string> = {
  11155111: "Ethereum Sepolia",
  80002: "Polygon Amoy",
  31337: "Hardhat Local",
};

app.get("/health", (_req, res) =>
  res.json({
    ok: true,
    name: "KhetChain Backend API",
    network: NETWORK_NAMES[env.CHAIN_ID] || `Chain ${env.CHAIN_ID}`,
    chainId: env.CHAIN_ID,
  })
);

// API routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/batch", batchRoutes);
app.use("/api/v1/batches", batchRoutes);
app.use("/api/v1/supplychain", supplyChainRoutes);
app.use("/api/v1/qr", qrRoutes);
app.use("/api/v1/listing", listingRoutes);
app.use("/api/v1/bid", bidRoutes);
app.use("/api/v1", transferRoutes);
app.use("/api/v1/history", historyRoutes);
app.use("/api/v1/dashboard", dashboardRoutes);

// Convenience aliases for direct root API calls
app.use("/api/batches", batchRoutes);
app.use("/api/qr", qrRoutes);
app.use("/api/supplychain", supplyChainRoutes);
app.use("/api/users", authRoutes);

app.use(errorHandler);

export default app;
