import { Request, Response, NextFunction } from "express";
import fs from "fs";
import multer from "multer";
import { uploadSingle } from "../../core/middleware/upload.js";
import { resolveRequester } from "../../core/middleware/authenticate.js";
import * as attachmentsService from "./attachments.service.js";

export function uploadAttachment(req: Request, res: Response, next: NextFunction): void {
  uploadSingle(req, res, async (uploadErr) => {
    try {
      const requesterResolution = await resolveRequester(req);
      if (requesterResolution === "unauthorized") {
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        res.status(401).json({ error: "Unauthorized: Missing authentication credentials." });
        return;
      }
      if (requesterResolution === "inactive") {
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        res.status(403).json({ error: "Forbidden: Requester is inactive or does not exist." });
        return;
      }

      const ticketId = parseInt(req.params.id, 10);
      if (isNaN(ticketId)) {
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        res.status(400).json({ error: "Invalid ticket ID provided." });
        return;
      }

      if (uploadErr) {
        if (uploadErr instanceof multer.MulterError) {
          if (uploadErr.code === "LIMIT_FILE_SIZE") {
            res.status(413).json({ error: "File size exceeds the 5 MB limit." });
            return;
          }
          res.status(400).json({ error: uploadErr.message });
          return;
        }
        if ((uploadErr as any).statusCode === 415) {
          res.status(415).json({ error: uploadErr.message });
          return;
        }
        res.status(400).json({ error: uploadErr.message || "File upload failed." });
        return;
      }

      const result = await attachmentsService.uploadAttachment(ticketId, req.file, requesterResolution);
      res.status(201).json(result);
    } catch (error) {
      if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      next(error);
    }
  });
}

export async function downloadAttachment(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const requesterResolution = await resolveRequester(req);
    if (requesterResolution === "unauthorized") {
      res.status(401).json({ error: "Unauthorized: Missing authentication credentials." });
      return;
    }
    if (requesterResolution === "inactive") {
      res.status(403).json({ error: "Forbidden: Requester is inactive or does not exist." });
      return;
    }

    const attachmentId = parseInt(req.params.id, 10);
    if (isNaN(attachmentId)) {
      res.status(400).json({ error: "Invalid attachment ID provided." });
      return;
    }

    const { attachment, filePath } = await attachmentsService.getAttachmentDownload(
      attachmentId,
      requesterResolution
    );

    res.setHeader("Content-Type", attachment.mimeType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(attachment.originalFileName)}"`
    );
    res.setHeader("Content-Length", attachment.fileSize);

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  } catch (error) {
    next(error);
  }
}

export async function softRemoveAttachment(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const requesterResolution = await resolveRequester(req);
    if (requesterResolution === "unauthorized") {
      res.status(401).json({ error: "Unauthorized: Missing authentication credentials." });
      return;
    }
    if (requesterResolution === "inactive") {
      res.status(403).json({ error: "Forbidden: Requester is inactive or does not exist." });
      return;
    }

    const attachmentId = parseInt(req.params.id, 10);
    if (isNaN(attachmentId)) {
      res.status(400).json({ error: "Invalid attachment ID provided." });
      return;
    }

    const { removalReason } = req.body ?? {};
    const result = await attachmentsService.softRemoveAttachment(
      attachmentId,
      removalReason,
      requesterResolution
    );
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}
