import { Router } from "express";
import { transferOwnership, updateStatus } from "../controllers/transfer.controller.js";
import { authenticate } from "../middleware/auth.js";
import { authorize } from "../middleware/authorize.js";

const router = Router();

router.post("/transfer", authenticate, authorize("dealer", "retailer"), transferOwnership);
router.post("/status", authenticate, authorize("dealer", "retailer"), updateStatus);

export default router;
