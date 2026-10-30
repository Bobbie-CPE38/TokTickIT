import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import React from "react";
import { StaffDashboard } from "../../src/features/dashboards/StaffDashboard.js";
import { AdminDashboard } from "../../src/features/dashboards/AdminDashboard.js";
import { StaffQueueScreen } from "../../src/features/staff/StaffQueueScreen.js";
import { App } from "../../src/App.js";
import { AuthContext, AuthContextType } from "../../src/context/AuthContext.js";
import { RouterProvider } from "../../src/core/router/RouterContext.js";
import * as api from "../../src/api.js";
import * as dashboardsApi from "../../src/features/dashboards/api.js";
import { AdminDashboardData, StaffDashboardData } from "../../src/features/dashboards/types.js";

const mockStaffUser: api.AuthUser = {
  id: 2,
  name: "Michael Brown",
  email: "staff.michael@toktickit.com",
  role: "IT_STAFF",
  isActive: true,
  mustChangePassword: false,
};

const mockAdminUser: api.AuthUser = {
  id: 9,
  name: "John Smith",
  email: "admin@toktickit.com",
  role: "ADMINISTRATOR",
  isActive: true,
  mustChangePassword: false,
};

// Values mirror the Handout Page 5 wireframe
const mockStaffDashboard: StaffDashboardData = {
  metrics: {
    new: 14,
    open: 23,
    inProgress: 18,
    waitingForRequester: 7,
    myAssigned: 16,
    unassigned: 8,
    myActionsCount: 42,
  },
  trends: {
    newDelta: 3,
    openDelta: -2,
    inProgressDelta: -1,
    waitingForRequesterDelta: 1,
    myAssignedDelta: 0,
  },
  urgentTickets: [
    {
      id: 9,
      ticketNumber: "TKT-2026-000210",
      summary: "Core database server outage",
      currentStatus: "IN_PROGRESS",
      itPriority: "URGENT",
      ticketOwner: { id: 2, name: "Michael Brown" },
      updatedAt: "2026-05-12T08:00:00.000Z",
    },
  ],
  recentTickets: [
    {
      id: 12,
      ticketNumber: "TKT-2026-000234",
      summary: "Laptop battery drains quickly",
      currentStatus: "IN_PROGRESS",
      itPriority: "MEDIUM",
      ticketOwner: null,
      updatedAt: "2026-05-12T09:14:00.000Z",
    },
    {
      id: 9,
      ticketNumber: "TKT-2026-000210",
      summary: "Core database server outage",
      currentStatus: "IN_PROGRESS",
      itPriority: "URGENT",
      ticketOwner: { id: 2, name: "Michael Brown" },
      updatedAt: "2026-05-12T08:00:00.000Z",
    },
  ],
};

const mockAdminDashboard: AdminDashboardData = {
  operationalMetrics: mockStaffDashboard.metrics,
  trends: mockStaffDashboard.trends,
  urgentTickets: mockStaffDashboard.urgentTickets,
  recentTickets: mockStaffDashboard.recentTickets,
  userStats: {
    totalUsers: 25,
    activeUsers: 23,
    inactiveUsers: 2,
    requesterCount: 18,
    staffCount: 5,
    adminCount: 2,
  },
};

