import { getPrisma } from "../../prisma.js";
import { AuthUser } from "../../core/tokens.js";
import {
  NotFoundError,
  UnprocessableEntityError,
} from "../../core/errors.js";
import {
  CreateTicketInput,
  TicketListQuery,
  validateCreateTicketInput,
} from "./tickets.validation.js";

export async function createTicket(input: CreateTicketInput, requester: AuthUser) {
  const validation = validateCreateTicketInput(input);
  if (!validation.isValid) {
    throw new UnprocessableEntityError("Validation failed", validation.details);
  }

  const prisma = getPrisma();

  const category = await prisma.category.findUnique({
    where: { id: input.categoryId! },
  });
  if (!category || !category.isActive) {
    throw new UnprocessableEntityError("Validation failed", [
      "Invalid or inactive categoryId provided.",
    ]);
  }

  const relatedSystem = await prisma.relatedSystem.findUnique({
    where: { id: input.relatedSystemId! },
  });
  if (!relatedSystem || !relatedSystem.isActive) {
    throw new UnprocessableEntityError("Validation failed", [
      "Invalid or inactive relatedSystemId provided.",
    ]);
  }

  const currentYear = new Date().getFullYear();
  const count = await prisma.ticket.count();
  let seq = count + 1;
  let ticketNumber = `TKT-${currentYear}-${String(seq).padStart(6, "0")}`;
  while (await prisma.ticket.findUnique({ where: { ticketNumber } })) {
    seq++;
    ticketNumber = `TKT-${currentYear}-${String(seq).padStart(6, "0")}`;
  }

  const newTicket = await prisma.ticket.create({
    data: {
      ticketNumber,
      summary: input.summary!.trim(),
      description: input.description!.trim(),
      requestedPriority: input.requestedPriority || "MEDIUM",
      itPriority: "MEDIUM",
      currentStatus: "NEW",
      ticketOwnerId: null,
      resolutionSummary: null,
      requesterId: requester.id,
      categoryId: category.id,
      relatedSystemId: relatedSystem.id,
    },
    include: {
      category: { select: { id: true, name: true } },
      relatedSystem: { select: { id: true, name: true } },
    },
  });

  return {
    ...newTicket,
    ticketOwner: null,
  };
}

export async function listRequesterTickets(query: TicketListQuery, requester: AuthUser) {
  const prisma = getPrisma();
  const {
    page = 1,
    pageSize = 10,
    categoryId,
    requestedPriority,
    itPriority,
    status,
    search,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = query;

  const where: any = {
    requesterId: requester.id,
  };

  if (categoryId !== undefined) {
    where.categoryId = categoryId;
  }
  if (requestedPriority !== undefined) {
    where.requestedPriority = requestedPriority;
  }
  if (itPriority !== undefined) {
    where.itPriority = itPriority;
  }
  if (status !== undefined) {
    where.currentStatus = status;
  }

  if (search) {
    where.OR = [
      { ticketNumber: { contains: search, mode: "insensitive" } },
      { summary: { contains: search, mode: "insensitive" } },
    ];
  }

  const total = await prisma.ticket.count({ where });
  const totalPages = Math.ceil(total / pageSize);

  const tickets = await prisma.ticket.findMany({
    where,
    orderBy: { [sortBy]: sortOrder },
    skip: (page - 1) * pageSize,
    take: pageSize,
    include: {
      category: { select: { id: true, name: true } },
      relatedSystem: { select: { id: true, name: true } },
      ticketOwner: { select: { id: true, name: true } },
      _count: {
        select: {
          attachments: { where: { isRemoved: false } },
        },
      },
    },
  });

  const data = tickets.map((t: any) => ({
    id: t.id,
    ticketNumber: t.ticketNumber,
    summary: t.summary,
    requestedPriority: t.requestedPriority,
    itPriority: t.itPriority,
    currentStatus: t.currentStatus,
    ticketOwner: t.ticketOwner ? t.ticketOwner.name : null,
    ticketOwnerId: t.ticketOwnerId,
    categoryId: t.categoryId,
    categoryName: t.category.name,
    relatedSystemId: t.relatedSystemId,
    relatedSystemName: t.relatedSystem.name,
    attachmentCount: t._count.attachments,
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

export async function getRequesterTicketDetail(ticketId: number, requester: AuthUser) {
  const prisma = getPrisma();
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      requester: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      category: { select: { id: true, name: true } },
      relatedSystem: { select: { id: true, name: true } },
      ticketOwner: { select: { id: true, name: true } },
      attachments: {
        select: {
          id: true,
          originalFileName: true,
          fileSize: true,
          mimeType: true,
          isRemoved: true,
          removedAt: true,
          removalReason: true,
          createdAt: true,
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!ticket || ticket.requesterId !== requester.id) {
    throw new NotFoundError("Ticket not found.");
  }

  return {
    ...ticket,
    ticketOwner: ticket.ticketOwner ? ticket.ticketOwner.name : null,
  };
}
