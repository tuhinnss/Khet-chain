import { Response, NextFunction } from "express";
import { AuthRequest, UserRole } from "../types/index.js";

export function authorize(...roles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: { message: "Unauthorized" } });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ success: false, error: { message: "Forbidden" } });
      return;
    }
    next();
  };
}
