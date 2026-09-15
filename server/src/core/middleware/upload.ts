import multer from "multer";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";
import { config } from "../config.js";

if (!fs.existsSync(config.uploadDir)) {
  fs.mkdirSync(config.uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, config.uploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const key = `${randomUUID()}-${Date.now()}${ext}`;
    cb(null, key);
  },
});

export const upload = multer({
  storage,
  limits: {
    fileSize: config.maxFileSize,
  },
  fileFilter: (_req, file, cb) => {
    if (!config.allowedMimeTypes.includes(file.mimetype)) {
      const err = new Error("Unsupported file type. Only JPEG, PNG, WEBP, and PDF files are allowed.");
      (err as any).statusCode = 415;
      return cb(err as any);
    }
    cb(null, true);
  },
});

export const uploadSingle = upload.single("file");
