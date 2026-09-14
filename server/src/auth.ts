import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { Request, Response, NextFunction } from "express";
import { getPrisma } from "./prisma.js";

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

const JWT_SECRET = process.env.JWT_SECRET || "toktickit-secret-key-cpe334-2026";
const TOKEN_EXPIRES_IN = "8h";

// Server-side token invalidation blocklist (BR-08)
const tokenBlocklist = new Set<string>();

export function blocklistToken(token: string): void {
  tokenBlocklist.add(token);
}

export function isTokenBlocklisted(token: string): boolean {
  return tokenBlocklist.has(token);
}

export function generateToken(user: AuthUser): string {
  const payload: JwtTokenPayload = {
    id: user.id,
    email: user.email,
    role: user.role,
    mustChangePassword: user.mustChangePassword,
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRES_IN });
}

export function verifyToken(token: string): JwtTokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtTokenPayload;
  } catch {
    return null;
  }
}

/**
 * Validates password complexity per BR-07:
 * Minimum 8 characters, containing uppercase, lowercase, numeric digit, and special character.
 */
export function validatePasswordComplexity(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!password || password.length < 8) {
    errors.push("Must be at least 8 characters");
  }

  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  if (!hasUpper || !hasLower) {
    errors.push("Must include upper and lower case letters");
  }

  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password);
  if (!hasNumber || !hasSpecial) {
    errors.push("Must include a number and special character");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Authentication middleware:
 * Extracts Bearer token from Authorization header.
 * Validates token signature, expiration, and blocklist.
 * Validates active account status per BR-01 and BR-21.
 * Provides fallback to legacy X-Requester-Id for Lab 2 test compatibility.
 */
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7).trim();

    if (!token || isTokenBlocklisted(token)) {
      return res.status(401).json({ error: "Invalid or expired token." });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ error: "Invalid or expired token." });
    }

    const prisma = getPrisma();
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        mustChangePassword: true,
      },
    });

    if (!user) {
      return res.status(401).json({ error: "User not found." });
    }

    if (!user.isActive) {
      return res.status(403).json({
        error: "Account is inactive. Please contact your system administrator.",
      });
    }

    req.user = user as AuthUser;
    req.token = token;
    return next();
  }

  // Fallback for Lab 2 test suite compatibility
  const requesterIdHeader = req.headers["x-requester-id"];
  if (requesterIdHeader) {
    const requesterId = parseInt(String(requesterIdHeader), 10);
    if (isNaN(requesterId)) {
      return res.status(401).json({ error: "Unauthorized: Invalid X-Requester-Id header." });
    }

    const prisma = getPrisma();
    const user = await prisma.user.findUnique({
      where: { id: requesterId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        mustChangePassword: true,
      },
    });

    if (!user || !user.isActive) {
      return res.status(403).json({ error: "Forbidden: Requester is inactive or does not exist." });
    }

    req.user = user as AuthUser;
    return next();
  }

  return res.status(401).json({ error: "Missing or invalid authentication token." });
}
