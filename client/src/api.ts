const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export class ApiError extends Error {
  status: number;
  details?: string[];
  constructor(message: string, status: number, details?: string[]) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

export type Role = "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR";

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  role: Role;
  isActive: boolean;
  mustChangePassword: boolean;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

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
export type TicketStatus =
  | "NEW"
  | "OPEN"
  | "IN_PROGRESS"
  | "WAITING_FOR_REQUESTER"
  | "PENDING"
  | "RESOLVED"
  | "CLOSED"
  | "REOPENED"
  | "CANCELLED";

export interface Ticket {
  id: number;
  ticketNumber: string;
  summary: string;
  description: string;
  requestedPriority: Priority;
  itPriority: Priority;
  currentStatus: TicketStatus;
  ticketOwner: string | null;
  ticketOwnerId?: number | null;
  resolutionSummary: string | null;
  isRequesterResolved?: boolean;
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

function getAuthHeaders(extraHeaders: Record<string, string> = {}, requesterId?: number): Record<string, string> {
  const headers: Record<string, string> = { ...extraHeaders };
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("toktickit_auth_token");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }
  // Only attach X-Requester-Id if no Authorization Bearer token exists (for legacy unit tests)
  if (!headers["Authorization"] && requesterId !== undefined) {
    headers["X-Requester-Id"] = requesterId.toString();
  }
  return headers;
}

// ---------------------------------------------------------------------------
// Authentication API Functions
// ---------------------------------------------------------------------------

export async function login(email: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    let errorMsg = "Invalid email or password. Please try again.";
    try {
      const data = await res.json();
      if (data.error) errorMsg = data.error;
    } catch {
      // ignore
    }
    throw new ApiError(errorMsg, res.status);
  }

  const data: AuthResponse = await res.json();
  if (typeof window !== "undefined") {
    localStorage.setItem("toktickit_auth_token", data.token);
    localStorage.setItem("toktickit_auth_user", JSON.stringify(data.user));
  }
  return data;
}

export async function logout(): Promise<void> {
  const token = typeof window !== "undefined" ? localStorage.getItem("toktickit_auth_token") : null;
  try {
    if (token) {
      await fetch(`${API_URL}/api/auth/logout`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    }
  } finally {
    if (typeof window !== "undefined") {
      localStorage.removeItem("toktickit_auth_token");
      localStorage.removeItem("toktickit_auth_user");
    }
  }
}

export async function fetchCurrentUser(): Promise<AuthUser> {
  const token = typeof window !== "undefined" ? localStorage.getItem("toktickit_auth_token") : null;
  if (!token) {
    throw new ApiError("No active authentication session", 401);
  }

  const res = await fetch(`${API_URL}/api/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    let errorMsg = "Failed to load authenticated user profile";
    try {
      const data = await res.json();
      if (data.error) errorMsg = data.error;
    } catch {
      // ignore
    }
    throw new ApiError(errorMsg, res.status);
  }

  return res.json();
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
  confirmPassword: string
): Promise<{ message: string }> {
  const token = typeof window !== "undefined" ? localStorage.getItem("toktickit_auth_token") : null;
  if (!token) {
    throw new ApiError("No active authentication session", 401);
  }

  const res = await fetch(`${API_URL}/api/auth/change-password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
  });

  if (!res.ok) {
    let errorMsg = "Password change failed";
    let details: string[] | undefined;
    try {
      const data = await res.json();
      if (data.error) errorMsg = data.error;
      if (data.details) details = data.details;
    } catch {
      // ignore
    }
    throw new ApiError(errorMsg, res.status, details);
  }

  return res.json();
}

// ---------------------------------------------------------------------------
// Standard Resources
// ---------------------------------------------------------------------------

export async function fetchActiveRequesters(): Promise<DevelopmentRequester[]> {
  const res = await fetch(`${API_URL}/api/requesters/active`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    throw new Error(`Failed to load active requesters with status ${res.status}`);
  }
  return res.json();
}

