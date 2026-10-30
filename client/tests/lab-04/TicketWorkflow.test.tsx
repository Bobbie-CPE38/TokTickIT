import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { StaffDetailScreen } from "../../src/features/staff/StaffDetailScreen.js";
import { AuthContext, AuthContextType } from "../../src/context/AuthContext.js";
import { RouterProvider } from "../../src/core/router/RouterContext.js";
import * as api from "../../src/api.js";
import * as actionsApi from "../../src/features/actions-taken/api.js";

const mockStaffUser: api.AuthUser = {
  id: 2,
  name: "Michael Brown",
  email: "staff.michael@toktickit.com",
  role: "IT_STAFF",
  isActive: true,
  mustChangePassword: false,
};

const mockTicketWithoutActions: api.StaffTicketDetail = {
  id: 12,
  ticketNumber: "TKT-2026-000012",
  summary: "Laptop battery issues",
  description: "Battery discharges rapidly.",
  categoryId: 2,
  category: { id: 2, name: "Hardware" },
  relatedSystemId: 7,
  relatedSystem: { id: 7, name: "Corporate Laptop" },
  requestedPriority: "HIGH",
  itPriority: "HIGH",
  currentStatus: "IN_PROGRESS",
  resolutionSummary: null,
  isRequesterResolved: true,
  requesterId: 1,
  requester: { id: 1, name: "Jennifer Anderson", email: "jennifer.anderson@kmutt.ac.th", role: "REQUESTER" },
  ticketOwnerId: 2,
  ticketOwner: { id: 2, name: "Michael Brown", email: "staff.michael@toktickit.com", role: "IT_STAFF" },
  attachments: [],
  publicComments: [],
  internalNotes: [],
  actionsTaken: [],
  createdAt: "2026-05-12T09:00:00.000Z",
  updatedAt: "2026-05-12T09:14:00.000Z",
};

const mockAction = {
  id: 1,
  ticketId: 12,
  actionDateTime: "2026-05-12T10:00:00.000Z",
  description: "Diagnosed battery cells and power circuits.",
  result: "Cell degradation confirmed, replacement ordered.",
  performedByUserId: 2,
  performedBy: { id: 2, name: "Michael Brown", email: "staff.michael@toktickit.com", role: "IT_STAFF" as const },
  isFollowUpRequired: false,
  followUpNote: null,
  attachmentNotes: null,
  createdAt: "2026-05-12T10:00:00.000Z",
  updatedAt: "2026-05-12T10:00:00.000Z",
};

const mockTicketWithActions: api.StaffTicketDetail = {
  ...mockTicketWithoutActions,
  actionsTaken: [mockAction],
};

function renderComponent(ticketData = mockTicketWithoutActions, actionsData: any[] = []) {
  const authValue: AuthContextType = {
    user: mockStaffUser,
    token: "fake-jwt-token",
    loading: false,
    isAuthenticated: true,
    mustChangePassword: false,
    login: vi.fn(),
    logout: vi.fn(),
    changePassword: vi.fn(),
    refreshUser: vi.fn(),
  };

  vi.spyOn(api, "fetchStaffTicketDetail").mockResolvedValue(ticketData);
  vi.spyOn(api, "fetchStaffAssignees").mockResolvedValue([
    { id: 2, name: "Michael Brown", email: "staff.michael@toktickit.com", role: "IT_STAFF" },
  ]);
  vi.spyOn(api, "fetchActionsTaken").mockResolvedValue(actionsData);
  vi.spyOn(actionsApi, "fetchActionsTaken").mockResolvedValue(actionsData);

  return render(
    <AuthContext.Provider value={authValue}>
      <RouterProvider>
        <StaffDetailScreen ticketId={12} />
      </RouterProvider>
    </AuthContext.Provider>
  );
}

