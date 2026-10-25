import { Router } from "express";
import { syncBatch, listBatches, getBatch, verifyBatch, getHistory } from "../controllers/batch.controller.js";
import { authenticate, optionalAuth } from "../middleware/auth.js";
import { authorize } from "../middleware/authorize.js";
import { asyncHandler } from "../utils/http.js";

const router = Router();

router.post("/", authenticate, authorize("farmer"), asyncHandler(syncBatch));
router.get("/", optionalAuth, asyncHandler(listBatches));
router.get("/:id/verify", asyncHandler(verifyBatch));
router.get("/:id/history", asyncHandler(getHistory));
router.get("/:id", optionalAuth, asyncHandler(getBatch));

export default router;
