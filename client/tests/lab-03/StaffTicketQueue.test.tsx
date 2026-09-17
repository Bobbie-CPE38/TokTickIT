import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { StaffQueueScreen } from "../../src/features/staff/StaffQueueScreen.js";
import { RouterProvider } from "../../src/core/router/RouterContext.js";
import { AuthContext, AuthContextType } from "../../src/context/AuthContext.js";
import * as api from "../../src/api.js";

const mockStaffUser: api.AuthUser = {
  id: 2,
  name: "Michael Brown",
  email: "staff.michael@toktickit.com",
  role: "IT_STAFF",
  isActive: true,
  mustChangePassword: false,
};

const mockCategories: api.Category[] = [
  { id: 1, name: "Account and Access" },
  { id: 2, name: "Hardware" },
  { id: 3, name: "Software" },
  { id: 4, name: "Network" },
];

const mockTicketsData: api.StaffTicket[] = [
  {
    id: 101,
    ticketNumber: "TKT-2026-000101",
    summary: "Battery drains quickly",
    category: { id: 2, name: "Hardware" },
    requestedPriority: "MEDIUM",
    itPriority: "MEDIUM",
    currentStatus: "IN_PROGRESS",
    ticketOwner: { id: 2, name: "Michael Brown", email: "mbrown@toktickit.com" },
    isRequesterResolved: false,
    createdAt: "2026-05-13T09:14:00.000Z",
    updatedAt: "2026-05-13T10:00:00.000Z",
  },
  {
    id: 102,
    ticketNumber: "TKT-2026-000102",
    summary: "Cannot connect to campus VPN",
    category: { id: 4, name: "Network" },
    requestedPriority: "HIGH",
    itPriority: "HIGH",
    currentStatus: "OPEN",
    ticketOwner: null,
    isRequesterResolved: false,
    createdAt: "2026-05-12T08:02:00.000Z",
    updatedAt: "2026-05-12T08:30:00.000Z",
  },
];

const mockQueueResponse: api.StaffQueueResponse = {
  data: mockTicketsData,
  pagination: {
    total: 2,
    page: 1,
    pageSize: 10,
    totalPages: 1,
  },
};

function renderWithProviders(ui: React.ReactElement, user: api.AuthUser = mockStaffUser) {
  const authValue: AuthContextType = {
    user,
    token: "valid-staff-jwt-token",
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
      <RouterProvider>
        {ui}
      </RouterProvider>
    </AuthContext.Provider>
  );
}

