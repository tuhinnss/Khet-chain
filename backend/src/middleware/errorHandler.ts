import { Request, Response, NextFunction } from "express";
import { HttpError } from "../utils/http.js";

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof HttpError) {
    res.status(err.status).json({ success: false, error: { message: err.message } });
    return;
  }

  console.error(err);
  const message =
    process.env.NODE_ENV === "production" ? "Internal server error" : err.message || "Internal server error";
  res.status(500).json({ success: false, error: { message } });
}
