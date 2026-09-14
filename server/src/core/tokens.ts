import jwt from "jsonwebtoken";
import { config } from "./config.js";

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  role: "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR";
  isActive: boolean;
  mustChangePassword: boolean;
}

export interface JwtTokenPayload {
  id: number;
  email: string;
  role: "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR";
  mustChangePassword: boolean;
  iat?: number;
  exp?: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      token?: string;
    }
  }
}

// Server-side token invalidation blocklist (BR-08)
const tokenBlocklist = new Set<string>();

export function blocklistToken(token: string): void {
  tokenBlocklist.add(token);
}

export function isTokenBlocklisted(token: string): boolean {
  return tokenBlocklist.has(token);
}

export function clearTokenBlocklist(): void {
  tokenBlocklist.clear();
}

export function generateToken(user: AuthUser): string {
  const payload: JwtTokenPayload = {
    id: user.id,
    email: user.email,
    role: user.role,
    mustChangePassword: user.mustChangePassword,
  };
  return jwt.sign(payload, config.jwtSecret, { expiresIn: config.tokenExpiresIn as any });
}

export function verifyToken(token: string): JwtTokenPayload | null {
  try {
    return jwt.verify(token, config.jwtSecret) as JwtTokenPayload;
  } catch {
    return null;
  }
}
