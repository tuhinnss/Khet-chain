import { Router } from "express";
import { getNonce, register, login, me, syncRole, roleStatus } from "../controllers/auth.controller.js";
import { authenticate } from "../middleware/auth.js";
import { asyncHandler } from "../utils/http.js";

const router = Router();

router.post("/nonce", asyncHandler(getNonce));
router.post("/register", asyncHandler(register));
router.post("/login", asyncHandler(login));
router.get("/me", authenticate, asyncHandler(me));
router.post("/sync-role", authenticate, asyncHandler(syncRole));
router.get("/role-status", authenticate, asyncHandler(roleStatus));

export default router;
