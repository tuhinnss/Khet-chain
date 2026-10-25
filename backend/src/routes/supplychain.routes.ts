import { Router } from "express";
import { addSupplyChainEvent, getSupplyChainEvents } from "../controllers/supplychain.controller.js";
import { authenticate } from "../middleware/auth.js";
import { asyncHandler } from "../utils/http.js";

const router = Router();

router.post("/event", authenticate, asyncHandler(addSupplyChainEvent));
router.post("/events", authenticate, asyncHandler(addSupplyChainEvent));
router.get("/:batchId", asyncHandler(getSupplyChainEvents));

export default router;
