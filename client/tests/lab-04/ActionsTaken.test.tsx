import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { ActionsTakenSection } from "../../src/features/actions-taken/components/ActionsTakenSection.js";
import { StaffDetailScreen } from "../../src/features/staff/StaffDetailScreen.js";
import { RequesterDetailScreen } from "../../src/features/tickets/RequesterDetailScreen.js";
import { AuthContext, AuthContextType } from "../../src/context/AuthContext.js";
import { RouterProvider } from "../../src/core/router/RouterContext.js";
import { RequesterProvider } from "../../src/context/RequesterContext.js";
import * as api from "../../src/api.js";
import * as actionsApi from "../../src/features/actions-taken/api.js";
import { ActionTaken } from "../../src/features/actions-taken/types.js";

const mockStaffUser: api.AuthUser = {
  id: 2,
  name: "Michael Brown",
  email: "staff.michael@toktickit.com",
  role: "IT_STAFF",
  isActive: true,
  mustChangePassword: false,
};

const mockRequesterUser: api.AuthUser = {
  id: 1,
  name: "Jennifer Anderson",
  email: "jennifer.anderson@kmutt.ac.th",
  role: "REQUESTER",
  isActive: true,
  mustChangePassword: false,
};

const mockActions: ActionTaken[] = [
  {
    id: 101,
    ticketId: 12,
    actionDateTime: "2026-05-12T10:15:00.000Z",
    description: "Ran hardware diagnostic on laptop battery cells.",
    result: "Cell #2 degraded below 40% capacity. Ordered replacement battery.",
    performedByUserId: 3,
    performedBy: {
      id: 3,
      name: "Sarah Johnson",
      email: "staff.sarah@toktickit.com",
      role: "IT_STAFF",
    },
    isFollowUpRequired: true,
    followUpNote: "Install replacement battery pack upon delivery (ETA May 14).",
    attachmentNotes: "Battery_health_report.pdf attached in attachments section.",
    createdAt: "2026-05-12T10:15:30.000Z",
    updatedAt: "2026-05-12T10:15:30.000Z",
  },
  {
    id: 102,
    ticketId: 12,
    actionDateTime: "2026-05-11T15:30:00.000Z",
    description: "Verified AC power adapter output with multimeter.",
    result: "Charger output is stable at 65W, issue isolated to internal pack.",
    performedByUserId: 2,
    performedBy: {
      id: 2,
      name: "Michael Brown",
      email: "staff.michael@toktickit.com",
      role: "IT_STAFF",
    },
    isFollowUpRequired: false,
    followUpNote: null,
    attachmentNotes: null,
    createdAt: "2026-05-11T15:30:30.000Z",
    updatedAt: "2026-05-11T15:30:30.000Z",
  },
];

const mockStaffTicketDetail: any = {
  id: 12,
  ticketNumber: "TKT-2026-000012",
  summary: "Laptop battery drains quickly",
  description: "Battery drains in 30 minutes.",
  category: { id: 2, name: "Hardware" },
  relatedSystem: { id: 7, name: "Corporate Laptop" },
  requestedPriority: "MEDIUM",
  itPriority: "HIGH",
  currentStatus: "IN_PROGRESS",
  resolutionSummary: null,
  isRequesterResolved: false,
  requesterId: 1,
  requester: { id: 1, name: "Jennifer Anderson", email: "jennifer.anderson@kmutt.ac.th" },
  ticketOwnerId: 2,
  ticketOwner: { id: 2, name: "Michael Brown", email: "staff.michael@toktickit.com" },
  attachments: [],
  publicComments: [],
  internalNotes: [],
  actionsTaken: mockActions,
  createdAt: "2026-05-11T09:14:00.000Z",
  updatedAt: "2026-05-12T10:15:30.000Z",
};

const mockRequesterTicketDetail: any = {
  ...mockStaffTicketDetail,
};

