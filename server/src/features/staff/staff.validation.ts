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

export const PERMITTED_TRANSITIONS: Record<string, string[]> = {
  NEW: ["OPEN", "IN_PROGRESS", "CANCELLED"],
  OPEN: ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "CANCELLED"],
  IN_PROGRESS: ["WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
  WAITING_FOR_REQUESTER: ["IN_PROGRESS", "RESOLVED", "CANCELLED"],
  RESOLVED: ["CLOSED", "REOPENED"],
  REOPENED: ["IN_PROGRESS", "RESOLVED", "CANCELLED"],
  CLOSED: ["REOPENED"],
  CANCELLED: [],
};

export function validateAssignmentInput(input: unknown): {
  isValid: boolean;
  details: string[];
  ticketOwnerId: number | null;
} {
  const details: string[] = [];
  if (!input || typeof input !== "object") {
    return { isValid: false, details: ["Request body must be a valid JSON object."], ticketOwnerId: null };
  }
  const { ticketOwnerId } = input as { ticketOwnerId?: unknown };

  if (ticketOwnerId === undefined) {
    return { isValid: false, details: ["ticketOwnerId field is required."], ticketOwnerId: null };
  }

  if (ticketOwnerId === null) {
    return { isValid: true, details: [], ticketOwnerId: null };
  }

  if (typeof ticketOwnerId !== "number" || !Number.isInteger(ticketOwnerId) || ticketOwnerId <= 0) {
    return { isValid: false, details: ["ticketOwnerId must be a positive integer or null."], ticketOwnerId: null };
  }

  return { isValid: true, details: [], ticketOwnerId };
}

export function validatePriorityInput(input: unknown): {
  isValid: boolean;
  details: string[];
  itPriority: string;
} {
  const details: string[] = [];
  if (!input || typeof input !== "object") {
    return { isValid: false, details: ["Request body must be a valid JSON object."], itPriority: "" };
  }
  const { itPriority } = input as { itPriority?: unknown };

  if (!itPriority || typeof itPriority !== "string" || !VALID_PRIORITIES.includes(itPriority)) {
    return { isValid: false, details: [`Invalid itPriority: must be one of ${VALID_PRIORITIES.join(", ")}`], itPriority: "" };
  }

  return { isValid: true, details: [], itPriority };
}

export function validateStatusTransitionInput(
  input: unknown,
  currentStatus: string
): {
  isValid: boolean;
  details: string[];
  statusCode: number;
  nextStatus: string;
  resolutionSummary?: string;
} {
  if (!input || typeof input !== "object") {
    return { isValid: false, details: ["Request body must be a valid JSON object."], statusCode: 400, nextStatus: "" };
  }
  const { currentStatus: rawNextStatus, resolutionSummary: rawSummary } = input as {
    currentStatus?: unknown;
    resolutionSummary?: unknown;
  };

  if (!rawNextStatus || typeof rawNextStatus !== "string") {
    return { isValid: false, details: ["currentStatus field is required and must be a string."], statusCode: 400, nextStatus: "" };
  }

  const nextStatus = rawNextStatus.trim();
  if (!VALID_STATUSES.includes(nextStatus)) {
    return { isValid: false, details: [`Invalid status value: '${nextStatus}'.`], statusCode: 400, nextStatus };
  }

  const allowedTransitions = PERMITTED_TRANSITIONS[currentStatus] || [];
  if (!allowedTransitions.includes(nextStatus)) {
    return {
      isValid: false,
      details: [`Transition from '${currentStatus}' to '${nextStatus}' is not permitted.`],
      statusCode: 422,
      nextStatus,
    };
  }

  let resolutionSummary: string | undefined;
  if (rawSummary !== undefined && rawSummary !== null) {
    if (typeof rawSummary !== "string") {
      return { isValid: false, details: ["resolutionSummary must be a string."], statusCode: 422, nextStatus };
    }
    resolutionSummary = rawSummary.trim();
  }

  // When transitioning to RESOLVED: resolutionSummary is mandatory (min 5, max 1000)
  if (nextStatus === "RESOLVED") {
    if (!resolutionSummary || resolutionSummary.length < 5) {
      return {
        isValid: false,
        details: ["resolutionSummary is required and must be at least 5 characters when resolving."],
        statusCode: 422,
        nextStatus,
      };
    }
    if (resolutionSummary.length > 1000) {
      return {
        isValid: false,
        details: ["resolutionSummary must not exceed 1000 characters."],
        statusCode: 422,
        nextStatus,
      };
    }
  }

  // When transitioning with a provided resolutionSummary
  if (resolutionSummary !== undefined && resolutionSummary.length > 0) {
    if (resolutionSummary.length < 5 || resolutionSummary.length > 1000) {
      return {
        isValid: false,
        details: ["resolutionSummary must be between 5 and 1000 characters."],
        statusCode: 422,
        nextStatus,
      };
    }
  }

  return {
    isValid: true,
    details: [],
    statusCode: 200,
    nextStatus,
    resolutionSummary,
  };
}
