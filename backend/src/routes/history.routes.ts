import { Router } from "express";
import { getHistory } from "../controllers/batch.controller.js";

const router = Router();

router.get("/:id", getHistory);

export default router;
