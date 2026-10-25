import { Router } from "express";
import { createListing, getListings } from "../controllers/listing.controller.js";
import { authenticate, optionalAuth } from "../middleware/auth.js";
import { authorize } from "../middleware/authorize.js";
import { asyncHandler } from "../utils/http.js";

const router = Router();

router.post("/", authenticate, authorize("farmer"), asyncHandler(createListing));
router.get("/", optionalAuth, asyncHandler(getListings));

export default router;
