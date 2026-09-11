import { Router } from "express";
import { generateQR } from "../controllers/qr.controller.js";

const router = Router();

router.get("/:batchId", generateQR);
router.post("/:batchId", generateQR);

export default router;
