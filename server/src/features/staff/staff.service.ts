import { getPrisma } from "../../prisma.js";
import { StaffQueueQuery } from "./staff.validation.js";

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
