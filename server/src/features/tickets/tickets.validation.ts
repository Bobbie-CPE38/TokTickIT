export interface CreateTicketInput {
  categoryId?: number;
  relatedSystemId?: number;
  requestedPriority?: string;
  summary?: string;
  description?: string;
}

export function validateCreateTicketInput(input: CreateTicketInput): {
  isValid: boolean;
  details: string[];
} {
  const details: string[] = [];

  if (!input.categoryId || typeof input.categoryId !== "number") {
    details.push("Please select a valid category.");
  }
  if (!input.relatedSystemId || typeof input.relatedSystemId !== "number") {
    details.push("Please select a valid related system.");
  }

  const allowedPriorities = ["LOW", "MEDIUM", "HIGH", "URGENT"];
  const priority = input.requestedPriority || "MEDIUM";
  if (!allowedPriorities.includes(priority)) {
    details.push("Requested priority must be one of: LOW, MEDIUM, HIGH, URGENT.");
  }

  const trimmedSummary = typeof input.summary === "string" ? input.summary.trim() : "";
  if (!trimmedSummary || trimmedSummary.length < 5 || trimmedSummary.length > 150) {
    details.push("Summary must be between 5 and 150 characters.");
  }

  const trimmedDescription = typeof input.description === "string" ? input.description.trim() : "";
  if (!trimmedDescription || trimmedDescription.length < 10 || trimmedDescription.length > 2000) {
    details.push("Description must be between 10 and 2000 characters.");
  }

  return {
    isValid: details.length === 0,
    details,
  };
}

export interface TicketListQuery {
  page?: number;
  pageSize?: number;
  categoryId?: number;
  requestedPriority?: string;
  itPriority?: string;
  status?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export function validateTicketListQuery(rawQuery: any): {
  isValid: boolean;
  details: string[];
  sanitized: TicketListQuery;
} {
  const details: string[] = [];

  let page = 1;
  if (rawQuery.page !== undefined) {
    page = parseInt(String(rawQuery.page), 10);
    if (isNaN(page) || page < 1) {
      details.push("page must be an integer greater than or equal to 1.");
    }
  }

  let pageSize = 10;
  if (rawQuery.pageSize !== undefined) {
    pageSize = parseInt(String(rawQuery.pageSize), 10);
    if (isNaN(pageSize) || pageSize < 1 || pageSize > 50) {
      details.push("pageSize must be an integer between 1 and 50.");
    }
  }

  let categoryId: number | undefined;
  if (rawQuery.categoryId !== undefined && rawQuery.categoryId !== "") {
    categoryId = parseInt(String(rawQuery.categoryId), 10);
    if (isNaN(categoryId)) {
      details.push("categoryId must be a valid integer.");
    }
  }

  const allowedPriorities = ["LOW", "MEDIUM", "HIGH", "URGENT"];
  let requestedPriority: string | undefined;
  if (rawQuery.requestedPriority !== undefined && rawQuery.requestedPriority !== "") {
    const rp = String(rawQuery.requestedPriority);
    if (!allowedPriorities.includes(rp)) {
      details.push("requestedPriority must be one of: LOW, MEDIUM, HIGH, URGENT.");
    } else {
      requestedPriority = rp;
    }
  }

  let itPriority: string | undefined;
  if (rawQuery.itPriority !== undefined && rawQuery.itPriority !== "") {
    const ip = String(rawQuery.itPriority);
    if (!allowedPriorities.includes(ip)) {
      details.push("itPriority must be one of: LOW, MEDIUM, HIGH, URGENT.");
    } else {
      itPriority = ip;
    }
  }

  const allowedStatuses = [
    "NEW",
    "OPEN",
    "IN_PROGRESS",
    "WAITING_FOR_REQUESTER",
    "PENDING",
    "RESOLVED",
    "CLOSED",
    "REOPENED",
    "CANCELLED",
  ];
  let status: string | undefined;
  if (rawQuery.status !== undefined && rawQuery.status !== "") {
    let st = String(rawQuery.status);
    if (st === "PENDING") st = "WAITING_FOR_REQUESTER";
    if (!allowedStatuses.includes(st)) {
      details.push("status must be one of: NEW, OPEN, IN_PROGRESS, PENDING, RESOLVED, CLOSED.");
    } else {
      status = st;
    }
  }

  const allowedSortBy = ["createdAt", "updatedAt", "ticketNumber", "requestedPriority"];
  let sortBy = "createdAt";
  if (rawQuery.sortBy !== undefined && rawQuery.sortBy !== "") {
    const sb = String(rawQuery.sortBy);
    if (!allowedSortBy.includes(sb)) {
      details.push("sortBy must be one of: createdAt, updatedAt, ticketNumber, requestedPriority.");
    } else {
      sortBy = sb;
    }
  }

  let sortOrder: "asc" | "desc" = "desc";
  if (rawQuery.sortOrder !== undefined && rawQuery.sortOrder !== "") {
    const so = String(rawQuery.sortOrder).toLowerCase();
    if (so !== "asc" && so !== "desc") {
      details.push("sortOrder must be 'asc' or 'desc'.");
    } else {
      sortOrder = so as "asc" | "desc";
    }
  }

  const search = rawQuery.search ? String(rawQuery.search).trim() : "";

  return {
    isValid: details.length === 0,
    details,
    sanitized: {
      page,
      pageSize,
      categoryId,
      requestedPriority,
      itPriority,
      status,
      search,
      sortBy,
      sortOrder,
    },
  };
}
