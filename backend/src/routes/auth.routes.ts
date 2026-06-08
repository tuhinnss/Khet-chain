import { Router } from "express";
import { getNonce, register, login, me, syncRole, roleStatus } from "../controllers/auth.controller.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();

router.post("/nonce", getNonce);
router.post("/register", register);
router.post("/login", login);
router.get("/me", authenticate, me);
router.post("/sync-role", authenticate, syncRole);
router.get("/role-status", authenticate, roleStatus);

export default router;
