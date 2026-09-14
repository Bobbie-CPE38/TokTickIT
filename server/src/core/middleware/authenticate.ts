import { Request, Response, NextFunction } from "express";
import { AuthUser, verifyToken, isTokenBlocklisted } from "../tokens.js";
import { getPrisma } from "../../prisma.js";

/**
 * Resolves requesting user identity from Bearer token or legacy X-Requester-Id header.
 * Supports Lab 2 tests that rely on X-Requester-Id header.
 */
export async function resolveRequester(
  req: Request
): Promise<AuthUser | null | "inactive" | "unauthorized"> {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7).trim();
    if (!token || isTokenBlocklisted(token)) return "unauthorized";
    const decoded = verifyToken(token);
    if (!decoded) return "unauthorized";

    const user = await getPrisma().user.findUnique({
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
    if (!user) return "unauthorized";
    if (!user.isActive) return "inactive";
    return user as AuthUser;
  }

  const requesterIdHeader = req.headers["x-requester-id"];
  if (requesterIdHeader) {
    const requesterId = parseInt(String(requesterIdHeader), 10);
    if (isNaN(requesterId)) return "unauthorized";

    const user = await getPrisma().user.findUnique({
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
    if (!user || !user.isActive) return "inactive";
    return user as AuthUser;
  }

  return "unauthorized";
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
