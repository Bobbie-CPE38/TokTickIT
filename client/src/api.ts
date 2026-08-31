const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export interface Category {
  id: number;
  name: string;
}

export interface RelatedSystem {
  id: number;
  name: string;
}

export interface DevelopmentRequester {
  id: number;
  name: string;
  email: string;
  department: string;
}

export type Priority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type TicketStatus = "NEW" | "OPEN" | "IN_PROGRESS" | "PENDING" | "RESOLVED" | "CLOSED";

export interface Ticket {
  id: number;
  ticketNumber: string;
  summary: string;
  description: string;
  requestedPriority: Priority;
  itPriority: Priority;
  currentStatus: TicketStatus;
  ticketOwner: string | null;
  resolutionSummary: string | null;
  requesterId: number;
  categoryId: number;
  relatedSystemId: number;
  createdAt: string;
  updatedAt: string;
  category?: { id: number; name: string };
  relatedSystem?: { id: number; name: string };
}

export interface CreateTicketInput {
  categoryId: number;
  relatedSystemId: number;
  requestedPriority: Priority;
  summary: string;
  description: string;
}

export interface SystemStatus {
  online: boolean;
  categories: Category[];
}

export async function fetchActiveRequesters(): Promise<DevelopmentRequester[]> {
  const res = await fetch(`${API_URL}/api/requesters/active`);
  if (!res.ok) {
    throw new Error(`Failed to load active requesters with status ${res.status}`);
  }
  return res.json();
}

export async function fetchCategories(): Promise<Category[]> {
  const res = await fetch(`${API_URL}/api/categories`);
  if (!res.ok) {
    throw new Error(`Failed to load categories with status ${res.status}`);
  }
  return res.json();
}

export async function fetchRelatedSystems(): Promise<RelatedSystem[]> {
  const res = await fetch(`${API_URL}/api/related-systems`);
  if (!res.ok) {
    throw new Error(`Failed to load related systems with status ${res.status}`);
  }
  return res.json();
}

export async function createTicket(
  payload: CreateTicketInput,
  requesterId: number
): Promise<Ticket> {
  const res = await fetch(`${API_URL}/api/tickets`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Requester-Id": requesterId.toString(),
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    let errorMsg = `Ticket creation failed with status ${res.status}`;
    try {
      const data = await res.json();
      if (data.details && Array.isArray(data.details)) {
        errorMsg = data.details.join(", ");
      } else if (data.error) {
        errorMsg = data.error;
      }
    } catch {
      // ignore json parse error
    }
    throw new Error(errorMsg);
  }

  return res.json();
}

export async function checkSystem(): Promise<SystemStatus> {
  const healthRes = await fetch(`${API_URL}/api/health`);
  if (!healthRes.ok) {
    throw new Error(`Health check failed with status ${healthRes.status}`);
  }

  const categoriesRes = await fetch(`${API_URL}/api/categories`);
  if (!categoriesRes.ok) {
    throw new Error(`Categories fetch failed with status ${categoriesRes.status}`);
  }

  const categories = await categoriesRes.json();

  return {
    online: true,
    categories: categories,
  };
}

export interface TicketListItem {
  id: number;
  ticketNumber: string;
  summary: string;
  requestedPriority: Priority;
  itPriority: Priority;
  currentStatus: TicketStatus;
  ticketOwner: string | null;
  categoryId: number;
  categoryName: string;
  relatedSystemId: number;
  relatedSystemName: string;
  attachmentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PaginationMetadata {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface TicketListResponse {
  data: TicketListItem[];
  pagination: PaginationMetadata;
}

export interface TicketFilterParams {
  page?: number;
  pageSize?: number;
  search?: string;
  categoryId?: number | string;
  requestedPriority?: Priority | "";
  itPriority?: Priority | "";
  status?: TicketStatus | "";
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export async function fetchTickets(
  params: TicketFilterParams = {},
  requesterId: number
): Promise<TicketListResponse> {
  const query = new URLSearchParams();
  if (params.page !== undefined) query.set("page", params.page.toString());
  if (params.pageSize !== undefined) query.set("pageSize", params.pageSize.toString());
  if (params.search !== undefined && params.search !== "") query.set("search", params.search);
  if (params.categoryId !== undefined && params.categoryId !== "")
    query.set("categoryId", params.categoryId.toString());
  if (params.requestedPriority !== undefined && params.requestedPriority !== "")
    query.set("requestedPriority", params.requestedPriority);
  if (params.itPriority !== undefined && params.itPriority !== "")
    query.set("itPriority", params.itPriority);
  if (params.status !== undefined && params.status !== "") query.set("status", params.status);
  if (params.sortBy !== undefined && params.sortBy !== "") query.set("sortBy", params.sortBy);
  if (params.sortOrder !== undefined) query.set("sortOrder", params.sortOrder);

  const queryString = query.toString();
  const url = `${API_URL}/api/tickets${queryString ? `?${queryString}` : ""}`;

  const res = await fetch(url, {
    headers: {
      "X-Requester-Id": requesterId.toString(),
    },
  });

  if (!res.ok) {
    let errorMsg = `Failed to load tickets with status ${res.status}`;
    try {
      const data = await res.json();
      if (data.details && Array.isArray(data.details)) {
        errorMsg = data.details.join(", ");
      } else if (data.error) {
        errorMsg = data.error;
      }
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }

  return res.json();
}


