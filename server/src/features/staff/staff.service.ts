import { getPrisma } from "../../prisma.js";
import { StaffQueueQuery, validateStatusTransitionInput } from "./staff.validation.js";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
  UnprocessableEntityError,
} from "../../core/errors.js";

export interface StaffQueueResult {
  data: Array<{
    id: number;
    ticketNumber: string;
    summary: string;
    category: { id: number; name: string } | null;
    requestedPriority: string;
    itPriority: string;
    currentStatus: string;
    ticketOwner: { id: number; name: string; email: string } | null;
    isRequesterResolved: boolean;
    createdAt: string;
    updatedAt: string;
  }>;
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

export async function getStaffQueue(query: StaffQueueQuery): Promise<StaffQueueResult> {
  const prisma = getPrisma();
  const {
    search,
    status,
    categoryId,
    requestedPriority,
    itPriority,
    ticketOwnerId,
    sortBy,
    sortOrder,
    page,
    pageSize,
  } = query;

  const where: any = {};

  if (status) {
    where.currentStatus = status;
  }

  if (categoryId !== undefined) {
    where.categoryId = categoryId;
  }

  if (requestedPriority) {
    where.requestedPriority = requestedPriority;
  }

  if (itPriority) {
    where.itPriority = itPriority;
  }

  if (ticketOwnerId === "unassigned") {
    where.ticketOwnerId = null;
  } else if (typeof ticketOwnerId === "number") {
    where.ticketOwnerId = ticketOwnerId;
  }

  if (search) {
    where.OR = [
      { ticketNumber: { contains: search, mode: "insensitive" } },
      { summary: { contains: search, mode: "insensitive" } },
    ];
  }

  const sortColumn = sortBy === "status" ? "currentStatus" : sortBy;
  const orderBy = { [sortColumn]: sortOrder };

  const total = await prisma.ticket.count({ where });
  const totalPages = Math.ceil(total / pageSize);

  const tickets = await prisma.ticket.findMany({
    where,
    orderBy,
    skip: (page - 1) * pageSize,
    take: pageSize,
    include: {
      category: {
        select: { id: true, name: true },
      },
      ticketOwner: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  const data = tickets.map((t: any) => ({
    id: t.id,
    ticketNumber: t.ticketNumber,
    summary: t.summary,
    category: t.category ? { id: t.category.id, name: t.category.name } : null,
    requestedPriority: t.requestedPriority,
    itPriority: t.itPriority,
    currentStatus: t.currentStatus,
    ticketOwner: t.ticketOwner
      ? {
          id: t.ticketOwner.id,
          name: t.ticketOwner.name,
          email: t.ticketOwner.email,
        }
      : null,
    isRequesterResolved: t.isRequesterResolved,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  }));

  return {
    data,
    pagination: {
      total,
      page,
      pageSize,
      totalPages,
    },
  };
}

export async function getStaffTicketDetail(ticketId: number) {
  const prisma = getPrisma();

  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      category: {
        select: { id: true, name: true },
      },
      relatedSystem: {
        select: { id: true, name: true },
      },
      requester: {
        select: { id: true, name: true, email: true, role: true },
      },
      ticketOwner: {
        select: { id: true, name: true, email: true, role: true },
      },
      attachments: {
        select: {
          id: true,
          ticketId: true,
          originalFileName: true,
          fileSize: true,
          mimeType: true,
          isRemoved: true,
          removedAt: true,
          removalReason: true,
          uploadedByUserId: true,
          createdAt: true,
        },
        orderBy: { createdAt: "asc" },
      },
      publicComments: {
        select: {
          id: true,
          ticketId: true,
          content: true,
          createdAt: true,
          author: {
            select: { id: true, name: true, role: true },
          },
        },
        orderBy: { createdAt: "asc" },
      },
      internalNotes: {
        select: {
          id: true,
          ticketId: true,
          content: true,
          createdAt: true,
          author: {
            select: { id: true, name: true, role: true },
          },
        },
        orderBy: { createdAt: "asc" },
      },
      actionsTaken: {
        include: {
          performedBy: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
        orderBy: { actionDateTime: "asc" },
      },
    },
  });

  if (!ticket) {
    throw new NotFoundError("Ticket not found.");
  }

  return {
    id: ticket.id,
    ticketNumber: ticket.ticketNumber,
    summary: ticket.summary,
    description: ticket.description,
    requestedPriority: ticket.requestedPriority,
    itPriority: ticket.itPriority,
    currentStatus: ticket.currentStatus,
    resolutionSummary: ticket.resolutionSummary,
    isRequesterResolved: ticket.isRequesterResolved,
    requesterId: ticket.requesterId,
    requester: ticket.requester,
    ticketOwnerId: ticket.ticketOwnerId,
    ticketOwner: ticket.ticketOwner,
    categoryId: ticket.categoryId,
    category: ticket.category,
    relatedSystemId: ticket.relatedSystemId,
    relatedSystem: ticket.relatedSystem,
    attachments: ticket.attachments.map((a: any) => ({
      id: a.id,
      ticketId: a.ticketId,
      originalFileName: a.originalFileName,
      fileSize: a.fileSize,
      mimeType: a.mimeType,
      isRemoved: a.isRemoved,
      removedAt: a.removedAt ? a.removedAt.toISOString() : null,
      removalReason: a.removalReason,
      uploadedByUserId: a.uploadedByUserId,
      createdAt: a.createdAt.toISOString(),
    })),
    publicComments: ticket.publicComments.map((c: any) => ({
      id: c.id,
      ticketId: c.ticketId,
      content: c.content,
      createdAt: c.createdAt.toISOString(),
      author: c.author,
    })),
    internalNotes: ticket.internalNotes.map((n: any) => ({
      id: n.id,
      ticketId: n.ticketId,
      content: n.content,
      createdAt: n.createdAt.toISOString(),
      author: n.author,
    })),
    actionsTaken: (ticket.actionsTaken || []).map((a: any) => ({
      id: a.id,
      ticketId: a.ticketId,
      actionDateTime: a.actionDateTime.toISOString(),
      description: a.description,
      result: a.result,
      performedByUserId: a.performedByUserId,
      performedBy: a.performedBy,
      isFollowUpRequired: a.isFollowUpRequired,
      followUpNote: a.followUpNote,
      attachmentNotes: a.attachmentNotes,
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
    })),
    createdAt: ticket.createdAt.toISOString(),
    updatedAt: ticket.updatedAt.toISOString(),
  };
}

export async function assignTicket(
  ticketId: number,
  ticketOwnerId: number | null,
  expectedUpdatedAt?: string
) {
  const prisma = getPrisma();

  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
  });

