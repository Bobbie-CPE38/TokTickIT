import path from "path";

try {
  process.loadEnvFile?.();
} catch {}

export const config = {
  port: parseInt(process.env.PORT || "3000", 10),
  databaseUrl: process.env.DATABASE_URL || "",
  jwtSecret: process.env.JWT_SECRET || "toktickit-secret-key-cpe334-2026",
  tokenExpiresIn: "8h",
  uploadDir: path.resolve(process.env.UPLOAD_DIR || "uploads"),
  maxFileSize: 5 * 1024 * 1024, // 5 MB per Lab 2 specification
  allowedMimeTypes: [
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
  ],
};
