import fs from "fs";
import path from "path";
import { getPrisma } from "../../prisma.js";
import { config } from "../../core/config.js";
import { AuthUser } from "../../core/tokens.js";
import {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
  ConflictError,
  GoneError,
  UnprocessableEntityError,
} from "../../core/errors.js";

export async function uploadAttachment(
  ticketId: number,
  file: Express.Multer.File | undefined,
  user: AuthUser
) {
  if (!file) {
    throw new BadRequestError("No file provided in form data.");
  }

  const prisma = getPrisma();
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
  });

  if (!ticket) {
    if (file.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
    throw new NotFoundError("Ticket not found.");
  }

  // Requesters can only attach to their own tickets (IT Staff/Admin can attach to any per BR-23)
  if (user.role === "REQUESTER" && ticket.requesterId !== user.id) {
    if (file.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
    throw new NotFoundError("Ticket not found.");
  }

  const activeCount = await prisma.attachment.count({
    where: { ticketId, isRemoved: false },
  });

  if (activeCount >= 5) {
    if (file.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
    throw new UnprocessableEntityError("Validation failed", [
      "A ticket may have at most 5 active attachments.",
    ]);
  }

  const attachment = await prisma.attachment.create({
    data: {
      ticketId,
      originalFileName: file.originalname,
      storageKey: file.filename,
      fileSize: file.size,
      mimeType: file.mimetype,
      uploadedByUserId: user.id,
      isRemoved: false,
    },
  });

  return {
    id: attachment.id,
    ticketId: attachment.ticketId,
    originalFileName: attachment.originalFileName,
    fileSize: attachment.fileSize,
    mimeType: attachment.mimeType,
    isRemoved: attachment.isRemoved,
    createdAt: attachment.createdAt.toISOString(),
  };
}

export async function getAttachmentDownload(
  attachmentId: number,
  user: AuthUser
) {
  const prisma = getPrisma();
  const attachment = await prisma.attachment.findUnique({
    where: { id: attachmentId },
    include: { ticket: true },
  });

  if (!attachment) {
    throw new NotFoundError("Attachment not found.");
  }

  if (user.role === "REQUESTER" && attachment.ticket.requesterId !== user.id) {
    throw new NotFoundError("Attachment not found.");
  }

  if (attachment.isRemoved) {
    throw new GoneError("Attachment has been removed and is no longer available for download.");
  }

  const filePath = path.join(config.uploadDir, attachment.storageKey);
  if (!fs.existsSync(filePath)) {
    throw new NotFoundError("File not found on disk.");
  }

  return {
    attachment,
    filePath,
  };
}

export async function softRemoveAttachment(
  attachmentId: number,
  removalReason: string | undefined,
  user: AuthUser
) {
  const trimmedReason = typeof removalReason === "string" ? removalReason.trim() : "";

  if (!trimmedReason || trimmedReason.length < 3 || trimmedReason.length > 255) {
    throw new UnprocessableEntityError("Validation failed", [
      "Removal reason is required and must be between 3 and 255 characters.",
    ]);
  }

  const prisma = getPrisma();
  const attachment = await prisma.attachment.findUnique({
    where: { id: attachmentId },
    include: { ticket: true },
  });

  if (!attachment) {
    throw new NotFoundError("Attachment not found.");
  }

  if (user.role === "REQUESTER" && attachment.ticket.requesterId !== user.id) {
    throw new NotFoundError("Attachment not found.");
  }

  if (attachment.isRemoved) {
    throw new ConflictError("Attachment is already removed.");
  }

  const updated = await prisma.attachment.update({
    where: { id: attachmentId },
    data: {
      isRemoved: true,
      removedAt: new Date(),
      removalReason: trimmedReason,
    },
  });

  return {
    id: updated.id,
    ticketId: updated.ticketId,
    originalFileName: updated.originalFileName,
    isRemoved: updated.isRemoved,
    removedAt: updated.removedAt?.toISOString(),
    removalReason: updated.removalReason,
  };
}
