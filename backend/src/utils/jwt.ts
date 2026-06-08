import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { AuthPayload } from "../types/index.js";

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): AuthPayload {
  return jwt.verify(token, env.JWT_SECRET) as AuthPayload;
}
