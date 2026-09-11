import { Router } from "express";
import { addSupplyChainEvent, getSupplyChainEvents } from "../controllers/supplychain.controller.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();

router.post("/event", authenticate, addSupplyChainEvent);
router.post("/events", authenticate, addSupplyChainEvent);
router.get("/:batchId", getSupplyChainEvents);

export default router;
