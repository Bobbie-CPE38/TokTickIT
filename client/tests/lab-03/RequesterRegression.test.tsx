import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { Header } from "../../src/components/Header.js";
import { RequesterDetailScreen } from "../../src/features/tickets/RequesterDetailScreen.js";
import { AuthContext, AuthContextType } from "../../src/context/AuthContext.js";
import * as api from "../../src/api.js";

function renderWithAuth(ui: React.ReactElement, user: api.AuthUser | null) {
  const authValue: AuthContextType = {
    user,
    token: user ? "mock-jwt-token" : null,
    loading: false,
    isAuthenticated: !!user,
    mustChangePassword: user?.mustChangePassword ?? false,
    login: vi.fn(),
    logout: vi.fn(),
    changePassword: vi.fn(),
    refreshUser: vi.fn(),
  };

  return render(
    <AuthContext.Provider value={authValue}>
      {ui}
    </AuthContext.Provider>
  );
}

const mockTicketDetail: api.TicketDetail = {
  id: 101,
  ticketNumber: "TKT-2026-000101",
  summary: "VPN handshake hangs on client startup",
  description: "When starting AnyConnect, the handshake freezes indefinitely.",
  requestedPriority: "HIGH",
  itPriority: "HIGH",
  currentStatus: "IN_PROGRESS",
  ticketOwner: "Michael Brown (IT Support)",
  resolutionSummary: null,
  isRequesterResolved: false,
  requesterId: 1,
  requester: {
    id: 1,
    name: "Jennifer Anderson",
    email: "jennifer.anderson@kmutt.ac.th",
  },
  categoryId: 4,
  category: { id: 4, name: "Network" },
  relatedSystemId: 3,
  relatedSystem: { id: 3, name: "VPN" },
  attachments: [],
  createdAt: "2026-05-13T09:14:00.000Z",
  updatedAt: "2026-05-13T09:14:00.000Z",
};

describe("Lab 3 Requester Regression & Features UI Tests (UI-04, UI-09)", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  /**
   * UI-04: Role-specific navigation shell items
   * FR-08
   */
  describe("UI-04: Navigation shell displays role-appropriate links (FR-08)", () => {
    it("renders 'My Tickets' and 'Create Ticket' for REQUESTER role", () => {
      const requesterUser: api.AuthUser = {
        id: 1,
        name: "Jennifer Anderson",
        email: "jennifer.anderson@kmutt.ac.th",
        role: "REQUESTER",
        isActive: true,
        mustChangePassword: false,
      };

      renderWithAuth(<Header currentView="my-tickets" />, requesterUser);

      expect(screen.getByRole("button", { name: /My Tickets/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Create Ticket/i })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /My Queue/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /^Admin$/i })).not.toBeInTheDocument();
    });

    it("renders 'My Queue' and 'Create Ticket' for IT_STAFF role", () => {
      const staffUser: api.AuthUser = {
        id: 2,
        name: "Michael Brown",
        email: "staff.michael@toktickit.com",
        role: "IT_STAFF",
        isActive: true,
        mustChangePassword: false,
      };

      renderWithAuth(<Header currentView="queue" />, staffUser);

      expect(screen.getByRole("button", { name: /My Queue/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Create Ticket/i })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /My Tickets/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /^Admin$/i })).not.toBeInTheDocument();
    });

    it("renders 'Admin' for ADMINISTRATOR role", () => {
      const adminUser: api.AuthUser = {
        id: 3,
        name: "John Smith",
        email: "admin@toktickit.com",
        role: "ADMINISTRATOR",
        isActive: true,
        mustChangePassword: false,
      };

      renderWithAuth(<Header currentView="user-management" />, adminUser);

      expect(screen.getByRole("button", { name: /^Admin$/i })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /My Tickets/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /My Queue/i })).not.toBeInTheDocument();
    });
  });

  /**
   * UI-09: RequesterTicketDetail "Problem Appears Resolved" banner
   * AC-16, BR-05
   */
  describe("UI-09: RequesterTicketDetail Problem Appears Resolved banner (AC-16, BR-05)", () => {
    it("displays prompt banner when isRequesterResolved is false, opens modal on click, and sets flag upon confirmation", async () => {
      const requesterUser: api.AuthUser = {
        id: 1,
        name: "Jennifer Anderson",
        email: "jennifer.anderson@kmutt.ac.th",
        role: "REQUESTER",
        isActive: true,
        mustChangePassword: false,
      };

      vi.spyOn(api, "fetchTicketDetail").mockResolvedValue(mockTicketDetail);
      const resolveSpy = vi.spyOn(api, "indicateTicketResolved").mockResolvedValue({
        id: 101,
        ticketNumber: "TKT-2026-000101",
        isRequesterResolved: true,
        updatedAt: new Date().toISOString(),
      });

      renderWithAuth(
        <RequesterDetailScreen ticketId={101} onBack={vi.fn()} />,
        requesterUser
      );

      // Wait for ticket to load
      expect(await screen.findByText(/TKT-2026-000101/i)).toBeInTheDocument();

      // Verify resolution banner is present with action button
      expect(screen.getByText(/Problem appears resolved\?/i)).toBeInTheDocument();
      const markResolvedBtn = screen.getByRole("button", { name: /Mark as Resolved/i });
      expect(markResolvedBtn).toBeInTheDocument();

      // Click "Mark as Resolved" to trigger modal
      fireEvent.click(markResolvedBtn);

      // Modal should appear
      expect(await screen.findByText(/Confirm Problem Resolution/i)).toBeInTheDocument();
      const confirmBtn = screen.getByRole("button", { name: /Confirm/i });
      fireEvent.click(confirmBtn);

      // Verify API was called
      await waitFor(() => {
        expect(resolveSpy).toHaveBeenCalledWith(101, 1);
      });

      // Verify banner transitions to confirmed notice
      await waitFor(() => {
        expect(
          screen.getByText(/You marked this problem as resolved\. IT Staff will confirm and close the ticket\./i)
        ).toBeInTheDocument();
      });

      // Verify "Mark as Resolved" button is now hidden
      expect(screen.queryByRole("button", { name: /Mark as Resolved/i })).not.toBeInTheDocument();
    });
  });
});