export async function fetchCategories(): Promise<Category[]> {
  const res = await fetch(`${API_URL}/api/categories`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    throw new Error(`Failed to load categories with status ${res.status}`);
  }
  return res.json();
}

export async function fetchRelatedSystems(): Promise<RelatedSystem[]> {
  const res = await fetch(`${API_URL}/api/related-systems`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    throw new Error(`Failed to load related systems with status ${res.status}`);
  }
  return res.json();
}

export async function createTicket(
  payload: CreateTicketInput,
  requesterId?: number
): Promise<Ticket> {
  const res = await fetch(`${API_URL}/api/tickets`, {
    method: "POST",
    headers: getAuthHeaders({ "Content-Type": "application/json" }, requesterId),
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
  requesterId?: number
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
    headers: getAuthHeaders({}, requesterId),
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

export interface Attachment {
  id: number;
  ticketId?: number;
  originalFileName: string;
  fileSize: number;
  mimeType: string;
  isRemoved: boolean;
  removedAt: string | null;
  removalReason: string | null;
  createdAt: string;
}

export interface TicketDetail {
  id: number;
  ticketNumber: string;
  summary: string;
  description: string;
  requestedPriority: Priority;
  itPriority: Priority;
  currentStatus: TicketStatus;
  ticketOwner: string | null;
  resolutionSummary: string | null;
  isRequesterResolved?: boolean;
  requesterId: number;
  requester: {
    id: number;
    name: string;
    email: string;
    department?: string;
  };
  categoryId: number;
  category: { id: number; name: string };
  relatedSystemId: number;
  relatedSystem: { id: number; name: string };
  attachments: Attachment[];
  createdAt: string;
  updatedAt: string;
}

export async function fetchTicketDetail(
  ticketId: number,
  requesterId?: number
): Promise<TicketDetail> {
  const url = `${API_URL}/api/tickets/${ticketId}`;
  const res = await fetch(url, {
    headers: getAuthHeaders({}, requesterId),
  });

  if (!res.ok) {
    let errorMsg = `Failed to load ticket details with status ${res.status}`;
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

export async function uploadAttachment(
  ticketId: number,
  file: File,
  requesterId?: number
): Promise<Attachment> {
  const formData = new FormData();
  formData.append("file", file);

  const url = `${API_URL}/api/tickets/${ticketId}/attachments`;
  const res = await fetch(url, {
    method: "POST",
    headers: getAuthHeaders({}, requesterId),
    body: formData,
  });

  if (!res.ok) {
    let errorMsg = `Attachment upload failed with status ${res.status}`;
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

export async function downloadAttachment(
  attachmentId: number,
  requesterId?: number,
  filename: string = "attachment"
): Promise<void> {
  const url = `${API_URL}/api/attachments/${attachmentId}/download`;
  const res = await fetch(url, {
    headers: getAuthHeaders({}, requesterId),
  });

  if (!res.ok) {
    let errorMsg = `Download failed with status ${res.status}`;
    try {
      const data = await res.json();
      if (data.error) errorMsg = data.error;
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }

  const blob = await res.blob();
  if (typeof window !== "undefined" && window.URL && window.URL.createObjectURL) {
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  }
}

export async function softRemoveAttachment(
  attachmentId: number,
  removalReason: string,
  requesterId?: number
): Promise<Attachment> {
  const url = `${API_URL}/api/attachments/${attachmentId}/soft-remove`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: getAuthHeaders({ "Content-Type": "application/json" }, requesterId),
    body: JSON.stringify({ removalReason }),
  });

  if (!res.ok) {
    let errorMsg = `Soft remove failed with status ${res.status}`;
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

export interface PublicComment {
  id: number;
  ticketId: number;
  content: string;
  createdAt: string;
  author: {
    id: number;
    name: string;
    role: Role;
  };
}

export async function indicateTicketResolved(
  ticketId: number,
  requesterId?: number
): Promise<{ id: number; ticketNumber: string; isRequesterResolved: boolean; updatedAt: string }> {
  const url = `${API_URL}/api/tickets/${ticketId}/resolve-indication`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: getAuthHeaders({}, requesterId),
  });

  if (!res.ok) {
    let errorMsg = `Failed to indicate ticket resolution with status ${res.status}`;
    try {
      const data = await res.json();
      if (data.error) errorMsg = data.error;
    } catch {}
    throw new Error(errorMsg);
  }

  return res.json();
}

export async function fetchPublicComments(
  ticketId: number,
  requesterId?: number
): Promise<PublicComment[]> {
  const url = `${API_URL}/api/tickets/${ticketId}/comments`;
  const res = await fetch(url, {
    headers: getAuthHeaders({}, requesterId),
  });

  if (!res.ok) {
    let errorMsg = `Failed to fetch comments with status ${res.status}`;
    try {
      const data = await res.json();
      if (data.error) errorMsg = data.error;
    } catch {}
    throw new Error(errorMsg);
  }

  return res.json();
}

export async function createPublicComment(
  ticketId: number,
  content: string,
  requesterId?: number
): Promise<PublicComment> {
  const url = `${API_URL}/api/tickets/${ticketId}/comments`;
  const res = await fetch(url, {
    method: "POST",
    headers: getAuthHeaders({ "Content-Type": "application/json" }, requesterId),
    body: JSON.stringify({ content }),
  });

  if (!res.ok) {
    let errorMsg = `Failed to post comment with status ${res.status}`;
    try {
      const data = await res.json();
      if (data.details && Array.isArray(data.details)) {
        errorMsg = data.details.join(", ");
      } else if (data.error) {
        errorMsg = data.error;
      }
    } catch {}
    throw new Error(errorMsg);
  }

  return res.json();
}

export interface StaffTicket {
  id: number;
  ticketNumber: string;
  summary: string;
  category: { id: number; name: string } | null;
  requestedPriority: Priority;
  itPriority: Priority;
  currentStatus: TicketStatus;
  ticketOwner: { id: number; name: string; email: string } | null;
  isRequesterResolved: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StaffQueueResponse {
  data: StaffTicket[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

export interface StaffQueueParams {
  search?: string;
  status?: string;
  categoryId?: number;
  requestedPriority?: string;
  itPriority?: string;
  ticketOwnerId?: number | "unassigned";
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export async function fetchStaffTickets(
  params: StaffQueueParams = {}
): Promise<StaffQueueResponse> {
  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  if (params.status) query.set("status", params.status);
  if (params.categoryId !== undefined && params.categoryId !== null) {
    query.set("categoryId", String(params.categoryId));
  }
  if (params.requestedPriority) query.set("requestedPriority", params.requestedPriority);
  if (params.itPriority) query.set("itPriority", params.itPriority);
  if (params.ticketOwnerId !== undefined && params.ticketOwnerId !== null) {
    query.set("ticketOwnerId", String(params.ticketOwnerId));
  }
  if (params.sortBy) query.set("sortBy", params.sortBy);
  if (params.sortOrder) query.set("sortOrder", params.sortOrder);
  if (params.page) query.set("page", String(params.page));
  if (params.pageSize) query.set("pageSize", String(params.pageSize));

  const queryString = query.toString();
  const url = `${API_URL}/api/staff/tickets${queryString ? `?${queryString}` : ""}`;
  const res = await fetch(url, {
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    let errorMsg = `Failed to fetch staff tickets with status ${res.status}`;
    try {
      const data = await res.json();
      if (data.details && Array.isArray(data.details)) {
        errorMsg = data.details.join(", ");
      } else if (data.error) {
        errorMsg = data.error;
      }
    } catch {}
    throw new Error(errorMsg);
  }

  return res.json();
}

