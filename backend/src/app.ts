import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes.js";
import batchRoutes from "./routes/batch.routes.js";
import listingRoutes from "./routes/listing.routes.js";
import bidRoutes from "./routes/bid.routes.js";
import transferRoutes from "./routes/transfer.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import historyRoutes from "./routes/history.routes.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { env } from "./config/env.js";

const app = express();

const allowedOrigins = [
  env.FRONTEND_URL,
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS blocked: ${origin}`));
      }
    },
    credentials: true,
  })
);
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/batch", batchRoutes);
app.use("/api/v1/listing", listingRoutes);
app.use("/api/v1/bid", bidRoutes);
app.use("/api/v1", transferRoutes);
app.use("/api/v1/history", historyRoutes);
app.use("/api/v1/dashboard", dashboardRoutes);

app.use(errorHandler);

export default app;