function renderWithStaffContext(ui: React.ReactElement) {
  const authValue: AuthContextType = {
    user: mockStaffUser,
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

function renderWithRequesterContext(ui: React.ReactElement) {
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
      <RequesterProvider>
        <RouterProvider>{ui}</RouterProvider>
      </RequesterProvider>
    </AuthContext.Provider>
  );
}

describe("Lab 4 Actions Taken UI Component Tests (UI-06, UI-07, UI-08, UI-12)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    localStorage.setItem("toktickit_auth_token", "mock-token");
    localStorage.setItem("toktickit_auth_user", JSON.stringify(mockStaffUser));
    vi.spyOn(actionsApi, "fetchActionsTaken").mockResolvedValue(mockActions);
    vi.spyOn(api, "fetchStaffTicketDetail").mockResolvedValue(mockStaffTicketDetail);
    vi.spyOn(api, "fetchStaffAssignees").mockResolvedValue([]);
    vi.spyOn(api, "fetchTicketDetail").mockResolvedValue(mockRequesterTicketDetail);
  });

  /**
   * UI-06: Staff Ticket Detail renders Actions Taken list mode and toggles create mode form on clicking "+ Record Action Taken"
   * (AC-01, FR-01)
   */
  it("UI-06: Staff Ticket Detail renders Actions Taken list mode and toggles create mode form on clicking '+ Record Action Taken'", async () => {
    renderWithStaffContext(<StaffDetailScreen ticketId={12} />);

    // Wait for Staff Detail and Actions Taken tab to render
    await waitFor(() => {
      expect(screen.getByRole("tab", { name: /Actions Taken/i })).toBeInTheDocument();
    });

    // Verify tab position: Actions Taken is to the right of Attachments
    const tabs = screen.getAllByRole("tab");
    const tabNames = tabs.map((t) => t.textContent);
    const attachmentsIdx = tabNames.findIndex((n) => n?.includes("Attachments"));
    const actionsIdx = tabNames.findIndex((n) => n?.includes("Actions Taken"));
    expect(actionsIdx).toBeGreaterThan(attachmentsIdx);

    // Click the Actions Taken tab
    fireEvent.click(screen.getByRole("tab", { name: /Actions Taken/i }));

    // Check that existing action cards/items are rendered in list mode
    expect(
      screen.getByText("Ran hardware diagnostic on laptop battery cells.")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Verified AC power adapter output with multimeter.")
    ).toBeInTheDocument();
    expect(screen.getByText(/Sarah Johnson/i)).toBeInTheDocument();
    expect(screen.getAllByText("IT Staff").length).toBeGreaterThan(0);

    // Verify "+ Record Action Taken" button is present
    const recordBtn = screen.getByRole("button", { name: /\+ Record Action Taken/i });
    expect(recordBtn).toBeInTheDocument();

    // Click "+ Record Action Taken" to open create mode
    fireEvent.click(recordBtn);

    // Verify create form controls are displayed
    expect(screen.getByLabelText(/Action Date\/Time/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Action Description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Result/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Follow-up required\?/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Save Action/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Cancel/i })).toBeInTheDocument();

    // Clicking Cancel should hide create form and restore list view
    fireEvent.click(screen.getByRole("button", { name: /Cancel/i }));
    expect(screen.queryByLabelText(/Action Description/i)).not.toBeInTheDocument();
  });

  /**
   * UI-07: Conditional follow-up note validation: toggling "Follow-up required?" checkbox dynamically reveals the required follow-up note textarea, displays character count, and blocks submission if empty or whitespace
   * (AC-03, BR-05)
   */
  it("UI-07: Conditional follow-up note validation: toggling 'Follow-up required?' reveals required note with live character count and blocks submission if empty", async () => {
    const createSpy = vi.spyOn(actionsApi, "createActionTaken").mockResolvedValue({
      id: 103,
      ticketId: 12,
      actionDateTime: new Date().toISOString(),
      description: "Replaced cooling fan assembly.",
      result: "RPM tests nominal at 4500 RPM under load.",
      performedByUserId: 2,
      performedBy: mockStaffUser,
      isFollowUpRequired: true,
      followUpNote: "Recheck bearing acoustics in 48 hours.",
      attachmentNotes: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    renderWithStaffContext(<ActionsTakenSection ticketId={12} readOnly={false} />);

    await waitFor(() => {
      expect(screen.getByText(/Actions Taken/i)).toBeInTheDocument();
    });

    // Toggle create mode
    fireEvent.click(screen.getByRole("button", { name: /\+ Record Action Taken/i }));

    const followUpCheckbox = screen.getByLabelText(/Follow-up required\?/i);
    expect(screen.queryByLabelText(/Follow-up Note/i)).not.toBeInTheDocument();

    // Check "Follow-up required?"
    fireEvent.click(followUpCheckbox);

    // Follow-up Note textarea should now be visible with live character count (0 / 1000)
    const followUpTextarea = screen.getByLabelText(/Follow-up Note/i);
    expect(followUpTextarea).toBeInTheDocument();
    expect(screen.getByText(/0 \/ 1[,\.]?000/i)).toBeInTheDocument();

    // Fill description and result
    const descInput = screen.getByLabelText(/Action Description/i);
    const resultInput = screen.getByLabelText(/Result/i);
    fireEvent.change(descInput, { target: { value: "Replaced cooling fan assembly." } });
    fireEvent.change(resultInput, { target: { value: "RPM tests nominal at 4500 RPM under load." } });

    // Submit with empty follow-up note
    const saveBtn = screen.getByRole("button", { name: /Save Action/i });
    fireEvent.click(saveBtn);

    // Submission should be blocked, validation error shown, and API not called
    await waitFor(() => {
      expect(screen.getByText(/Follow-up note is required/i)).toBeInTheDocument();
    });
    expect(createSpy).not.toHaveBeenCalled();

    // Enter valid follow-up note
    fireEvent.change(followUpTextarea, {
      target: { value: "Recheck bearing acoustics in 48 hours." },
    });
    expect(screen.getByText(/38 \/ 1[,\.]?000/i)).toBeInTheDocument();

    // Now submit
    fireEvent.click(saveBtn);
    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledWith(
        12,
        expect.objectContaining({
          description: "Replaced cooling fan assembly.",
          result: "RPM tests nominal at 4500 RPM under load.",
          isFollowUpRequired: true,
          followUpNote: "Recheck bearing acoustics in 48 hours.",
        })
      );
    });
  });

  /**
   * UI-08: Requester Ticket Detail renders Actions Taken in transparent read-only view: shows action items, dates, performer names, results, and badges, but "+ Record Action Taken" and "Edit" buttons are absent
   * (AC-06, BR-07)
   */
  it("UI-08: Requester Ticket Detail renders Actions Taken in transparent read-only view without create or edit controls", async () => {
    localStorage.setItem("toktickit_auth_user", JSON.stringify(mockRequesterUser));

    renderWithRequesterContext(
      <RequesterDetailScreen ticketId={12} onBack={vi.fn()} />
    );

    // Wait for Requester Detail and Actions Taken tab to render
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Actions Taken/i })).toBeInTheDocument();
    });

    // Verify tab position: Actions Taken is to the right of Attachments
    const tabButtons = screen
      .getAllByRole("button")
      .filter((b) => b.classList.contains("nav-link"));
    const tabLabels = tabButtons.map((b) => b.textContent);
    const attachmentsIdx = tabLabels.findIndex((l) => l?.includes("Attachments"));
    const actionsIdx = tabLabels.findIndex((l) => l?.includes("Actions Taken"));
    expect(actionsIdx).toBeGreaterThan(attachmentsIdx);

    // Click Actions Taken tab to activate it
    fireEvent.click(screen.getByRole("button", { name: /Actions Taken/i }));

    // Verify action details are visible
    expect(
      screen.getByText("Ran hardware diagnostic on laptop battery cells.")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Cell #2 degraded below 40% capacity. Ordered replacement battery.")
    ).toBeInTheDocument();
    expect(screen.getByText(/Sarah Johnson/i)).toBeInTheDocument();
    expect(screen.getAllByText("IT Staff").length).toBeGreaterThan(0);
    expect(screen.getByText(/Follow-Up Required/i)).toBeInTheDocument();
    expect(screen.getByText(/Action Complete/i)).toBeInTheDocument();

    // Verify "+ Record Action Taken" button is absent
    expect(
      screen.queryByRole("button", { name: /\+ Record Action Taken/i })
    ).not.toBeInTheDocument();

    // Verify "Edit" button is absent
    expect(screen.queryByRole("button", { name: /^Edit$/i })).not.toBeInTheDocument();
  });

  /**
   * UI-12: Form input preservation on API failure: when action creation fails with HTTP 422 or network error, entered description, result, and follow-up note are retained in the form controls
   * (AC-16, BR-17)
   */
  it("UI-12: Form input preservation on API failure: entered fields are retained when creation fails", async () => {
    vi.spyOn(actionsApi, "createActionTaken").mockRejectedValue(
      new Error("Validation failed: Unprocessable Entity (422)")
    );

    renderWithStaffContext(<ActionsTakenSection ticketId={12} readOnly={false} />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /\+ Record Action Taken/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /\+ Record Action Taken/i }));

    const descInput = screen.getByLabelText(/Action Description/i);
    const resultInput = screen.getByLabelText(/Result/i);
    const followUpCheckbox = screen.getByLabelText(/Follow-up required\?/i);

    fireEvent.change(descInput, { target: { value: "Replaced broken RJ45 port." } });
    fireEvent.change(resultInput, { target: { value: "Link negotiated at 1 Gbps." } });
    fireEvent.click(followUpCheckbox);

    const followUpTextarea = screen.getByLabelText(/Follow-up Note/i);
    fireEvent.change(followUpTextarea, { target: { value: "Monitor packet drops tomorrow." } });

    const saveBtn = screen.getByRole("button", { name: /Save Action/i });
    fireEvent.click(saveBtn);

    // Wait for error message banner to appear
    await waitFor(() => {
      expect(screen.getByText(/Validation failed/i)).toBeInTheDocument();
    });

    // Verify inputs retain their entered values
    expect((screen.getByLabelText(/Action Description/i) as HTMLTextAreaElement).value).toBe(
      "Replaced broken RJ45 port."
    );
    expect((screen.getByLabelText(/Result/i) as HTMLTextAreaElement).value).toBe(
      "Link negotiated at 1 Gbps."
    );
    expect(
      (screen.getByLabelText(/Follow-up Note/i) as HTMLTextAreaElement).value
    ).toBe("Monitor packet drops tomorrow.");
  });

  /**
   * AC-05, FR-03: Edit existing Action Taken in View/Edit Mode
   */
  it("allows IT Staff to edit an existing Action Taken record and save updates", async () => {
    const updateSpy = vi.spyOn(actionsApi, "updateActionTaken").mockResolvedValue({
      ...mockActions[0],
      description: "Ran upgraded battery health diagnostic suite.",
      result: "Cell #2 failed voltage test. Installed replacement battery pack.",
      isFollowUpRequired: false,
      followUpNote: null,
    });

    renderWithStaffContext(<ActionsTakenSection ticketId={12} readOnly={false} />);

    await waitFor(() => {
      expect(
        screen.getByText("Ran hardware diagnostic on laptop battery cells.")
      ).toBeInTheDocument();
    });

    // Find and click Edit on action card 101 (index 1 in chronological ascending order)
    const editBtns = screen.getAllByRole("button", { name: /^Edit$/i });
    fireEvent.click(editBtns[1]);

    // Verify edit form header and pre-filled inputs
    expect(screen.getByText("Edit Action Taken")).toBeInTheDocument();
    const descInput = screen.getByLabelText(/Action Description/i);
    expect((descInput as HTMLTextAreaElement).value).toBe(
      "Ran hardware diagnostic on laptop battery cells."
    );

    // Update description and uncheck follow-up
    fireEvent.change(descInput, {
      target: { value: "Ran upgraded battery health diagnostic suite." },
    });
    const followUpCheckbox = screen.getByLabelText(/Follow-up required\?/i);
    fireEvent.click(followUpCheckbox); // uncheck

    // Click "Save Changes"
    fireEvent.click(screen.getByRole("button", { name: /Save Changes/i }));

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith(
        101,
        expect.objectContaining({
          description: "Ran upgraded battery health diagnostic suite.",
          isFollowUpRequired: false,
          followUpNote: null,
        })
      );
    });

    // Verify card is updated in list view
    await waitFor(() => {
      expect(
        screen.getByText("Ran upgraded battery health diagnostic suite.")
      ).toBeInTheDocument();
    });
  });
});

