import { Router } from "express";
import { transferOwnership, updateStatus } from "../controllers/transfer.controller.js";
import { authenticate } from "../middleware/auth.js";
import { authorize } from "../middleware/authorize.js";
import { asyncHandler } from "../utils/http.js";

const router = Router();

router.post("/transfer", authenticate, authorize("dealer", "retailer"), asyncHandler(transferOwnership));
router.post("/status", authenticate, authorize("dealer", "retailer"), asyncHandler(updateStatus));

export default router;
