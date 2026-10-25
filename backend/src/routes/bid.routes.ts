import { Router } from "express";
import { placeBid, acceptBid, getBidsForBatch } from "../controllers/bid.controller.js";
import { authenticate } from "../middleware/auth.js";
import { authorize } from "../middleware/authorize.js";
import { asyncHandler } from "../utils/http.js";

const router = Router();

// The contract accepts bids from both DEALER_ROLE and DISTRIBUTOR_ROLE.
router.post("/", authenticate, authorize("dealer", "distributor"), asyncHandler(placeBid));
router.post("/accept", authenticate, authorize("farmer"), asyncHandler(acceptBid));
router.get("/:batchId", authenticate, authorize("farmer"), asyncHandler(getBidsForBatch));

export default router;