  if (!ticket) {
    throw new NotFoundError("Ticket not found.");
  }

  if (expectedUpdatedAt && ticket.updatedAt.toISOString() !== expectedUpdatedAt) {
    throw new ConflictError(
      "Conflict: Ticket has been modified by another user. Please refresh and review latest changes.",
      [
        `Stale record detected. Current updatedAt is ${ticket.updatedAt.toISOString()} but expected was ${expectedUpdatedAt}.`,
      ],
      ticket.updatedAt.toISOString()
    );
  }

  if (ticketOwnerId !== null) {
    const targetUser = await prisma.user.findUnique({
      where: { id: ticketOwnerId },
    });

    if (!targetUser || !targetUser.isActive || targetUser.role === "REQUESTER") {
      throw new UnprocessableEntityError("Validation failed", [
        "Invalid ticket owner: user must be an active IT Staff or Administrator.",
      ]);
    }
  }

  const updated = await prisma.ticket.update({
    where: { id: ticketId },
    data: { ticketOwnerId },
    include: {
      ticketOwner: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  return {
    id: updated.id,
    ticketNumber: updated.ticketNumber,
    ticketOwnerId: updated.ticketOwnerId,
    ticketOwner: updated.ticketOwner,
    updatedAt: updated.updatedAt.toISOString(),
  };
}

export async function updateTicketPriority(
  ticketId: number,
  itPriority: any,
  expectedUpdatedAt?: string
) {
  const prisma = getPrisma();

  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
  });

  if (!ticket) {
    throw new NotFoundError("Ticket not found.");
  }

  if (expectedUpdatedAt && ticket.updatedAt.toISOString() !== expectedUpdatedAt) {
    throw new ConflictError(
      "Conflict: Ticket has been modified by another user. Please refresh and review latest changes.",
      [
        `Stale record detected. Current updatedAt is ${ticket.updatedAt.toISOString()} but expected was ${expectedUpdatedAt}.`,
      ],
      ticket.updatedAt.toISOString()
    );
  }

  const updated = await prisma.ticket.update({
    where: { id: ticketId },
    data: { itPriority },
  });

  return {
    id: updated.id,
    ticketNumber: updated.ticketNumber,
    requestedPriority: updated.requestedPriority,
    itPriority: updated.itPriority,
    updatedAt: updated.updatedAt.toISOString(),
  };
}

export async function updateTicketStatus(
  ticketId: number,
  nextStatus: string,
  resolutionSummary?: string,
  expectedUpdatedAt?: string
) {
  const prisma = getPrisma();

  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      actionsTaken: true,
    },
  });

  if (!ticket) {
    throw new NotFoundError("Ticket not found.");
  }

  if (expectedUpdatedAt && ticket.updatedAt.toISOString() !== expectedUpdatedAt) {
    throw new ConflictError(
      "Conflict: Ticket has been modified by another user. Please refresh and review latest changes.",
      [
        `Stale record detected. Current updatedAt is ${ticket.updatedAt.toISOString()} but expected was ${expectedUpdatedAt}.`,
      ],
      ticket.updatedAt.toISOString()
    );
  }

  const validation = validateStatusTransitionInput(
    { status: nextStatus, resolutionSummary, expectedUpdatedAt },
    ticket.currentStatus
  );

  if (!validation.isValid) {
    if (validation.statusCode === 400) {
      throw new BadRequestError(validation.details.join(", "));
    }
    throw new UnprocessableEntityError(
      validation.nextStatus === "RESOLVED" && (!validation.resolutionSummary || validation.resolutionSummary.length < 5)
        ? "Validation Error: resolutionSummary is required when resolving a ticket (minimum 5 characters)."
        : "Validation failed",
      validation.details
    );
  }

  // Resolution Gate Enforcement (BR-09):
  // When transitioning to RESOLVED, at least one Action Taken must exist
  if (validation.nextStatus === "RESOLVED" && ticket.actionsTaken.length === 0) {
    throw new UnprocessableEntityError(
      "Resolution Gate Failed: At least one Action Taken must be recorded before resolution.",
      [
        "Ticket has 0 recorded Actions Taken. Record technical actions before marking as Resolved.",
      ]
    );
  }

  const data: any = {
    currentStatus: validation.nextStatus as any,
  };

  if (validation.nextStatus === "RESOLVED") {
    data.resolutionSummary = validation.resolutionSummary;
  } else if (ticket.currentStatus === "RESOLVED" && validation.nextStatus === "CLOSED") {
    if (validation.resolutionSummary) {
      data.resolutionSummary = validation.resolutionSummary;
    }
    // if resolutionSummary omitted on CLOSED, retain existing summary on ticket
  } else if (validation.resolutionSummary !== undefined) {
    data.resolutionSummary = validation.resolutionSummary;
  }

  const updated = await prisma.ticket.update({
    where: { id: ticketId },
    data,
  });

  return {
    id: updated.id,
    ticketNumber: updated.ticketNumber,
    summary: updated.summary,
    currentStatus: updated.currentStatus,
    resolutionSummary: updated.resolutionSummary,
    isRequesterResolved: updated.isRequesterResolved,
    itPriority: updated.itPriority,
    ticketOwnerId: updated.ticketOwnerId,
    updatedAt: updated.updatedAt.toISOString(),
  };
}

export async function getStaffAssignees() {
  const prisma = getPrisma();

  const assignees = await prisma.user.findMany({
    where: {
      isActive: true,
      role: { in: ["IT_STAFF", "ADMINISTRATOR"] },
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
    orderBy: { name: "asc" },
  });

  return assignees;
}
