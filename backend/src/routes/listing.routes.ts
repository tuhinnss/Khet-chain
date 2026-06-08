import { Router } from "express";
import { createListing, getListings } from "../controllers/listing.controller.js";
import { authenticate, optionalAuth } from "../middleware/auth.js";
import { authorize } from "../middleware/authorize.js";

const router = Router();

router.post("/", authenticate, authorize("farmer"), createListing);
router.get("/", optionalAuth, getListings);

export default router;
