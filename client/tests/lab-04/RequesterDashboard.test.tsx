import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import React from "react";
import { RequesterDashboard } from "../../src/features/dashboards/RequesterDashboard.js";
import { RoleDashboard } from "../../src/features/dashboards/RoleDashboard.js";
import { MyTicketsScreen } from "../../src/features/tickets/MyTicketsScreen.js";
import { AuthContext, AuthContextType } from "../../src/context/AuthContext.js";
import { RouterProvider } from "../../src/core/router/RouterContext.js";
import * as api from "../../src/api.js";
import * as dashboardsApi from "../../src/features/dashboards/api.js";
import { RequesterDashboardData } from "../../src/features/dashboards/types.js";

const mockRequesterUser: api.AuthUser = {
  id: 1,
  name: "Jennifer Anderson",
  email: "jennifer.anderson@kmutt.ac.th",
  role: "REQUESTER",
  isActive: true,
  mustChangePassword: false,
};

// Values mirror the Handout Page 6 wireframe
const mockRequesterDashboard: RequesterDashboardData = {
  metrics: {
    myOpenTickets: 3,
    waitingForRequester: 1,
    inProgress: 2,
    resolved: 5,
    closed: 12,
  },
  recentTickets: [
    {
      id: 34,
      ticketNumber: "TKT-2026-000234",
      summary: "Laptop battery drains quickly",
      currentStatus: "IN_PROGRESS",
      requestedPriority: "HIGH",
      category: { name: "Hardware" },
      updatedAt: "2026-05-12T09:14:00.000Z",
    },
    {
      id: 15,
      ticketNumber: "TKT-2026-000215",
      summary: "Need confirmation on VPN ID",
      currentStatus: "WAITING_FOR_REQUESTER",
      requestedPriority: "MEDIUM",
      category: { name: "Network" },
      updatedAt: "2026-05-10T16:10:00.000Z",
    },
    {
      id: 5,
      ticketNumber: "TKT-2026-000205",
      summary: "Email not arriving",
      currentStatus: "RESOLVED",
      requestedPriority: "LOW",
      category: { name: "Email" },
      updatedAt: "2026-05-07T21:20:00.000Z",
    },
  ],
};

function renderAsRequester(ui: React.ReactElement) {
  const authValue: AuthContextType = {
    user: mockRequesterUser,
    token: "mock-token",
    loading: false,
    isAuthenticated: true,
    mustChangePassword: false,
    login: vi.fn(),
    logout: vi.fn(),
    changePassword: vi.fn(),
    refreshUser: vi.fn(),
  };
  return render(
    <AuthContext.Provider value={authValue}>
      <RouterProvider>{ui}</RouterProvider>
    </AuthContext.Provider>
  );
}

describe("Lab 4 Requester Dashboard UI Tests (UI-04, UI-05)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    window.history.pushState({}, "", "/dashboard");
    vi.spyOn(dashboardsApi, "fetchRequesterDashboard").mockResolvedValue(mockRequesterDashboard);
  });

  afterEach(() => {
    window.history.pushState({}, "", "/");
  });

  it("UI-04: renders greeting and 4 KPI cards with drill-down links to /tickets (AC-02, FR-15, FR-17)", async () => {
    renderAsRequester(<RequesterDashboard />);

    expect(await screen.findByRole("heading", { name: "Welcome, Jennifer!" })).toBeInTheDocument();
    expect(screen.getByText("Here's the latest on your requests.")).toBeInTheDocument();

    const expected: Array<[string, number, string]> = [
      ["My Open Tickets", 3, "/tickets?filter=open"],
      ["In Progress", 2, "/tickets?status=IN_PROGRESS"],
      ["Resolved", 5, "/tickets?status=RESOLVED"],
      ["Closed", 12, "/tickets?status=CLOSED"],
    ];
    for (const [label, value, href] of expected) {
      const card = screen.getByRole("link", { name: new RegExp(`^${label}: ${value}\\.`) });
      expect(card).toHaveAttribute("href", href);
      expect(within(card).getByTestId("metric-value")).toHaveTextContent(String(value));
      expect(card).toHaveTextContent("View all");
    }
    expect(screen.getAllByTestId("metric-value")).toHaveLength(4);
    // Requester cards carry no staff trend badges
    expect(screen.queryByTestId("trend-badge")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("link", { name: /^Resolved: 5\./ }));
    expect(window.location.pathname + window.location.search).toBe("/tickets?status=RESOLVED");
  });

  it("UI-04: surfaces tickets waiting for the requester (attention required, BR-13)", async () => {
    renderAsRequester(<RequesterDashboard />);
    expect(await screen.findByText("1 ticket is waiting for your response.")).toBeInTheDocument();
  });

  it("UI-04: My Open Tickets drill-down requests filter=open from My Tickets", async () => {
    const ticketsSpy = vi.spyOn(api, "fetchTickets").mockResolvedValue({
      data: [],
      pagination: { total: 0, page: 1, pageSize: 10, totalPages: 0 },
    });
    vi.spyOn(api, "fetchCategories").mockResolvedValue([]);

    window.history.pushState({}, "", "/tickets?filter=open");
    renderAsRequester(<MyTicketsScreen onNavigateCreate={vi.fn()} />);

    await waitFor(() =>
      expect(ticketsSpy).toHaveBeenCalledWith(expect.objectContaining({ filter: "open", status: "" }), 1)
    );
    expect(screen.getByRole("combobox", { name: "Current Status" })).toHaveValue("OPEN_ALL");
  });

  it("UI-05: lists recent tickets with status badges and Attention Required only on waiting tickets (FR-16)", async () => {
    renderAsRequester(<RequesterDashboard />);

    const rows = await screen.findAllByTestId("dashboard-ticket-row");
    expect(rows).toHaveLength(3);

    expect(rows[0]).toHaveTextContent("TKT-2026-000234");
    expect(rows[0]).toHaveTextContent("In Progress");
    expect(rows[0]).not.toHaveTextContent("Attention Required");

    expect(rows[1]).toHaveTextContent("Waiting for Requester");
    expect(rows[1]).toHaveTextContent("Attention Required");

    expect(rows[2]).toHaveTextContent("Resolved");
    expect(within(rows[2]).getByRole("link", { name: "TKT-2026-000205" })).toHaveAttribute("href", "/tickets/5");

    expect(screen.getByRole("link", { name: /View My Tickets/ })).toHaveAttribute("href", "/tickets");
    expect(screen.getByRole("link", { name: /Create Ticket/ })).toHaveAttribute("href", "/tickets/new");
  });

  it("UI-05: renders a clean empty state when the requester has no tickets", async () => {
    vi.spyOn(dashboardsApi, "fetchRequesterDashboard").mockResolvedValue({
      metrics: { myOpenTickets: 0, waitingForRequester: 0, inProgress: 0, resolved: 0, closed: 0 },
      recentTickets: [],
    });
    renderAsRequester(<RequesterDashboard />);

    expect(await screen.findByText("You have not submitted any tickets yet.")).toBeInTheDocument();
    expect(screen.queryByText(/waiting for your response/)).not.toBeInTheDocument();
    expect(screen.getAllByTestId("metric-value").map((el) => el.textContent)).toEqual(["0", "0", "0", "0"]);
  });

  it("RoleDashboard mounts the Requester Dashboard for REQUESTER users", async () => {
    renderAsRequester(<RoleDashboard />);
    expect(await screen.findByTestId("requester-dashboard")).toBeInTheDocument();
  });
});
