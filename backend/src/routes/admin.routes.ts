import { Router } from "express";
import { listUsers, approveUser, rejectUser } from "../controllers/admin.controller.js";
import { authenticate } from "../middleware/auth.js";
import { authorize } from "../middleware/authorize.js";
import { asyncHandler } from "../utils/http.js";

const router = Router();

router.use(authenticate, authorize("admin"));
router.get("/users", asyncHandler(listUsers));
router.post("/users/:id/approve", asyncHandler(approveUser));
router.post("/users/:id/reject", asyncHandler(rejectUser));

export default router;
