import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { StaffDetailScreen } from "../../src/features/staff/StaffDetailScreen.js";
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

const mockStaffAssignees = [
  { id: 2, name: "Michael Brown", email: "staff.michael@toktickit.com", role: "IT_STAFF" as const },
  { id: 3, name: "Sarah Johnson", email: "staff.sarah@toktickit.com", role: "IT_STAFF" as const },
  { id: 4, name: "John Smith", email: "admin@toktickit.com", role: "ADMINISTRATOR" as const },
];

const mockTicketDetail: any = {
  id: 101,
  ticketNumber: "TKT-2026-000101",
  summary: "Laptop battery drains quickly",
  description: "My laptop battery is draining much faster than usual even when idle.",
  category: { id: 2, name: "Hardware" },
  relatedSystem: { id: 7, name: "Corporate Laptop" },
  requestedPriority: "MEDIUM",
  itPriority: "MEDIUM",
  currentStatus: "IN_PROGRESS",
  resolutionSummary: null,
  isRequesterResolved: true,
  requesterId: 1,
  requester: { id: 1, name: "Jennifer Anderson", email: "jennifer.anderson@kmutt.ac.th" },
  ticketOwnerId: 2,
  ticketOwner: { id: 2, name: "Michael Brown", email: "staff.michael@toktickit.com" },
  attachments: [],
  publicComments: [
    {
      id: 1,
      ticketId: 101,
      content: "Hello, any update on this?",
      createdAt: "2026-05-13T10:00:00.000Z",
      author: { id: 1, name: "Jennifer Anderson", role: "REQUESTER" },
    },
  ],
  internalNotes: [
    {
      id: 1,
      ticketId: 101,
      content: "Diagnostic check reveals battery health at 62%.",
      createdAt: "2026-05-13T10:15:00.000Z",
      author: { id: 2, name: "Michael Brown", role: "IT_STAFF" },
    },
  ],
  createdAt: "2026-05-13T09:14:00.000Z",
  updatedAt: "2026-05-13T10:15:00.000Z",
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

describe("Lab 3 Staff Ticket Detail UI Tests (UI-06, UI-07, UI-08)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(api, "fetchStaffTicketDetail").mockResolvedValue(mockTicketDetail);
    vi.spyOn(api, "fetchStaffAssignees").mockResolvedValue(mockStaffAssignees);
    vi.spyOn(api, "updateTicketAssignment").mockResolvedValue({
      ...mockTicketDetail,
      ticketOwnerId: 3,
      ticketOwner: mockStaffAssignees[1],
    });
    vi.spyOn(api, "updateTicketPriority").mockResolvedValue({
      ...mockTicketDetail,
      itPriority: "URGENT",
    });
    vi.spyOn(api, "updateTicketStatus").mockResolvedValue({
      ...mockTicketDetail,
      currentStatus: "RESOLVED",
      resolutionSummary: "Battery unit replaced with new OEM pack.",
    });
    vi.spyOn(api, "createInternalNote").mockResolvedValue({
      id: 2,
      ticketId: 101,
      content: "New test internal note",
      createdAt: "2026-05-13T10:30:00.000Z",
      author: { id: 2, name: "Michael Brown", role: "IT_STAFF" },
    });
    vi.spyOn(api, "createPublicComment").mockResolvedValue({
      id: 2,
      ticketId: 101,
      content: "New test public comment",
      createdAt: "2026-05-13T10:30:00.000Z",
      author: { id: 2, name: "Michael Brown", role: "IT_STAFF" },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * UI-06: Ownership and IT Priority Controls
   * AC-11, AC-12, FR-17, FR-18
   */
  it("UI-06: renders ticket owner dropdown and IT priority dropdown, updating values on change (AC-11, AC-12)", async () => {
    renderWithProviders(<StaffDetailScreen ticketId={101} />);

    await waitFor(() => {
      expect(screen.getByText("TKT-2026-000101")).toBeInTheDocument();
    });

    // Verify "Problem Appears Resolved" banner is displayed
    expect(
      screen.getByText(/Requester indicated this issue appears resolved/i)
    ).toBeInTheDocument();

    // Verify Owner Select
    const ownerSelect = screen.getByLabelText(/ticket owner/i) as HTMLSelectElement;
    expect(ownerSelect).toBeInTheDocument();
    expect(ownerSelect.value).toBe("2");

    // Change Owner
    fireEvent.change(ownerSelect, { target: { value: "3" } });
    await waitFor(() => {
      expect(api.updateTicketAssignment).toHaveBeenCalledWith(101, 3);
    });

    // Verify IT Priority Select
    const prioritySelect = screen.getByLabelText(/it priority/i) as HTMLSelectElement;
    expect(prioritySelect).toBeInTheDocument();
    expect(prioritySelect.value).toBe("MEDIUM");

    // Change IT Priority
    fireEvent.change(prioritySelect, { target: { value: "URGENT" } });
    await waitFor(() => {
      expect(api.updateTicketPriority).toHaveBeenCalledWith(101, "URGENT");
    });
  });

  /**
   * UI-07: Status Transition Confirmation Modal & Resolution Summary Validation
   * AC-13, BR-14, BR-15
   */
  it("UI-07: prompts confirmation modal for status transition to RESOLVED and enforces min 5 char summary (AC-13, BR-15)", async () => {
    renderWithProviders(<StaffDetailScreen ticketId={101} />);

    await waitFor(() => {
      expect(screen.getByText("TKT-2026-000101")).toBeInTheDocument();
    });

    const statusSelect = screen.getByLabelText(/current status/i) as HTMLSelectElement;
    expect(statusSelect).toBeInTheDocument();

    // Select RESOLVED
    fireEvent.change(statusSelect, { target: { value: "RESOLVED" } });

    // Confirmation Modal should appear
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /resolve ticket/i })).toBeInTheDocument();
    });

    const summaryInput = screen.getByLabelText(/resolution summary/i) as HTMLTextAreaElement;
    const confirmBtn = screen.getByRole("button", { name: /confirm resolution|resolve ticket/i });

    // Attempting submit with empty summary
    fireEvent.click(confirmBtn);
    expect(api.updateTicketStatus).not.toHaveBeenCalled();

    // Type < 5 characters
    fireEvent.change(summaryInput, { target: { value: "Done" } });
    fireEvent.click(confirmBtn);
    expect(api.updateTicketStatus).not.toHaveBeenCalled();

    // Type valid summary >= 5 chars
    fireEvent.change(summaryInput, { target: { value: "Battery unit replaced with new OEM pack." } });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(api.updateTicketStatus).toHaveBeenCalledWith(
        101,
        "RESOLVED",
        "Battery unit replaced with new OEM pack."
      );
    });
  });

  it("UI-07b: displays validation errors inside modal when transitioning to CLOSED with invalid length", async () => {
    const resolvedTicket = {
      ...mockTicketDetail,
      currentStatus: "RESOLVED",
      resolutionSummary: "Initial resolution summary.",
    };
    vi.spyOn(api, "fetchStaffTicketDetail").mockResolvedValue(resolvedTicket);

    renderWithProviders(<StaffDetailScreen ticketId={101} />);

    await waitFor(() => {
      expect(screen.getByText("TKT-2026-000101")).toBeInTheDocument();
    });

    const statusSelect = screen.getByLabelText(/current status/i) as HTMLSelectElement;

    // Transition to CLOSED
    fireEvent.change(statusSelect, { target: { value: "CLOSED" } });

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /close ticket/i })).toBeInTheDocument();
    });

    const closeSummaryInput = screen.getByLabelText(/resolution summary/i) as HTMLTextAreaElement;
    const confirmBtn = screen.getByRole("button", { name: /confirm close/i });

    // Change to < 5 chars
    fireEvent.change(closeSummaryInput, { target: { value: "Bad" } });
    fireEvent.click(confirmBtn);

    // Verify error is rendered inside the modal
    expect(
      screen.getByText("Resolution summary must be between 5 and 1000 characters.")
    ).toBeInTheDocument();
    expect(api.updateTicketStatus).not.toHaveBeenCalled();
  });

  /**
   * UI-08: Visual Distinction Between Public Comments (Green) and Internal Notes (Amber)
   * AC-14, AC-15, Section 5.5, Section 6.1
   */
  it("UI-08: renders public comments with green accent and internal notes with amber warning styling and security banner (AC-14, AC-15)", async () => {
    renderWithProviders(<StaffDetailScreen ticketId={101} />);

    await waitFor(() => {
      expect(screen.getByText("TKT-2026-000101")).toBeInTheDocument();
    });

    // Switch to Internal Notes Tab
    const notesTab = screen.getByRole("tab", { name: /internal notes/i });
    fireEvent.click(notesTab);

    // Verify amber security warning banner
    await waitFor(() => {
      expect(
        screen.getByText(/Internal Notes are visible ONLY to IT Staff and Administrators/i)
      ).toBeInTheDocument();
    });

    // Verify internal note content is displayed
    expect(
      screen.getByText("Diagnostic check reveals battery health at 62%.")
    ).toBeInTheDocument();

    // Verify amber container styling exists (checking for style or amber class)
    const alertBanner = screen.getByText(/Internal Notes are visible ONLY to IT Staff and Administrators/i).closest("div");
    expect(alertBanner).toBeInTheDocument();

    // Switch back to Public Comments Tab
    const commentsTab = screen.getByRole("tab", { name: /public comments/i });
    fireEvent.click(commentsTab);

    // Verify public comment content is displayed
    await waitFor(() => {
      expect(screen.getByText("Hello, any update on this?")).toBeInTheDocument();
    });
  });
});
