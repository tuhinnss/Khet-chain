import { Router } from "express";
import { getHistory } from "../controllers/batch.controller.js";
import { asyncHandler } from "../utils/http.js";

const router = Router();

router.get("/:id", asyncHandler(getHistory));

export default router;
