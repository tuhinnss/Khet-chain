import { Router } from "express";
import { getStats } from "../controllers/dashboard.controller.js";
import { authenticate } from "../middleware/auth.js";
import { asyncHandler } from "../utils/http.js";

const router = Router();

router.get("/stats", authenticate, asyncHandler(getStats));

export default router;
