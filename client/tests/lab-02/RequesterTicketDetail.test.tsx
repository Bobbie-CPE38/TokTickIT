import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { RequesterTicketDetail } from "../../src/components/RequesterTicketDetail.js";
import { RequesterProvider } from "../../src/context/RequesterContext.js";
import * as api from "../../src/api.js";

const mockTicketDetail: api.TicketDetail = {
  id: 101,
  ticketNumber: "TKT-2025-001234",
  summary: "Laptop battery drains quickly",
  description: "My laptop battery is draining much faster than usual even when the system is idle. This started happening after last week's Windows update.",
  requestedPriority: "MEDIUM",
  itPriority: "MEDIUM",
  currentStatus: "IN_PROGRESS",
  ticketOwner: "Michael Brown (IT Support)",
  resolutionSummary: null,
  requesterId: 1,
  requester: {
    id: 1,
    name: "Jennifer Anderson",
    email: "jennifer.anderson@kmutt.ac.th",
    department: "Computer Engineering",
  },
  categoryId: 2,
  category: { id: 2, name: "Hardware" },
  relatedSystemId: 2,
  relatedSystem: { id: 2, name: "Corporate Laptop" },
  attachments: [
    {
      id: 501,
      ticketId: 101,
      originalFileName: "battery-report.pdf",
      fileSize: 1258291,
      mimeType: "application/pdf",
      isRemoved: false,
      removedAt: null,
      removalReason: null,
      createdAt: "2025-05-12T09:15:00.000Z",
    },
    {
      id: 502,
      ticketId: 101,
      originalFileName: "old-screenshot.png",
      fileSize: 460800,
      mimeType: "image/png",
      isRemoved: true,
      removedAt: "2025-05-12T10:00:00.000Z",
      removalReason: "Uploaded duplicate file by mistake",
      createdAt: "2025-05-12T09:20:00.000Z",
    },
  ],
  createdAt: "2025-05-12T09:14:00.000Z",
  updatedAt: "2025-05-13T10:30:00.000Z",
};

describe("Lab 2 Requester Ticket Detail UI Tests (UI-08)", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("toktickit_requester_id", "1");
    vi.restoreAllMocks();
    vi.spyOn(api, "fetchActiveRequesters").mockResolvedValue([
      {
        id: 1,
        name: "Jennifer Anderson",
        email: "jennifer.anderson@kmutt.ac.th",
        department: "Computer Engineering",
      },
    ]);
    vi.spyOn(api, "fetchTicketDetail").mockResolvedValue(mockTicketDetail);
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  /**
   * UI-08: RequesterTicketDetail renders all ticket fields as read-only (FR-13, UI-Spec Section 5.4)
   */
  it("UI-08: renders all ticket metadata and content fields in read-only mode with Zen Green styling (FR-13)", async () => {
    const handleBack = vi.fn();

    render(
      <RequesterProvider>
        <RequesterTicketDetail ticketId={101} onBack={handleBack} />
      </RequesterProvider>
    );

    // Wait for data load
    expect(await screen.findByText(/TKT-2025-001234/i)).toBeInTheDocument();

    // Verify Breadcrumb and Title
    expect(screen.getByText(/Ticket Details/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Back to My Tickets/i })).toBeInTheDocument();

    // Verify Read-Only Fields Content
    expect(screen.getByText(/TKT-2025-001234/i)).toBeInTheDocument();
    expect(screen.getByText(/Hardware/i)).toBeInTheDocument();
    expect(screen.getByText(/Corporate Laptop/i)).toBeInTheDocument();
    expect(screen.getByText(/Jennifer Anderson/i)).toBeInTheDocument();
    expect(screen.getByText(/Michael Brown/i)).toBeInTheDocument();
    expect(screen.getByText(/Laptop battery drains quickly/i)).toBeInTheDocument();
    expect(
      screen.getByText(/My laptop battery is draining much faster than usual/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/No resolution summary available yet\./i)).toBeInTheDocument();

    // Verify Badges are present
    expect(screen.getAllByText(/Medium/i).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/In Progress/i)).toBeInTheDocument();

    // Verify no editable ticket inputs
    const inputs = screen.queryAllByRole("textbox");
    expect(inputs.length).toBe(0);

    // Click "Back to My Tickets"
    const backBtn = screen.getByRole("button", { name: /Back to My Tickets/i });
    fireEvent.click(backBtn);
    expect(handleBack).toHaveBeenCalledTimes(1);
  });

  it("displays loading spinner while fetching ticket detail", () => {
    vi.spyOn(api, "fetchTicketDetail").mockReturnValue(new Promise(() => {}));

    render(
      <RequesterProvider>
        <RequesterTicketDetail ticketId={101} onBack={vi.fn()} />
      </RequesterProvider>
    );

    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("displays error alert when ticket detail fetch fails with Retry option", async () => {
    const fetchSpy = vi
      .spyOn(api, "fetchTicketDetail")
      .mockRejectedValueOnce(new Error("Ticket not found"))
      .mockResolvedValue(mockTicketDetail);

    render(
      <RequesterProvider>
        <RequesterTicketDetail ticketId={999} onBack={vi.fn()} />
      </RequesterProvider>
    );

    expect(await screen.findByText(/Unable to load ticket details/i)).toBeInTheDocument();

    // Click Retry
    const retryBtn = screen.getByRole("button", { name: /Retry/i });
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.getByText(/TKT-2025-001234/i)).toBeInTheDocument();
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });
  });
});
