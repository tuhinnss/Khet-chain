import { Router } from "express";
import { placeBid, acceptBid, getBidsForBatch } from "../controllers/bid.controller.js";
import { authenticate } from "../middleware/auth.js";
import { authorize } from "../middleware/authorize.js";

const router = Router();

router.post("/", authenticate, authorize("dealer"), placeBid);
router.post("/accept", authenticate, authorize("farmer"), acceptBid);
router.get("/:batchId", authenticate, authorize("farmer"), getBidsForBatch);

export default router;
