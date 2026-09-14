import { Request, Response, NextFunction } from "express";

export type Role = "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR";

export function requireRole(...allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: "Forbidden: Insufficient permissions." });
    }

    return next();
  };
}
