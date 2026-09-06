import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import App from "../../src/App.js";
import * as api from "../../src/api.js";

const mockActiveRequesters: api.DevelopmentRequester[] = [
  {
    id: 1,
    name: "Jennifer Anderson",
    email: "jennifer.anderson@kmutt.ac.th",
    department: "Computer Engineering",
  },
  {
    id: 2,
    name: "David Lee",
    email: "david.lee@kmutt.ac.th",
    department: "Information Technology",
  },
];

const mockCategories: api.Category[] = [
  { id: 1, name: "Account and Access" },
  { id: 2, name: "Hardware" },
  { id: 3, name: "Software" },
  { id: 4, name: "Network" },
];

const mockRequesterATickets: api.TicketListResponse = {
  data: [
    {
      id: 101,
      ticketNumber: "TKT-2025-001234",
      summary: "Laptop battery drains quickly",
      requestedPriority: "MEDIUM",
      itPriority: "MEDIUM",
      currentStatus: "IN_PROGRESS",
      ticketOwner: "Michael Brown",
      categoryId: 2,
      categoryName: "Hardware",
      relatedSystemId: 2,
      relatedSystemName: "Corporate Laptop",
      attachmentCount: 1,
      createdAt: "2025-05-12T09:14:00.000Z",
      updatedAt: "2025-05-13T10:30:00.000Z",
    },
    {
      id: 102,
      ticketNumber: "TKT-2025-001233",
      summary: "Cannot connect to VPN",
      requestedPriority: "HIGH",
      itPriority: "HIGH",
      currentStatus: "OPEN",
      ticketOwner: "Sarah Johnson",
      categoryId: 4,
      categoryName: "Network",
      relatedSystemId: 3,
      relatedSystemName: "VPN",
      attachmentCount: 0,
      createdAt: "2025-05-12T08:02:00.000Z",
      updatedAt: "2025-05-13T09:45:00.000Z",
    },
    {
      id: 103,
      ticketNumber: "TKT-2025-001232",
      summary: "Email not syncing on mobile",
      requestedPriority: "MEDIUM",
      itPriority: "MEDIUM",
      currentStatus: "IN_PROGRESS",
      ticketOwner: "David Lee",
      categoryId: 3,
      categoryName: "Software",
      relatedSystemId: 1,
      relatedSystemName: "Email",
      attachmentCount: 0,
      createdAt: "2025-05-11T16:45:00.000Z",
      updatedAt: "2025-05-12T15:20:00.000Z",
    },
  ],
  pagination: {
    total: 3,
    page: 1,
    pageSize: 10,
    totalPages: 1,
  },
};

const mockRequesterBTickets: api.TicketListResponse = {
  data: [
    {
      id: 201,
      ticketNumber: "TKT-2025-002001",
      summary: "Printer keeps showing offline",
      requestedPriority: "MEDIUM",
      itPriority: "LOW",
      currentStatus: "OPEN",
      ticketOwner: "Michael Brown",
      categoryId: 2,
      categoryName: "Hardware",
      relatedSystemId: 6,
      relatedSystemName: "Printer",
      attachmentCount: 0,
      createdAt: "2025-05-10T14:10:00.000Z",
      updatedAt: "2025-05-11T10:15:00.000Z",
    },
  ],
  pagination: {
    total: 1,
    page: 1,
    pageSize: 10,
    totalPages: 1,
  },
};

const mockEmptyTickets: api.TicketListResponse = {
  data: [],
  pagination: {
    total: 0,
    page: 1,
    pageSize: 10,
    totalPages: 0,
  },
};