function renderWithUser(ui: React.ReactElement, user: api.AuthUser) {
  const authValue: AuthContextType = {
    user,
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

function currentUrl() {
  return window.location.pathname + window.location.search;
}

// WCAG relative luminance contrast ratio
function contrastRatio(hexA: string, hexB: string): number {
  const lum = (hex: string) => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
    const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  };
  const [hi, lo] = [lum(hexA), lum(hexB)].sort((a, b) => b - a);
  return (hi + 0.05) / (lo + 0.05);
}

describe("Lab 4 Staff & Admin Dashboard UI Tests (UI-01, UI-02, UI-03, STYLE-01)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    window.history.pushState({}, "", "/dashboard");
    vi.spyOn(dashboardsApi, "fetchStaffDashboard").mockResolvedValue(mockStaffDashboard);
    vi.spyOn(dashboardsApi, "fetchAdminDashboard").mockResolvedValue(mockAdminDashboard);
  });

  afterEach(() => {
    window.history.pushState({}, "", "/");
  });

  it("UI-01: renders greeting, 5 KPI cards with counts, and trend badges (AC-12, FR-18)", async () => {
    renderWithUser(<StaffDashboard />, mockStaffUser);

    expect(await screen.findByRole("heading", { name: "Welcome back, Michael!" })).toBeInTheDocument();
    expect(screen.getByText("Here's what's happening with your queue today.")).toBeInTheDocument();

    const expected: Array<[string, number, string]> = [
      ["New", 14, "+3 from yesterday"],
      ["Open", 23, "-2 from yesterday"],
      ["In Progress", 18, "-1 from yesterday"],
      ["Waiting for Requester", 7, "+1 from yesterday"],
      ["My Assigned", 16, "No change from yesterday"],
    ];
    for (const [label, value, trend] of expected) {
      const card = screen.getByRole("link", { name: new RegExp(`^${label}: ${value}\\.`) });
      expect(within(card).getByTestId("metric-value")).toHaveTextContent(String(value));
      expect(within(card).getByTestId("trend-badge")).toHaveTextContent(trend);
    }

    // Secondary queue stats: unassigned and current-user Actions Taken volume
    expect(screen.getByRole("link", { name: /Unassigned: 8/ })).toBeInTheDocument();
    expect(screen.getByText("My Actions Recorded: 42")).toBeInTheDocument();
  });

  it("UI-01: pins urgent tickets first and de-duplicates them from the recent list", async () => {
    renderWithUser(<StaffDashboard />, mockStaffUser);

    const rows = await screen.findAllByTestId("dashboard-ticket-row");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent("TKT-2026-000210");
    expect(rows[0]).toHaveTextContent("Urgent");
    expect(rows[1]).toHaveTextContent("TKT-2026-000234");
    expect(within(rows[0]).getByRole("link", { name: "TKT-2026-000210" })).toHaveAttribute("href", "/queue/9");
  });

  it("UI-01: shows empty state when there are no recent tickets", async () => {
    vi.spyOn(dashboardsApi, "fetchStaffDashboard").mockResolvedValue({
      ...mockStaffDashboard,
      urgentTickets: [],
      recentTickets: [],
    });
    renderWithUser(<StaffDashboard />, mockStaffUser);
    expect(await screen.findByText("No recent tickets to display.")).toBeInTheDocument();
  });

  it("UI-02: KPI cards drill down to /queue with the matching filter (FR-20)", async () => {
    renderWithUser(<StaffDashboard />, mockStaffUser);
    await screen.findByRole("heading", { name: "Welcome back, Michael!" });

    const targets: Array<[RegExp, string]> = [
      [/^New: 14\./, "/queue?status=NEW"],
      [/^Open: 23\./, "/queue?status=OPEN"],
      [/^In Progress: 18\./, "/queue?status=IN_PROGRESS"],
      [/^Waiting for Requester: 7\./, "/queue?status=WAITING_FOR_REQUESTER"],
      [/^My Assigned: 16\./, "/queue?owner=me"],
      [/^Unassigned: 8\./, "/queue?owner=unassigned"],
    ];
    for (const [name, href] of targets) {
      expect(screen.getByRole("link", { name })).toHaveAttribute("href", href);
    }

    fireEvent.click(screen.getByRole("link", { name: /^New: 14\./ }));
    expect(currentUrl()).toBe("/queue?status=NEW");
  });

  it("UI-02: drill-down destination applies ?status and ?owner=me filters to the queue request", async () => {
    const queueSpy = vi.spyOn(api, "fetchStaffTickets").mockResolvedValue({
      data: [],
      pagination: { total: 0, page: 1, pageSize: 10, totalPages: 0 },
    });
    vi.spyOn(api, "fetchCategories").mockResolvedValue([]);

    window.history.pushState({}, "", "/queue?status=NEW");
    const { unmount } = renderWithUser(<StaffQueueScreen />, mockStaffUser);
    await waitFor(() => expect(queueSpy).toHaveBeenCalledWith(expect.objectContaining({ status: "NEW" })));
    expect(screen.getByRole("combobox", { name: "Filter by Status" })).toHaveValue("NEW");
    unmount();

    queueSpy.mockClear();
    window.history.pushState({}, "", "/queue?owner=me");
    renderWithUser(<StaffQueueScreen />, mockStaffUser);
    await waitFor(() =>
      expect(queueSpy).toHaveBeenCalledWith(expect.objectContaining({ ticketOwnerId: mockStaffUser.id }))
    );
    expect(screen.getByRole("combobox", { name: "Filter by Owner" })).toHaveValue("me");
  });

  it("UI-03: Quick Actions link to ticket creation, queue search, and My Queue (FR-19)", async () => {
    renderWithUser(<StaffDashboard />, mockStaffUser);
    await screen.findByRole("heading", { name: "Quick Actions" });

    expect(screen.getByRole("link", { name: /Create Ticket/ })).toHaveAttribute("href", "/tickets/new");
    expect(screen.getByRole("link", { name: /Search Tickets/ })).toHaveAttribute("href", "/queue?focus=search");
    expect(screen.getByRole("link", { name: /My Queue/ })).toHaveAttribute("href", "/queue?owner=me");

    fireEvent.click(screen.getByRole("link", { name: /Create Ticket/ }));
    expect(currentUrl()).toBe("/tickets/new");
  });

  it("Refresh button locks with busy state while reloading (BR-18)", async () => {
    renderWithUser(<StaffDashboard />, mockStaffUser);
    const refresh = await screen.findByRole("button", { name: /Refresh/ });

    let release: (v: StaffDashboardData) => void = () => {};
    vi.spyOn(dashboardsApi, "fetchStaffDashboard").mockImplementation(
      () => new Promise((resolve) => (release = resolve))
    );
    fireEvent.click(refresh);

    const busy = await screen.findByRole("button", { name: /Refreshing/ });
    expect(busy).toBeDisabled();
    // Existing metrics stay visible during refresh
    expect(screen.getByRole("link", { name: /^New: 14\./ })).toBeInTheDocument();

    release(mockStaffDashboard);
    await waitFor(() => expect(screen.getByRole("button", { name: /Refresh/ })).not.toBeDisabled());
  });

  it("shows a safe error alert with Retry when the dashboard request fails", async () => {
    const spy = vi
      .spyOn(dashboardsApi, "fetchStaffDashboard")
      .mockRejectedValueOnce(new Error("You do not have permission to view this dashboard."))
      .mockResolvedValueOnce(mockStaffDashboard);
    renderWithUser(<StaffDashboard />, mockStaffUser);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("You do not have permission to view this dashboard.");

    fireEvent.click(within(alert).getByRole("button", { name: "Retry" }));
    expect(await screen.findByRole("link", { name: /^New: 14\./ })).toBeInTheDocument();
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it("STYLE-01: trend and status badges use Zen Green tokens with WCAG AA contrast (DoD-01)", async () => {
    renderWithUser(<StaffDashboard />, mockStaffUser);

    const positive = within(await screen.findByRole("link", { name: /^New: 14\./ })).getByTestId("trend-badge");
    expect(positive).toHaveStyle({ backgroundColor: "#D1FAE5", color: "#065F46" });

    const negative = within(screen.getByRole("link", { name: /^Open: 23\./ })).getByTestId("trend-badge");
    expect(negative).toHaveStyle({ backgroundColor: "#F3F4F6", color: "#4B5563" });

    const unchanged = within(screen.getByRole("link", { name: /^My Assigned: 16\./ })).getByTestId("trend-badge");
    expect(unchanged).toHaveStyle({ backgroundColor: "#F3F4F6", color: "#4B5563" });

    const pairs: Array<[string, string]> = [
      ["#065F46", "#D1FAE5"], // positive trend
      ["#4B5563", "#F3F4F6"], // neutral trend
      ["#1C2D27", "#FFFFFF"], // primary text on card
      ["#52665D", "#FFFFFF"], // muted labels on card
      ["#0B7A46", "#FFFFFF"], // links
      ["#B45309", "#FEF3C7"], // attention required
      ["#FFFFFF", "#006B3C"], // header text
    ];
    for (const [fg, bg] of pairs) {
      expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("Administrator dashboard shows operational cards plus user governance and no Create Ticket shortcut (AC-13, FR-21)", async () => {
    renderWithUser(<AdminDashboard />, mockAdminUser);

    expect(await screen.findByRole("heading", { name: "Welcome back, John!" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^New: 14\./ })).toHaveAttribute("href", "/queue?status=NEW");

    const governance = screen.getByRole("region", { name: "User Governance" });
    const expected: Array<[string, string]> = [
      ["Total Users", "25"],
      ["Active", "23"],
      ["Inactive", "2"],
      ["Requesters", "18"],
      ["IT Staff", "5"],
      ["Administrators", "2"],
    ];
    for (const [label, value] of expected) {
      expect(within(governance).getByText(label).nextElementSibling).toHaveTextContent(value);
    }
    expect(within(governance).getByRole("link", { name: "Manage users" })).toHaveAttribute("href", "/admin/users");

    expect(screen.queryByRole("link", { name: /Create Ticket/ })).not.toBeInTheDocument();
  });

  it("App shell: /dashboard renders the role dashboard with an active Dashboard tab", async () => {
    localStorage.setItem("toktickit_auth_token", "mock-token");
    localStorage.setItem("toktickit_auth_user", JSON.stringify(mockStaffUser));
    vi.spyOn(api, "fetchCurrentUser").mockResolvedValue(mockStaffUser);
    window.history.pushState({}, "", "/dashboard");

    render(<App />);

    expect(await screen.findByRole("heading", { name: "Welcome back, Michael!" })).toBeInTheDocument();
    const tab = screen.getByRole("button", { name: "Dashboard" });
    expect(tab).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("button", { name: "My Queue" })).not.toHaveAttribute("aria-current");
  });
});
