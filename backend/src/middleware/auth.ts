import { Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt.js";
import { AuthRequest } from "../types/index.js";

export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ success: false, error: { message: "Unauthorized" } });
    return;
  }

  try {
    const token = header.slice(7);
    req.user = verifyToken(token);
    next();
  } catch {
    res.status(401).json({ success: false, error: { message: "Invalid token" } });
  }
}

export function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    try {
      req.user = verifyToken(header.slice(7));
    } catch {
      // ignore invalid token for public routes
    }
  }
  next();
}
