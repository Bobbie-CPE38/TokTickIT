import {
  ActionTaken,
  CreateActionTakenPayload,
  UpdateActionTakenPayload,
} from "./types.js";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

function getAuthHeaders(extraHeaders: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = { ...extraHeaders };
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("toktickit_auth_token");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    const requesterId = localStorage.getItem("toktickit_requester_id");
    if (!headers["Authorization"] && requesterId) {
      headers["X-Requester-Id"] = requesterId;
    }
  }
  return headers;
}

export async function fetchActionsTaken(ticketId: number): Promise<ActionTaken[]> {
  const res = await fetch(`${API_URL}/api/tickets/${ticketId}/actions-taken`, {
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    let errorMsg = `Failed to fetch actions taken (${res.status})`;
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

export async function fetchActionTakenById(actionId: number): Promise<ActionTaken> {
  const res = await fetch(`${API_URL}/api/actions-taken/${actionId}`, {
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    let errorMsg = `Failed to fetch action taken (${res.status})`;
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

export async function createActionTaken(
  ticketId: number,
  payload: CreateActionTakenPayload
): Promise<ActionTaken> {
  const res = await fetch(`${API_URL}/api/tickets/${ticketId}/actions-taken`, {
    method: "POST",
    headers: getAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    let errorMsg = `Failed to record action taken (${res.status})`;
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

export async function updateActionTaken(
  actionId: number,
  payload: UpdateActionTakenPayload
): Promise<ActionTaken> {
  const res = await fetch(`${API_URL}/api/actions-taken/${actionId}`, {
    method: "PATCH",
    headers: getAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    let errorMsg = `Failed to update action taken (${res.status})`;
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
