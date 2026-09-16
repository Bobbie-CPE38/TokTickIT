export interface StaffQueueQuery {
  search?: string;
  status?: string;
  categoryId?: number;
  requestedPriority?: string;
  itPriority?: string;
  ticketOwnerId?: number | "unassigned";
  sortBy: string;
  sortOrder: "asc" | "desc";
  page: number;
  pageSize: number;
}

const VALID_STATUSES = [
  "NEW",
  "OPEN",
  "IN_PROGRESS",
  "WAITING_FOR_REQUESTER",
  "RESOLVED",
  "CLOSED",
  "REOPENED",
  "CANCELLED",
];

const VALID_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"];

const VALID_SORT_FIELDS = [
  "createdAt",
  "updatedAt",
  "ticketNumber",
  "itPriority",
  "status",
];

export function validateStaffQueueQuery(rawQuery: Record<string, any>): {
  isValid: boolean;
  details: string[];
  sanitized: StaffQueueQuery;
} {
  const details: string[] = [];

  // 1. Pagination defaults and sanitization
  let page = 1;
  if (rawQuery.page !== undefined && rawQuery.page !== "") {
    const parsedPage = parseInt(String(rawQuery.page), 10);
    if (!isNaN(parsedPage) && parsedPage >= 1) {
      page = parsedPage;
    }
  }

  let pageSize = 10;
  if (rawQuery.pageSize !== undefined && rawQuery.pageSize !== "") {
    const parsedPageSize = parseInt(String(rawQuery.pageSize), 10);
    if (!isNaN(parsedPageSize) && parsedPageSize >= 1) {
      pageSize = parsedPageSize > 50 ? 50 : parsedPageSize;
    }
  }

  // 2. Enum validations (return 400 with details on invalid values)
  let status: string | undefined;
  if (rawQuery.status !== undefined && rawQuery.status !== "") {
    const s = String(rawQuery.status).trim();
    if (!VALID_STATUSES.includes(s)) {
      details.push(`Value '${s}' is not a valid status enum`);
    } else {
      status = s;
    }
  }

  let requestedPriority: string | undefined;
  if (rawQuery.requestedPriority !== undefined && rawQuery.requestedPriority !== "") {
    const rp = String(rawQuery.requestedPriority).trim();
    if (!VALID_PRIORITIES.includes(rp)) {
      details.push(`Value '${rp}' is not a valid priority enum`);
    } else {
      requestedPriority = rp;
    }
  }

  let itPriority: string | undefined;
  if (rawQuery.itPriority !== undefined && rawQuery.itPriority !== "") {
    const ip = String(rawQuery.itPriority).trim();
    if (!VALID_PRIORITIES.includes(ip)) {
      details.push(`Value '${ip}' is not a valid priority enum`);
    } else {
      itPriority = ip;
    }
  }

  // 3. CategoryId
  let categoryId: number | undefined;
  if (rawQuery.categoryId !== undefined && rawQuery.categoryId !== "") {
    const parsedCat = parseInt(String(rawQuery.categoryId), 10);
    if (!isNaN(parsedCat) && parsedCat > 0) {
      categoryId = parsedCat;
    }
  }

  // 4. TicketOwnerId: number or "unassigned"
  let ticketOwnerId: number | "unassigned" | undefined;
  if (rawQuery.ticketOwnerId !== undefined && rawQuery.ticketOwnerId !== "") {
    const rawOwner = String(rawQuery.ticketOwnerId).trim();
    if (rawOwner.toLowerCase() === "unassigned") {
      ticketOwnerId = "unassigned";
    } else {
      const parsedOwner = parseInt(rawOwner, 10);
      if (!isNaN(parsedOwner) && parsedOwner > 0) {
        ticketOwnerId = parsedOwner;
      }
    }
  }

  // 5. Search
  let search: string | undefined;
  if (rawQuery.search !== undefined && rawQuery.search !== "") {
    const trimmed = String(rawQuery.search).trim();
    if (trimmed.length > 0) {
      search = trimmed;
    }
  }

  // 6. Sorting & fallback
  let sortBy = "createdAt";
  if (rawQuery.sortBy !== undefined && rawQuery.sortBy !== "") {
    const requestedSort = String(rawQuery.sortBy).trim();
    if (VALID_SORT_FIELDS.includes(requestedSort)) {
      sortBy = requestedSort;
    }
  }

  let sortOrder: "asc" | "desc" = "desc";
  if (rawQuery.sortOrder !== undefined && rawQuery.sortOrder !== "") {
    const requestedOrder = String(rawQuery.sortOrder).trim().toLowerCase();
    if (requestedOrder === "asc" || requestedOrder === "desc") {
      sortOrder = requestedOrder;
    }
  }

  return {
    isValid: details.length === 0,
    details,
    sanitized: {
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
    },
  };
}
