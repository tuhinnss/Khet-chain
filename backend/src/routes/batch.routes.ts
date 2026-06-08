import { Router } from "express";
import { syncBatch, listBatches, getBatch, verifyBatch } from "../controllers/batch.controller.js";
import { authenticate, optionalAuth } from "../middleware/auth.js";
import { authorize } from "../middleware/authorize.js";

const router = Router();

router.post("/", authenticate, authorize("farmer"), syncBatch);
router.get("/", authenticate, listBatches);
router.get("/:id/verify", verifyBatch);
router.get("/:id", optionalAuth, getBatch);

export default router;