describe("Lab 2 My Tickets UI Tests (UI-05, UI-06, UI-07)", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    vi.spyOn(api, "fetchActiveRequesters").mockResolvedValue(mockActiveRequesters);
    vi.spyOn(api, "fetchCategories").mockResolvedValue(mockCategories);
    vi.spyOn(api, "fetchRelatedSystems").mockResolvedValue([]);
    vi.spyOn(api, "fetchTickets").mockResolvedValue(mockRequesterATickets);
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  /**
   * UI-05: Requester identity switch in MyTickets (AC-04, BR-16)
   */
  it("UI-05: updates requester context and triggers fresh API fetch for the new user (AC-04, BR-16)", async () => {
    localStorage.setItem("toktickit_requester_id", "1");

    const fetchTicketsSpy = vi
      .spyOn(api, "fetchTickets")
      .mockImplementation(async (params, reqId) => {
        if (reqId === 1) return mockRequesterATickets;
        if (reqId === 2) return mockRequesterBTickets;
        return mockEmptyTickets;
      });

    render(<App />);

    // Initially loads Requester A tickets
    expect((await screen.findAllByText(/TKT-2025-001234/i)).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Laptop battery drains quickly/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Cannot connect to VPN/i).length).toBeGreaterThanOrEqual(1);
    expect(fetchTicketsSpy).toHaveBeenCalledWith(expect.anything(), 1);

    // Switch requester to David Lee (id: 2)
    const profileBtn = screen.getByRole("button", { name: /Profile/i });
    fireEvent.click(profileBtn);

    const switchBtn = screen.getByRole("button", { name: /Switch Requester|Change Requester/i });
    fireEvent.click(switchBtn);

    const select = screen.getByRole("combobox", { name: /Select Requester/i }) as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "2" } });

    const continueBtn = screen.getByRole("button", { name: /Continue/i });
    fireEvent.click(continueBtn);

    // Should immediately refresh and show David Lee's ticket
    await waitFor(() => {
      expect(screen.getAllByText(/TKT-2025-002001/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/Printer keeps showing offline/i).length).toBeGreaterThanOrEqual(1);
    });

    // Requester A's tickets should no longer be visible
    expect(screen.queryByText(/TKT-2025-001234/i)).not.toBeInTheDocument();
    expect(fetchTicketsSpy).toHaveBeenCalledWith(expect.anything(), 2);
  });

  /**
   * UI-06: Filter and Search controls in MyTickets (AC-09, FR-11)
   */
  it("UI-06: updates query and table results when search and filters change, and resets on Clear Filters (AC-09, FR-11)", async () => {
    localStorage.setItem("toktickit_requester_id", "1");

    const fetchTicketsSpy = vi
      .spyOn(api, "fetchTickets")
      .mockImplementation(async (params = {}) => {
        if (params.search === "battery") {
          return {
            data: [mockRequesterATickets.data[0]],
            pagination: { total: 1, page: 1, pageSize: 10, totalPages: 1 },
          };
        }
        if (params.categoryId === "2" || params.categoryId === 2) {
          return {
            data: [mockRequesterATickets.data[0]],
            pagination: { total: 1, page: 1, pageSize: 10, totalPages: 1 },
          };
        }
        return mockRequesterATickets;
      });

    render(<App />);

    expect((await screen.findAllByText(/TKT-2025-001234/i)).length).toBeGreaterThanOrEqual(1);

    // Type in search box
    const searchInput = screen.getByPlaceholderText(/Search by ticket number or summary/i);
    fireEvent.change(searchInput, { target: { value: "battery" } });

    // Wait for search call
    await waitFor(() => {
      expect(fetchTicketsSpy).toHaveBeenCalledWith(
        expect.objectContaining({ search: "battery" }),
        1
      );
    });

    // Select category filter
    const categorySelect = screen.getByLabelText(/Category/i) as HTMLSelectElement;
    fireEvent.change(categorySelect, { target: { value: "2" } });

    await waitFor(() => {
      expect(fetchTicketsSpy).toHaveBeenCalledWith(
        expect.objectContaining({ categoryId: "2" }),
        1
      );
    });

    // Click "Clear Filters"
    const clearBtn = screen.getAllByRole("button", { name: /Clear Filters/i })[0];
    fireEvent.click(clearBtn);

    // Verify search and category inputs are reset
    await waitFor(() => {
      expect((searchInput as HTMLInputElement).value).toBe("");
      expect(categorySelect.value).toBe("");
    });
  });

  /**
   * UI-07: Empty State vs No Results State (FR-10, FR-11)
   */
  it("UI-07: displays specific empty message when user has 0 tickets vs no matching filter results (FR-10, FR-11)", async () => {
    localStorage.setItem("toktickit_requester_id", "1");

    vi.spyOn(api, "fetchTickets").mockResolvedValue(mockEmptyTickets);

    render(<App />);

    // 1. Clean Empty State (0 tickets overall)
    expect(await screen.findByText(/No support tickets yet/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Get started by creating your first IT support ticket/i)
    ).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /\+ Create Ticket|Create Ticket/i }).length).toBeGreaterThanOrEqual(1);

    // 2. Filter / Search applied yielding 0 results -> No Results State
    const searchInput = screen.getByPlaceholderText(/Search by ticket number or summary/i);
    fireEvent.change(searchInput, { target: { value: "nonexistent" } });

    await waitFor(() => {
      expect(screen.getByText(/No tickets match your filter criteria/i)).toBeInTheDocument();
    });
    expect(screen.getAllByRole("button", { name: /Clear Filters/i }).length).toBeGreaterThanOrEqual(1);
  });

  it("renders data table with sortable columns, status badges, priority badges, and pagination", async () => {
    localStorage.setItem("toktickit_requester_id", "1");
    vi.spyOn(api, "fetchTickets").mockResolvedValue({
      data: mockRequesterATickets.data,
      pagination: {
        total: 42,
        page: 1,
        pageSize: 8,
        totalPages: 6,
      },
    });

    render(<App />);

    expect((await screen.findAllByText(/TKT-2025-001234/i)).length).toBeGreaterThanOrEqual(1);

    // Check table headers
    expect(screen.getByText(/Ticket No\./i)).toBeInTheDocument();
    expect(screen.getByText(/Created Date/i)).toBeInTheDocument();
    expect(screen.getByText(/Summary/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Category/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Requested Priority/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/IT Priority/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Current Status/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Ticket Owner/i)).toBeInTheDocument();
    expect(screen.getByText(/Last Updated/i)).toBeInTheDocument();

    // Check pagination bar text: Showing 1 to 8 of 42 tickets
    expect(screen.getByText(/Showing 1 to 8 of 42 tickets/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Previous/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Next/i })).toBeInTheDocument();
  });

  it("handles API error with friendly alert and Retry action", async () => {
    localStorage.setItem("toktickit_requester_id", "1");
    const fetchSpy = vi
      .spyOn(api, "fetchTickets")
      .mockRejectedValueOnce(new Error("Database connection lost"))
      .mockResolvedValue(mockRequesterATickets);

    render(<App />);

    expect(await screen.findByText(/Unable to load tickets from server/i)).toBeInTheDocument();

    // Click retry
    const retryBtn = screen.getByRole("button", { name: /Retry/i });
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.getAllByText(/TKT-2025-001234/i).length).toBeGreaterThanOrEqual(1);
      expect(fetchSpy.mock.calls.length).toBeGreaterThanOrEqual(2);
    });
  });
});
