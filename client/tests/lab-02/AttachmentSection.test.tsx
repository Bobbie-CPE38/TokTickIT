import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { AttachmentSection } from "../../src/components/AttachmentSection.js";
import * as api from "../../src/api.js";

const initialAttachments: api.Attachment[] = [
  {
    id: 501,
    ticketId: 101,
    originalFileName: "battery-report.pdf",
    fileSize: 1258291, // ~1.2 MB
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
    fileSize: 460800, // ~450 KB
    mimeType: "image/png",
    isRemoved: true,
    removedAt: "2025-05-12T10:00:00.000Z",
    removalReason: "Uploaded duplicate file by mistake",
    createdAt: "2025-05-12T09:20:00.000Z",
  },
];

describe("Lab 2 Attachment Section UI Tests (UI-09, UI-10)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * UI-09: AttachmentSection soft removal flow (AC-13, BR-12)
   */
  it("UI-09: opens soft removal modal, requires reason 3-255 chars, and calls API on confirmation (AC-13, BR-12)", async () => {
    const user = userEvent.setup();
    const handleAttachmentsChange = vi.fn();

    const softRemoveSpy = vi.spyOn(api, "softRemoveAttachment").mockResolvedValue({
      id: 501,
      ticketId: 101,
      originalFileName: "battery-report.pdf",
      fileSize: 1258291,
      mimeType: "application/pdf",
      isRemoved: true,
      removedAt: new Date().toISOString(),
      removalReason: "Uploaded outdated diagnostic report",
      createdAt: "2025-05-12T09:15:00.000Z",
    });

    render(
      <AttachmentSection
        ticketId={101}
        requesterId={1}
        attachments={initialAttachments}
        onAttachmentsChange={handleAttachmentsChange}
      />
    );

    // Active attachment is rendered
    expect(screen.getByText("battery-report.pdf")).toBeInTheDocument();
    expect(screen.getByText(/1\.2 MB|1\.20 MB/i)).toBeInTheDocument();

    // Click "Remove Attachment"
    const removeBtn = screen.getByRole("button", { name: /Remove Attachment|Remove/i });
    await user.click(removeBtn);

    // Modal opens
    expect(screen.getByRole("heading", { name: /Remove Attachment/i })).toBeInTheDocument();
    expect(
      screen.getByText(/Are you sure you want to remove/i)
    ).toBeInTheDocument();

    const confirmBtn = screen.getByRole("button", { name: /Confirm Soft Removal|Confirm Removal/i });
    const reasonTextarea = screen.getByPlaceholderText(/e\.g\. Contains sensitive personal data|reason for removal/i);

    // Case 1: Empty reason -> submit is blocked
    await user.click(confirmBtn);
    expect(screen.getByText(/Reason must be at least 3 characters/i)).toBeInTheDocument();
    expect(softRemoveSpy).not.toHaveBeenCalled();

    // Case 2: Short reason (< 3 chars)
    await user.type(reasonTextarea, "ab");
    await user.click(confirmBtn);
    expect(screen.getByText(/Reason must be at least 3 characters/i)).toBeInTheDocument();
    expect(softRemoveSpy).not.toHaveBeenCalled();

    // Case 3: Valid reason
    await user.clear(reasonTextarea);
    await user.type(reasonTextarea, "Uploaded outdated diagnostic report");
    await user.click(confirmBtn);

    // Verify API called with attachment ID, reason, and requester ID
    await waitFor(() => {
      expect(softRemoveSpy).toHaveBeenCalledWith(
        501,
        "Uploaded outdated diagnostic report",
        1
      );
    });

    // Callback invoked to update parent state
    expect(handleAttachmentsChange).toHaveBeenCalled();
  });

  /**
   * UI-10: AttachmentSection renders removed attachment metadata (AC-13, BR-13)
   */
  it("UI-10: renders soft-removed attachment metadata, removal reason, and blocks/disables download (AC-13, BR-13)", () => {
    render(
      <AttachmentSection
        ticketId={101}
        requesterId={1}
        attachments={initialAttachments}
        onAttachmentsChange={vi.fn()}
      />
    );

    // Removed Attachments section
    expect(screen.getByText(/Removed Attachments/i)).toBeInTheDocument();
    expect(screen.getByText("old-screenshot.png")).toBeInTheDocument();
    expect(screen.getByText(/Uploaded duplicate file by mistake/i)).toBeInTheDocument();

    // Removed tag is displayed
    expect(screen.getAllByText(/Removed/i).length).toBeGreaterThanOrEqual(1);

    // Download button for removed attachment must NOT exist or be disabled
    const activeDownloadBtn = screen.getAllByRole("button", { name: /Download/i });
    // Exactly 1 download button for the 1 active file
    expect(activeDownloadBtn.length).toBe(1);
  });

  it("handles active attachment download click", async () => {
    const user = userEvent.setup();
    const downloadSpy = vi.spyOn(api, "downloadAttachment").mockResolvedValue();

    render(
      <AttachmentSection
        ticketId={101}
        requesterId={1}
        attachments={initialAttachments}
        onAttachmentsChange={vi.fn()}
      />
    );

    const downloadBtn = screen.getByRole("button", { name: /Download/i });
    await user.click(downloadBtn);

    expect(downloadSpy).toHaveBeenCalledWith(501, 1, "battery-report.pdf");
  });

  it("allows uploading a new attachment when active attachments < 5", async () => {
    const user = userEvent.setup();
    const handleAttachmentsChange = vi.fn();

    const uploadSpy = vi.spyOn(api, "uploadAttachment").mockResolvedValue({
      id: 503,
      ticketId: 101,
      originalFileName: "new-log.pdf",
      fileSize: 102400,
      mimeType: "application/pdf",
      isRemoved: false,
      removedAt: null,
      removalReason: null,
      createdAt: new Date().toISOString(),
    });

    render(
      <AttachmentSection
        ticketId={101}
        requesterId={1}
        attachments={initialAttachments}
        onAttachmentsChange={handleAttachmentsChange}
      />
    );

    const fileInput = screen.getByLabelText(/Upload Attachment|Attach File/i);
    const file = new File(["test-content"], "new-log.pdf", { type: "application/pdf" });

    await user.upload(fileInput, file);

    await waitFor(() => {
      expect(uploadSpy).toHaveBeenCalledWith(101, file, 1);
      expect(handleAttachmentsChange).toHaveBeenCalled();
    });
  });

  it("disables attachment upload when 5 active attachments limit is reached (BR-11)", () => {
    const fiveActiveAttachments: api.Attachment[] = Array.from({ length: 5 }, (_, i) => ({
      id: 600 + i,
      ticketId: 101,
      originalFileName: `file-${i + 1}.png`,
      fileSize: 204800,
      mimeType: "image/png",
      isRemoved: false,
      removedAt: null,
      removalReason: null,
      createdAt: "2025-05-12T09:15:00.000Z",
    }));

    render(
      <AttachmentSection
        ticketId={101}
        requesterId={1}
        attachments={fiveActiveAttachments}
        onAttachmentsChange={vi.fn()}
      />
    );

    expect(screen.getByText(/Maximum 5 active attachments reached/i)).toBeInTheDocument();
    const fileInput = screen.getByLabelText(/Upload Attachment|Attach File/i);
    expect(fileInput).toBeDisabled();
  });
});
