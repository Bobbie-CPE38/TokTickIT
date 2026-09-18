import { getPrisma } from "../../prisma.js";
import { AuthUser } from "../../core/tokens.js";
import {
  ForbiddenError,
  NotFoundError,
  UnprocessableEntityError,
} from "../../core/errors.js";
import {
  validateCommentInput,
  validateNoteInput,
} from "./comments-notes.validation.js";

export async function fetchPublicComments(ticketId: number, user: AuthUser) {
  const prisma = getPrisma();

  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: { id: true, requesterId: true },
  });

  if (!ticket) {
    throw new NotFoundError("Ticket not found.");
  }

  // Requester ownership isolation: cross-requester query returns 404 (anti-leakage)
  if (user.role === "REQUESTER" && ticket.requesterId !== user.id) {
    throw new NotFoundError("Ticket not found.");
  }

  const comments = await prisma.publicComment.findMany({
    where: { ticketId },
    orderBy: { createdAt: "asc" },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          role: true,
        },
      },
    },
  });

  return comments;
}

export async function createPublicComment(
  ticketId: number,
  input: unknown,
  user: AuthUser
) {
  const validation = validateCommentInput(input);
  if (!validation.isValid) {
    throw new UnprocessableEntityError("Validation failed", validation.details);
  }

  const prisma = getPrisma();

  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: { id: true, requesterId: true },
  });

  if (!ticket) {
    throw new NotFoundError("Ticket not found.");
  }

  // Requester ownership isolation: cross-requester comment attempt returns 404 (anti-leakage)
  if (user.role === "REQUESTER" && ticket.requesterId !== user.id) {
    throw new NotFoundError("Ticket not found.");
  }

  const comment = await prisma.publicComment.create({
    data: {
      ticketId,
      authorId: user.id,
      content: validation.sanitized!,
    },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          role: true,
        },
      },
    },
  });

  return comment;
}

export async function fetchInternalNotes(ticketId: number, user: AuthUser) {
  if (user.role === "REQUESTER") {
    throw new ForbiddenError("Forbidden: Requesters cannot access internal notes.");
  }

  const prisma = getPrisma();

  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: { id: true },
  });

  if (!ticket) {
    throw new NotFoundError("Ticket not found.");
  }

  const notes = await prisma.internalNote.findMany({
    where: { ticketId },
    orderBy: { createdAt: "asc" },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          role: true,
        },
      },
    },
  });

  return notes;
}

export async function createInternalNote(
  ticketId: number,
  input: unknown,
  user: AuthUser
) {
  if (user.role === "REQUESTER") {
    throw new ForbiddenError("Forbidden: Requesters cannot access internal notes.");
  }

  const validation = validateNoteInput(input);
  if (!validation.isValid) {
    throw new UnprocessableEntityError("Validation failed", validation.details);
  }

  const prisma = getPrisma();

  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: { id: true },
  });

  if (!ticket) {
    throw new NotFoundError("Ticket not found.");
  }

  const note = await prisma.internalNote.create({
    data: {
      ticketId,
      authorId: user.id,
      content: validation.sanitized!,
    },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          role: true,
        },
      },
    },
  });

  return note;
}