describe("Lab 3 Staff Ticket Queue UI Tests (UI-05)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(api, "fetchCategories").mockResolvedValue(mockCategories);
    vi.spyOn(api, "fetchStaffTickets").mockResolvedValue(mockQueueResponse);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * UI-05: 8-Column Triage Table Rendering
   * FR-15, Section 5.4, 8-column justification
   */
  it("renders 8 operational column headers (Ticket No, Created Date, Summary, Category, Req. Priority, IT Priority, Status, Owner)", async () => {
    renderWithProviders(<StaffQueueScreen />);

    // Check table headers
    expect(await screen.findByRole("columnheader", { name: /ticket no/i })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /created date/i })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /summary/i })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /category/i })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /req\. priority/i })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /it priority/i })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /status/i })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /owner/i })).toBeInTheDocument();

    // Check row data (allowing both table cell and mobile card in DOM)
    const tkt101Elements = await screen.findAllByText("TKT-2026-000101");
    expect(tkt101Elements.length).toBeGreaterThanOrEqual(1);

    const summaryElements = screen.getAllByText("Battery drains quickly");
    expect(summaryElements.length).toBeGreaterThanOrEqual(1);

    const ownerElements = screen.getAllByText("Michael Brown");
    expect(ownerElements.length).toBeGreaterThanOrEqual(1);

    const tkt102Elements = screen.getAllByText("TKT-2026-000102");
    expect(tkt102Elements.length).toBeGreaterThanOrEqual(1);

    const unassignedElements = screen.getAllByText("Unassigned");
    expect(unassignedElements.length).toBeGreaterThanOrEqual(1);
  });

  /**
   * UI-05: Debounced Search Input (300ms)
   */
  it("triggers debounced search query when typing in the search input", async () => {
    renderWithProviders(<StaffQueueScreen />);

    await screen.findAllByText("TKT-2026-000101");

    const searchInput = screen.getByPlaceholderText(/search by ticket number or summary/i);
    fireEvent.change(searchInput, { target: { value: "VPN" } });

    await waitFor(
      () => {
        expect(api.fetchStaffTickets).toHaveBeenCalledWith(
          expect.objectContaining({ search: "VPN" })
        );
      },
      { timeout: 1000 }
    );
  });

  /**
   * UI-05: Filter Controls & Clear Filters Action
   */
  it("allows filtering by Status, Category, IT Priority, and Owner, with Clear Filters functionality", async () => {
    renderWithProviders(<StaffQueueScreen />);

    await screen.findAllByText("TKT-2026-000101");

    // Select Status filter
    const statusSelect = screen.getByLabelText(/filter by status/i);
    fireEvent.change(statusSelect, { target: { value: "OPEN" } });

    await waitFor(() => {
      expect(api.fetchStaffTickets).toHaveBeenCalledWith(
        expect.objectContaining({ status: "OPEN" })
      );
    });

    // Select IT Priority filter
    const prioritySelect = screen.getByLabelText(/filter by it priority/i);
    fireEvent.change(prioritySelect, { target: { value: "HIGH" } });

    await waitFor(() => {
      expect(api.fetchStaffTickets).toHaveBeenCalledWith(
        expect.objectContaining({ itPriority: "HIGH" })
      );
    });

    // Clear filters button resets filters
    const clearBtn = screen.getByRole("button", { name: /clear filters/i });
    fireEvent.click(clearBtn);

    await waitFor(() => {
      expect(api.fetchStaffTickets).toHaveBeenCalledWith(
        expect.objectContaining({
          status: undefined,
          itPriority: undefined,
          search: undefined,
        })
      );
    });
  });

  /**
   * UI-05: Column Header Sorting
   */
  it("toggles sorting when clicking sortable column headers", async () => {
    renderWithProviders(<StaffQueueScreen />);

    await screen.findAllByText("TKT-2026-000101");

    const ticketNoHeader = screen.getByRole("button", { name: /sort by ticket no/i });
    fireEvent.click(ticketNoHeader);

    await waitFor(() => {
      expect(api.fetchStaffTickets).toHaveBeenCalledWith(
        expect.objectContaining({ sortBy: "ticketNumber", sortOrder: "asc" })
      );
    });

    // Wait for the button state to reflect the sort
    await waitFor(() => {
      expect(screen.getByText("▲")).toBeInTheDocument();
    });

    // Click again to toggle desc
    fireEvent.click(screen.getByRole("button", { name: /sort by ticket no/i }));

    await waitFor(() => {
      expect(api.fetchStaffTickets).toHaveBeenCalledWith(
        expect.objectContaining({ sortBy: "ticketNumber", sortOrder: "desc" })
      );
    });
  });

  /**
   * UI-05: Pagination Controls
   */
  it("renders pagination controls and switches page when next is clicked", async () => {
    vi.spyOn(api, "fetchStaffTickets").mockResolvedValue({
      data: mockTicketsData,
      pagination: {
        total: 25,
        page: 1,
        pageSize: 10,
        totalPages: 3,
      },
    });

    renderWithProviders(<StaffQueueScreen />);

    expect(await screen.findByText(/Showing 1 to 10 of 25 tickets/i)).toBeInTheDocument();

    const nextBtn = screen.getByRole("button", { name: /next/i });
    expect(nextBtn).toBeEnabled();
    fireEvent.click(nextBtn);

    await waitFor(() => {
      expect(api.fetchStaffTickets).toHaveBeenCalledWith(
        expect.objectContaining({ page: 2 })
      );
    });
  });

  /**
   * UI-05: Empty State & No-Results State
   */
  it("displays empty state when total is 0 and no filters active", async () => {
    vi.spyOn(api, "fetchStaffTickets").mockResolvedValue({
      data: [],
      pagination: {
        total: 0,
        page: 1,
        pageSize: 10,
        totalPages: 0,
      },
    });

    renderWithProviders(<StaffQueueScreen />);

    expect(await screen.findByText(/No tickets found/i)).toBeInTheDocument();
  });

  it("displays no-results state with Clear Filters button when filters match zero tickets", async () => {
    vi.spyOn(api, "fetchStaffTickets").mockResolvedValue({
      data: [],
      pagination: {
        total: 0,
        page: 1,
        pageSize: 10,
        totalPages: 0,
      },
    });

    renderWithProviders(<StaffQueueScreen />);

    // Filter by status to make filters active
    const statusSelect = await screen.findByLabelText(/filter by status/i);
    fireEvent.change(statusSelect, { target: { value: "CLOSED" } });

    expect(await screen.findByText(/No items match your active filters/i)).toBeInTheDocument();
    const clearButtons = screen.getAllByRole("button", { name: /clear filters/i });
    expect(clearButtons.length).toBeGreaterThanOrEqual(1);
  });

  /**
   * UI-05: Mobile Responsive View
   */
  it("renders responsive card elements for mobile viewports", async () => {
    renderWithProviders(<StaffQueueScreen />);

    await screen.findAllByText("TKT-2026-000101");
    // Cards should be present in DOM (e.g. within a mobile card container)
    const cards = screen.getAllByTestId("staff-ticket-card");
    expect(cards.length).toBe(2);
  });
});