describe("Lab 4 Ticket Workflow UI Component Tests (UI-09, UI-10, UI-11)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * UI-09: TicketWorkflow Resolution Gate: 0 Actions Taken disables resolution
   * AC-08, BR-09
   */
  it("UI-09: Resolution Modal blocks resolution when ticket has 0 Actions Taken: displays warning banner and disables Confirm Resolution button (AC-08, BR-09)", async () => {
    renderComponent(mockTicketWithoutActions, []);

    // Wait for screen to load
    await waitFor(() => {
      expect(screen.getByText("TKT-2026-000012")).toBeInTheDocument();
    });

    // Select RESOLVED in status dropdown
    const statusSelect = screen.getByLabelText("Current Status");
    fireEvent.change(statusSelect, { target: { value: "RESOLVED" } });

    // Resolution Modal opens
    await waitFor(() => {
      expect(screen.getByText("Resolve Ticket")).toBeInTheDocument();
    });

    // Resolution Gate warning banner must be visible
    expect(
      screen.getByText(/At least one Action Taken must be recorded before/i)
    ).toBeInTheDocument();

    // Confirm Resolution button must be disabled
    const confirmBtn = screen.getByRole("button", { name: /Confirm Resolution/i });
    expect(confirmBtn).toBeDisabled();
  });

  /**
   * UI-10: TicketWorkflow Resolution Gate: Requires non-empty resolution summary
   * AC-09, BR-09
   */
  it("UI-10: Resolution Modal requires non-empty resolutionSummary (>= 5 chars) with character counter (AC-09, BR-09)", async () => {
    const user = userEvent.setup();
    renderComponent(mockTicketWithActions, [mockAction]);

    await waitFor(() => {
      expect(screen.getByText("TKT-2026-000012")).toBeInTheDocument();
    });

    const statusSelect = screen.getByLabelText("Current Status");
    fireEvent.change(statusSelect, { target: { value: "RESOLVED" } });

    await waitFor(() => {
      expect(screen.getByText("Resolve Ticket")).toBeInTheDocument();
    });

    // No 0-action warning banner should be displayed
    expect(
      screen.queryByText(/At least one Action Taken must be recorded before/i)
    ).not.toBeInTheDocument();

    // Resolution summary textarea is present
    const summaryInput = screen.getByLabelText(/Resolution Summary/i);
    expect(summaryInput).toBeInTheDocument();

    // Confirm Resolution button is initially disabled (since length < 5)
    const confirmBtn = screen.getByRole("button", { name: /Confirm Resolution/i });
    expect(confirmBtn).toBeDisabled();

    // Type less than 5 characters: still disabled
    await user.type(summaryInput, "Done");
    expect(confirmBtn).toBeDisabled();

    // Type valid summary >= 5 chars
    await user.type(summaryInput, " and verified system operation.");
    expect(confirmBtn).not.toBeDisabled();

    // Mock updateTicketStatus
    const updateSpy = vi.spyOn(api, "updateTicketStatus").mockResolvedValue({
      id: 12,
      ticketNumber: "TKT-2026-000012",
      currentStatus: "RESOLVED",
      resolutionSummary: "Done and verified system operation.",
      updatedAt: "2026-05-12T11:00:00.000Z",
    });

    await user.click(confirmBtn);

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith(
        12,
        "RESOLVED",
        "Done and verified system operation.",
        "2026-05-12T09:14:00.000Z"
      );
    });
  });

  /**
   * UI-11: TicketWorkflow Concurrency conflict dialog
   * AC-11, BR-12
   */
  it("UI-11: displays Stale Record Dialog with 'Keep My Drafts & Refresh' action upon receiving HTTP 409 Conflict (AC-11, BR-12)", async () => {
    const user = userEvent.setup();
    renderComponent(mockTicketWithActions, [mockAction]);

    await waitFor(() => {
      expect(screen.getByText("TKT-2026-000012")).toBeInTheDocument();
    });

    // Type a draft comment
    const commentInput = screen.getByPlaceholderText(/Type a public message to the requester/i);
    await user.type(commentInput, "Unsaved draft comment that must be preserved");

    // Mock HTTP 409 Conflict on status update
    const conflictError = new api.ApiError(
      "Conflict: Ticket has been modified by another user. Please refresh and review latest changes.",
      409,
      ["Stale record detected."]
    );
    vi.spyOn(api, "updateTicketStatus").mockRejectedValue(conflictError);

    // Open resolution modal and submit
    const statusSelect = screen.getByLabelText("Current Status");
    fireEvent.change(statusSelect, { target: { value: "RESOLVED" } });

    await waitFor(() => {
      expect(screen.getByText("Resolve Ticket")).toBeInTheDocument();
    });

    const summaryInput = screen.getByLabelText(/Resolution Summary/i);
    await user.type(summaryInput, "Resolved faulty hardware and replaced parts.");

    const confirmBtn = screen.getByRole("button", { name: /Confirm Resolution/i });
    await user.click(confirmBtn);

    // Stale Record Dialog should appear
    await waitFor(() => {
      expect(screen.getByText(/Stale Record Detected/i)).toBeInTheDocument();
    });

    expect(
      screen.getByText(/This ticket has been updated by another team member/i)
    ).toBeInTheDocument();

    const refreshBtn = screen.getByRole("button", { name: /Keep My Drafts & Refresh/i });
    expect(refreshBtn).toBeInTheDocument();

    // Mock subsequent fetch returning refreshed ticket
    const refreshedTicket: api.StaffTicketDetail = {
      ...mockTicketWithActions,
      updatedAt: "2026-05-12T12:00:00.000Z",
      summary: "Refreshed summary from another user",
    };
    const fetchSpy = vi.spyOn(api, "fetchStaffTicketDetail").mockResolvedValue(refreshedTicket);

    await user.click(refreshBtn);

    // Verifies ticket is refreshed from server
    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalled();
    });

    // Verifies user's unsaved draft comment is preserved in form state!
    expect(commentInput).toHaveValue("Unsaved draft comment that must be preserved");
  });
});
