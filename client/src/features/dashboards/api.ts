import { AdminDashboardData, RequesterDashboardData, StaffDashboardData } from "./types.js";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("toktickit_auth_token");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }
  return headers;
}

async function fetchDashboard<T>(role: "requester" | "staff" | "admin"): Promise<T> {
  const res = await fetch(`${API_URL}/api/dashboards/${role}`, {
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    let errorMsg = `Failed to load dashboard (${res.status})`;
    if (res.status === 403) {
      errorMsg = "You do not have permission to view this dashboard.";
    } else {
      try {
        const data = await res.json();
        if (data.error) errorMsg = data.error;
      } catch {}
    }
    throw new Error(errorMsg);
  }

  return res.json();
}

export function fetchRequesterDashboard(): Promise<RequesterDashboardData> {
  return fetchDashboard<RequesterDashboardData>("requester");
}

export function fetchStaffDashboard(): Promise<StaffDashboardData> {
  return fetchDashboard<StaffDashboardData>("staff");
}

export function fetchAdminDashboard(): Promise<AdminDashboardData> {
  return fetchDashboard<AdminDashboardData>("admin");
}
