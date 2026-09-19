import { Request, Response, NextFunction } from "express";
import multer from "multer";
import { ApiError } from "../errors.js";

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (res.headersSent) {
    return;
  }

  if (err instanceof ApiError) {
    res.status(err.statusCode).json({
      error: err.message,
      ...(err.details && err.details.length > 0 ? { details: err.details } : {}),
    });
    return;
  }

  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      res.status(413).json({ error: "File size exceeds the 5 MB limit." });
      return;
    }
    res.status(400).json({ error: err.message });
    return;
  }

  if (err && typeof err === "object" && err.statusCode === 415) {
    res.status(415).json({ error: err.message });
    return;
  }

  console.error("[Unhandled Error]:", err);
  const status = typeof err?.statusCode === "number" ? err.statusCode : 500;
  const message = err?.message || "Internal server error";
  res.status(status).json({ error: message });
}
