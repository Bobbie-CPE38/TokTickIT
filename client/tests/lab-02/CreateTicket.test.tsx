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

const mockRelatedSystems: api.RelatedSystem[] = [
  { id: 1, name: "Campus Wi-Fi" },
  { id: 2, name: "Corporate Laptop" },
  { id: 3, name: "Email" },
  { id: 4, name: "LEB2 App" },
];

describe("Lab 2 Create Ticket UI Tests (UI-01, UI-02, UI-03, UI-04)", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    vi.spyOn(api, "fetchActiveRequesters").mockResolvedValue(mockActiveRequesters);
    vi.spyOn(api, "fetchCategories").mockResolvedValue(mockCategories);
    vi.spyOn(api, "fetchRelatedSystems").mockResolvedValue(mockRelatedSystems);
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  /**
   * UI-04: App navigation when no requester is selected (AC-02, BR-03)
   */
  it("UI-04: prompts/redirects to Development Requester selection modal when no requester is selected (AC-02, BR-03)", async () => {
    render(<App />);

    expect(await screen.findByText(/Select Development Requester/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Select a Development Requester to test requester-specific ticket behavior/i)
    ).toBeInTheDocument();
  });

  /**
   * UI-01: CreateTicket form submission with valid data (AC-01, AC-07)
   */
  it("UI-01: submits valid ticket form, shows busy spinner, and displays success screen with ticket number (AC-01, AC-07)", async () => {
    localStorage.setItem("toktickit_requester_id", "1");

    const createdTicket: api.Ticket = {
      id: 101,
      ticketNumber: "TKT-2026-000101",
      summary: "Laptop battery drains quickly after latest OS update",
      description: "The battery drops from 100% to 15% in less than 45 minutes even with low screen brightness.",
      requestedPriority: "HIGH",
      itPriority: "MEDIUM",
      currentStatus: "NEW",
      ticketOwner: null,
      resolutionSummary: null,
      requesterId: 1,
      categoryId: 2,
      relatedSystemId: 2,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      category: { id: 2, name: "Hardware" },
      relatedSystem: { id: 2, name: "Corporate Laptop" },
    };

    const createTicketSpy = vi
      .spyOn(api, "createTicket")
      .mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(createdTicket), 100))
      );

    render(<App />);

    // Navigate to Create Ticket view
    const createNavBtn = (await screen.findAllByRole("button", { name: /Create Ticket/i }))[0];
    fireEvent.click(createNavBtn);

    // Form headers and controls should be displayed
    expect(await screen.findByText(/Create New IT Support Ticket/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Jennifer Anderson/i).length).toBeGreaterThanOrEqual(1);

    // Fill Category
    const categorySelect = screen.getByLabelText(/Category/i) as HTMLSelectElement;
    fireEvent.change(categorySelect, { target: { value: "2" } });

    // Fill Related System
    const systemSelect = screen.getByLabelText(/Related System/i) as HTMLSelectElement;
    fireEvent.change(systemSelect, { target: { value: "2" } });

    // Select Priority HIGH
    const highPriorityRadio = screen.getByLabelText(/High/i);
    fireEvent.click(highPriorityRadio);

    // Fill Summary (5-150 chars)
    const summaryInput = screen.getByLabelText(/Summary/i);
    fireEvent.change(summaryInput, {
      target: { value: "Laptop battery drains quickly after latest OS update" },
    });

    // Fill Description (10-2000 chars)
    const descriptionInput = screen.getByLabelText(/Description/i);
    fireEvent.change(descriptionInput, {
      target: {
        value: "The battery drops from 100% to 15% in less than 45 minutes even with low screen brightness.",
      },
    });

    // Submit the form
    const submitBtn = screen.getByRole("button", { name: /Submit Ticket/i });
    fireEvent.click(submitBtn);

    // Verify busy state & disabled button (AC-07)
    expect(submitBtn).toBeDisabled();
    expect(screen.getByText(/Submitting…|Submitting.../i)).toBeInTheDocument();

    // Verify API called with correct payload & requester ID header
    await waitFor(() => {
      expect(createTicketSpy).toHaveBeenCalledWith(
        {
          categoryId: 2,
          relatedSystemId: 2,
          requestedPriority: "HIGH",
          summary: "Laptop battery drains quickly after latest OS update",
          description:
            "The battery drops from 100% to 15% in less than 45 minutes even with low screen brightness.",
        },
        1
      );
    });

    // Verify Success Screen displayed with generated ticket number (AC-01)
    expect(await screen.findByText(/Ticket Created Successfully/i)).toBeInTheDocument();
    expect(screen.getByText(/TKT-2026-000101/i)).toBeInTheDocument();
  });

  /**
   * UI-02: CreateTicket form submission with invalid inputs (AC-06, BR-06)
   */
  it("UI-02: displays field-level error messages below inputs when invalid and prevents submission (AC-06, BR-06)", async () => {
    localStorage.setItem("toktickit_requester_id", "1");
    const createTicketSpy = vi.spyOn(api, "createTicket");

    render(<App />);

    const createNavBtn = (await screen.findAllByRole("button", { name: /Create Ticket/i }))[0];
    fireEvent.click(createNavBtn);

    expect(await screen.findByText(/Create New IT Support Ticket/i)).toBeInTheDocument();

    // Click Submit immediately without filling required fields
    const submitBtn = screen.getByRole("button", { name: /Submit Ticket/i });
    fireEvent.click(submitBtn);

    // Check inline validation error messages
    expect(await screen.findByText(/Please select a category/i)).toBeInTheDocument();
    expect(screen.getByText(/Please select a related system/i)).toBeInTheDocument();
    expect(screen.getByText(/Summary must be at least 5 characters/i)).toBeInTheDocument();
    expect(screen.getByText(/Description must be at least 10 characters/i)).toBeInTheDocument();

    // API should not have been called
    expect(createTicketSpy).not.toHaveBeenCalled();

    // Type a short summary and short description
    const summaryInput = screen.getByLabelText(/Summary/i);
    fireEvent.change(summaryInput, { target: { value: "abc" } });

    const descriptionInput = screen.getByLabelText(/Description/i);
    fireEvent.change(descriptionInput, { target: { value: "short" } });

    fireEvent.click(submitBtn);

    expect(screen.getByText(/Summary must be at least 5 characters/i)).toBeInTheDocument();
    expect(screen.getByText(/Description must be at least 10 characters/i)).toBeInTheDocument();
    expect(createTicketSpy).not.toHaveBeenCalled();
  });

  /**
   * UI-03: CreateTicket form preserves entered values when API fails (AC-08, BR-08)
   */
  it("UI-03: preserves all entered field values and displays error alert when submission fails (AC-08, BR-08)", async () => {
    localStorage.setItem("toktickit_requester_id", "1");

    vi.spyOn(api, "createTicket").mockRejectedValue(
      new Error("Internal Server Error: Database connection timeout")
    );

    render(<App />);

    const createNavBtn = (await screen.findAllByRole("button", { name: /Create Ticket/i }))[0];
    fireEvent.click(createNavBtn);

    expect(await screen.findByText(/Create New IT Support Ticket/i)).toBeInTheDocument();

    // Fill form
    const categorySelect = screen.getByLabelText(/Category/i) as HTMLSelectElement;
    fireEvent.change(categorySelect, { target: { value: "3" } });

    const systemSelect = screen.getByLabelText(/Related System/i) as HTMLSelectElement;
    fireEvent.change(systemSelect, { target: { value: "4" } });

    const urgentPriorityRadio = screen.getByLabelText(/Urgent/i);
    fireEvent.click(urgentPriorityRadio);

    const summaryInput = screen.getByLabelText(/Summary/i) as HTMLInputElement;
    fireEvent.change(summaryInput, {
      target: { value: "Cannot access LEB2 submission portal during final exams" },
    });

    const descriptionInput = screen.getByLabelText(/Description/i) as HTMLTextAreaElement;
    fireEvent.change(descriptionInput, {
      target: {
        value: "Server returns 502 Bad Gateway whenever student attempts to upload assignment ZIP file.",
      },
    });

    // Submit
    const submitBtn = screen.getByRole("button", { name: /Submit Ticket/i });
    fireEvent.click(submitBtn);

    // Check error banner displayed
    expect(
      await screen.findByText(/Submission failed: Internal Server Error: Database connection timeout/i)
    ).toBeInTheDocument();

    // Verify all entered fields are strictly preserved
    expect(categorySelect.value).toBe("3");
    expect(systemSelect.value).toBe("4");
    expect(summaryInput.value).toBe("Cannot access LEB2 submission portal during final exams");
    expect(descriptionInput.value).toBe(
      "Server returns 502 Bad Gateway whenever student attempts to upload assignment ZIP file."
    );
  });

  /**
   * UI-01b: Staging attachments and uploading them during ticket creation (FR-05, UI-Spec 5.2)
   */
  it("stages attachments and uploads them upon successful ticket submission", async () => {
    localStorage.setItem("toktickit_requester_id", "1");

    const createdTicket: api.Ticket = {
      id: 202,
      ticketNumber: "TKT-2026-000202",
      summary: "Cannot connect to campus wifi in library 4th floor",
      description: "Getting authorization timeout error when connecting with student account.",
      requestedPriority: "MEDIUM",
      itPriority: "MEDIUM",
      currentStatus: "NEW",
      ticketOwner: null,
      resolutionSummary: null,
      requesterId: 1,
      categoryId: 4,
      relatedSystemId: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      category: { id: 4, name: "Network" },
      relatedSystem: { id: 1, name: "Campus Wi-Fi" },
    };

    vi.spyOn(api, "createTicket").mockResolvedValue(createdTicket);
    const uploadAttachmentSpy = vi.spyOn(api, "uploadAttachment").mockResolvedValue({
      id: 999,
      ticketId: 202,
      originalFileName: "screenshot.png",
      fileSize: 1024,
      mimeType: "image/png",
      isRemoved: false,
      removedAt: null,
      removalReason: null,
      createdAt: new Date().toISOString(),
    });

    render(<App />);

    const createNavBtn = (await screen.findAllByRole("button", { name: /Create Ticket/i }))[0];
    fireEvent.click(createNavBtn);

    expect(await screen.findByText(/Create New IT Support Ticket/i)).toBeInTheDocument();

    // Fill form
    fireEvent.change(screen.getByLabelText(/Category/i), { target: { value: "4" } });
    fireEvent.change(screen.getByLabelText(/Related System/i), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText(/Summary/i), {
      target: { value: "Cannot connect to campus wifi in library 4th floor" },
    });
    fireEvent.change(screen.getByLabelText(/Description/i), {
      target: { value: "Getting authorization timeout error when connecting with student account." },
    });

    // Attach file
    const fileInput = screen.getByLabelText(/Attach Supporting Files/i);
    const testFile = new File(["dummy content"], "screenshot.png", { type: "image/png" });
    fireEvent.change(fileInput, { target: { files: [testFile] } });

    // File pill should appear
    expect(await screen.findByText("screenshot.png")).toBeInTheDocument();

    // Submit
    const submitBtn = screen.getByRole("button", { name: /Submit Ticket/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(uploadAttachmentSpy).toHaveBeenCalledWith(202, testFile, 1);
    });

    expect(await screen.findByText(/Ticket Created Successfully/i)).toBeInTheDocument();
  });
});
