import { Router } from "express";
import { generateQR } from "../controllers/qr.controller.js";
import { authenticate } from "../middleware/auth.js";
import { asyncHandler } from "../utils/http.js";

const router = Router();

// Labels carry the batch's QR secret, so they're only issued to its custodians.
router.get("/:batchId", authenticate, asyncHandler(generateQR));
router.post("/:batchId", authenticate, asyncHandler(generateQR));

export default router;
