import React, { useState, useRef } from "react";
import {
  Attachment,
  uploadAttachment,
  downloadAttachment,
  softRemoveAttachment,
} from "../api.js";

interface AttachmentSectionProps {
  ticketId: number;
  requesterId: number;
  attachments: Attachment[];
  onAttachmentsChange?: (attachments: Attachment[]) => void;
}

export const AttachmentSection: React.FC<AttachmentSectionProps> = ({
  ticketId,
  requesterId,
  attachments,
  onAttachmentsChange,
}) => {
  const [selectedForRemoval, setSelectedForRemoval] = useState<Attachment | null>(null);
  const [removalReason, setRemovalReason] = useState<string>("");
  const [removalError, setRemovalError] = useState<string | null>(null);
  const [isRemoving, setIsRemoving] = useState<boolean>(false);

  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeAttachments = attachments.filter((a) => !a.isRemoved);
  const removedAttachments = attachments.filter((a) => a.isRemoved);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (isoString?: string | null): string => {
    if (!isoString) return "";
    try {
      const date = new Date(isoString);
      return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }).format(date);
    } catch {
      return isoString;
    }
  };

  const handleOpenRemovalModal = (att: Attachment) => {
    setSelectedForRemoval(att);
    setRemovalReason("");
    setRemovalError(null);
  };

  const handleCloseRemovalModal = () => {
    if (isRemoving) return;
    setSelectedForRemoval(null);
    setRemovalReason("");
    setRemovalError(null);
  };

  const handleConfirmRemoval = async () => {
    const trimmed = removalReason.trim();
    if (!trimmed || trimmed.length < 3) {
      setRemovalError("Reason must be at least 3 characters.");
      return;
    }
    if (trimmed.length > 255) {
      setRemovalError("Reason cannot exceed 255 characters.");
      return;
    }

    if (!selectedForRemoval) return;

    setIsRemoving(true);
    setRemovalError(null);

    try {
      const updated = await softRemoveAttachment(
        selectedForRemoval.id,
        trimmed,
        requesterId
      );

      const nextAttachments = attachments.map((a) =>
        a.id === updated.id
          ? {
              ...a,
              isRemoved: true,
              removedAt: updated.removedAt,
              removalReason: updated.removalReason,
            }
          : a
      );

      onAttachmentsChange?.(nextAttachments);
      setSelectedForRemoval(null);
      setRemovalReason("");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to remove attachment.";
      setRemovalError(msg);
    } finally {
      setIsRemoving(false);
    }
  };

  const [isDragging, setIsDragging] = useState<boolean>(false);

  const handleDownload = async (att: Attachment) => {
    setDownloadError(null);
    setDownloadingId(att.id);
    try {
      await downloadAttachment(att.id, requesterId, att.originalFileName);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Download failed.";
      setDownloadError(msg);
    } finally {
      setDownloadingId(null);
    }
  };

  const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
  const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".pdf"];

  const processFileUpload = async (file: File) => {
    setUploadError(null);

    // Client-side file type check
    const ext = file.name.toLowerCase().substring(file.name.lastIndexOf("."));
    if (!ALLOWED_MIME_TYPES.includes(file.type) && !ALLOWED_EXTENSIONS.includes(ext)) {
      setUploadError("Only JPG, PNG, WEBP, and PDF files are allowed.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // Client-side size check: 5MB
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("File size cannot exceed 5 MB.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (activeAttachments.length >= 5) {
      setUploadError("Maximum 5 active attachments reached for this ticket.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setIsUploading(true);
    try {
      const newAtt = await uploadAttachment(ticketId, file, requesterId);
      onAttachmentsChange?.([...attachments, newAtt]);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed.";
      setUploadError(msg);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processFileUpload(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isMaxReached && !isUploading) {
      setIsDragging(true);
    }
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isMaxReached && !isUploading) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (isMaxReached || isUploading) return;

    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    await processFileUpload(file);
  };

  const isMaxReached = activeAttachments.length >= 5;

  return (
    <div className="mt-4">
      {/* Section Header */}
      <div className="d-flex align-items-center justify-content-between mb-3 border-bottom pb-2">
        <h3 className="h6 fw-bold mb-0 text-uppercase tracking-wide" style={{ color: "#1C2D27" }}>
          Attachments ({activeAttachments.length} Active
          {removedAttachments.length > 0 ? ` / ${removedAttachments.length} Removed` : ""})
        </h3>
      </div>

      {/* Errors */}
      {uploadError && (
        <div
          className="alert alert-danger py-2 small mb-3 shadow-sm d-flex align-items-center justify-content-between"
          style={{ backgroundColor: "#FEE2E2", borderColor: "#EF4444", color: "#991B1B" }}
        >
          <span>{uploadError}</span>
          <button
            type="button"
            className="btn-close btn-close-sm"
            onClick={() => setUploadError(null)}
            aria-label="Close"
          />
        </div>
      )}

      {downloadError && (
        <div
          className="alert alert-danger py-2 small mb-3 shadow-sm d-flex align-items-center justify-content-between"
          style={{ backgroundColor: "#FEE2E2", borderColor: "#EF4444", color: "#991B1B" }}
        >
          <span>{downloadError}</span>
          <button
            type="button"
            className="btn-close btn-close-sm"
            onClick={() => setDownloadError(null)}
            aria-label="Close"
          />
        </div>
      )}

      {/* Active Attachments Table / List */}
      {activeAttachments.length > 0 && (
        <div
          className="card border mb-3 overflow-hidden shadow-sm"
          style={{ backgroundColor: "#FFFFFF", borderColor: "#E2E8F0", borderRadius: "8px" }}
        >
          <div className="table-responsive">
            <table className="table align-middle mb-0" style={{ borderColor: "#E2E8F0" }}>
              <thead style={{ backgroundColor: "#F8FAFC", color: "#52665D", fontSize: "0.82rem" }}>
                <tr>
                  <th scope="col" className="py-2.5 px-3 fw-semibold">
                    File Name
                  </th>
                  <th scope="col" className="py-2.5 px-3 fw-semibold" style={{ width: "110px" }}>
                    Size
                  </th>
                  <th scope="col" className="py-2.5 px-3 fw-semibold" style={{ width: "160px" }}>
                    Upload Date
                  </th>
                  <th scope="col" className="py-2.5 px-3 fw-semibold text-end" style={{ width: "260px" }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody style={{ fontSize: "0.875rem" }}>
                {activeAttachments.map((att) => (
                  <tr key={att.id}>
                    <td className="py-2.5 px-3">
                      <div className="d-flex align-items-center gap-2">
                        {/* File Icon */}
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#006B3C"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="flex-shrink-0"
                        >
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                        </svg>
                        <span className="fw-medium text-truncate" style={{ color: "#1C2D27" }}>
                          {att.originalFileName}
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-muted">{formatFileSize(att.fileSize)}</td>
                    <td className="py-2.5 px-3 text-muted">{formatDate(att.createdAt)}</td>
                    <td className="py-2.5 px-3 text-end">
                      <div className="d-flex justify-content-end align-items-center gap-2">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-success fw-medium d-inline-flex align-items-center justify-content-center px-3 text-nowrap"
                          style={{
                            borderColor: "#006B3C",
                            color: "#006B3C",
                            height: "36px",
                            minHeight: "36px",
                            whiteSpace: "nowrap",
                          }}
                          disabled={downloadingId === att.id}
                          onClick={() => handleDownload(att)}
                        >
                          {downloadingId === att.id ? (
                            <span className="spinner-border spinner-border-sm me-2" role="status" />
                          ) : (
                            <svg
                              width="15"
                              height="15"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="me-2"
                            >
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                              <polyline points="7 10 12 15 17 10" />
                              <line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                          )}
                          <span>Download</span>
                        </button>

                        <button
                          type="button"
                          className="btn btn-sm fw-medium d-inline-flex align-items-center justify-content-center px-3 text-nowrap"
                          style={{
                            backgroundColor: "#FFFFFF",
                            borderColor: "#EF4444",
                            color: "#DC2626",
                            height: "36px",
                            minHeight: "36px",
                            whiteSpace: "nowrap",
                          }}
                          onClick={() => handleOpenRemovalModal(att)}
                        >
                          <svg
                            width="15"
                            height="15"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="me-2"
                          >
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                          <span>Remove Attachment</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Attachment Dropzone / File Picker */}
      <div
        className="card border mb-4 p-3"
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          backgroundColor: isDragging
            ? "#EAF6EF"
            : isMaxReached
            ? "#F3F4F6"
            : "#FFFFFF",
          borderColor: isDragging
            ? "#006B3C"
            : isMaxReached
            ? "#D1D5DB"
            : "#006B3C",
          borderStyle: isMaxReached ? "solid" : "dashed",
          borderWidth: "2px",
          borderRadius: "8px",
          transition: "all 0.2s ease",
        }}
      >
        <div className="d-flex flex-column flex-sm-row align-items-center justify-content-between gap-3">
          <div className="d-flex align-items-center gap-3 text-center text-sm-start">
            <div
              className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
              style={{
                width: "40px",
                height: "40px",
                backgroundColor: isDragging
                  ? "#006B3C"
                  : isMaxReached
                  ? "#E5E7EB"
                  : "#EAF6EF",
                color: isDragging
                  ? "#FFFFFF"
                  : isMaxReached
                  ? "#9CA3AF"
                  : "#006B3C",
                transition: "all 0.2s ease",
              }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <div>
              <div className="fw-semibold small" style={{ color: "#1C2D27" }}>
                {isDragging
                  ? "Drop file here to upload"
                  : isMaxReached
                  ? "Maximum 5 active attachments reached"
                  : "+ Add Another Attachment"}
              </div>
              <div className="text-muted small">
                {isMaxReached
                  ? "Remove an existing attachment to upload a new file."
                  : "Drop file here or browse (max 5 active files, 5 MB each, JPG, PNG, WEBP, PDF)"}
              </div>
            </div>
          </div>

          <div>
            <label
              htmlFor={`file-upload-input-${ticketId}`}
              className="btn btn-sm fw-medium px-3 py-1.5 d-inline-flex align-items-center justify-content-center text-nowrap"
              style={{
                backgroundColor: isMaxReached ? "#E5E7EB" : "#006B3C",
                color: isMaxReached ? "#9CA3AF" : "#FFFFFF",
                borderColor: isMaxReached ? "#D1D5DB" : "#006B3C",
                cursor: isMaxReached || isUploading ? "not-allowed" : "pointer",
                height: "36px",
              }}
            >
              {isUploading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" />
                  <span>Uploading…</span>
                </>
              ) : (
                <>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    className="me-2"
                  >
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  <span>Attach File</span>
                </>
              )}
            </label>
            <input
              id={`file-upload-input-${ticketId}`}
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
              className="visually-hidden"
              disabled={isMaxReached || isUploading}
              onChange={handleFileSelect}
              aria-label="Upload Attachment"
            />
          </div>
        </div>
      </div>

      {/* Removed Attachments History Section */}
      {removedAttachments.length > 0 && (
        <div className="mt-4">
          <h4 className="h6 fw-bold mb-3 text-muted text-uppercase tracking-wide">
            Removed Attachments History
          </h4>
          <div className="d-flex flex-column gap-2">
            {removedAttachments.map((att) => (
              <div
                key={att.id}
                className="card border p-3 shadow-sm"
                style={{
                  backgroundColor: "#F3F6F4",
                  borderColor: "#E2E8F0",
                  borderRadius: "8px",
                }}
              >
                <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-2 mb-2">
                  <div className="d-flex align-items-center gap-2">
                    <span
                      className="badge rounded-pill px-2.5 py-1 fw-semibold"
                      style={{
                        backgroundColor: "#F3F4F6",
                        color: "#4B5563",
                        border: "1px solid #D1D5DB",
                        fontSize: "0.75rem",
                      }}
                    >
                      Removed
                    </span>
                    <span className="fw-semibold text-muted text-decoration-line-through">
                      {att.originalFileName}
                    </span>
                    <span className="text-muted small">({formatFileSize(att.fileSize)})</span>
                  </div>
                  <div className="text-muted small">
                    Removed {formatDate(att.removedAt)}
                  </div>
                </div>
                <div
                  className="small text-muted p-2 rounded border"
                  style={{ backgroundColor: "#FFFFFF", borderColor: "#E2E8F0" }}
                >
                  <strong className="text-dark">Reason:</strong> &ldquo;
                  {att.removalReason || "No reason provided"}
                  &rdquo;
                  <span className="ms-2 fst-italic text-muted">(Download Disabled)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Soft Removal Confirmation Modal */}
      {selectedForRemoval && (
        <div
          className="modal d-block"
          tabIndex={-1}
          role="dialog"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.5)", zIndex: 1060 }}
        >
          <div className="modal-dialog modal-dialog-centered" role="document">
            <div
              className="modal-content shadow-lg border-0"
              style={{ borderRadius: "8px", overflow: "hidden" }}
            >
              {/* Modal Header */}
              <div className="modal-header border-bottom py-3 px-4" style={{ backgroundColor: "#F8FAFC" }}>
                <h5 className="modal-title h6 fw-bold mb-0" style={{ color: "#1C2D27" }}>
                  Remove Attachment
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={handleCloseRemovalModal}
                  disabled={isRemoving}
                  aria-label="Close"
                />
              </div>

              {/* Modal Body */}
              <div className="modal-body p-4">
                <p className="text-muted mb-3" style={{ fontSize: "0.925rem" }}>
                  Are you sure you want to remove{" "}
                  <strong className="text-dark">{selectedForRemoval.originalFileName}</strong>?
                  This file will no longer be downloadable.
                </p>

                <div className="mb-3">
                  <label
                    htmlFor="removalReason"
                    className="form-label fw-medium small mb-1"
                    style={{ color: "#1C2D27" }}
                  >
                    Reason for removal <span className="text-danger">*</span>
                  </label>
                  <textarea
                    id="removalReason"
                    rows={3}
                    className={`form-control ${removalError ? "is-invalid" : ""}`}
                    placeholder="e.g. Contains sensitive personal data / uploaded wrong file"
                    value={removalReason}
                    onChange={(e) => setRemovalReason(e.target.value)}
                    disabled={isRemoving}
                    maxLength={255}
                    style={{
                      borderColor: removalError ? "#EF4444" : "#D1D5DB",
                      boxShadow: removalError ? "0 0 0 3px rgba(239, 68, 68, 0.15)" : undefined,
                    }}
                  />
                  {removalError && (
                    <div className="text-danger small mt-1" style={{ color: "#991B1B" }}>
                      {removalError}
                    </div>
                  )}
                  <div className="d-flex justify-content-end text-muted small mt-1">
                    {removalReason.length}/255
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="modal-footer border-top py-2.5 px-4 bg-light d-flex justify-content-end gap-2">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary fw-medium px-3"
                  onClick={handleCloseRemovalModal}
                  disabled={isRemoving}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-sm fw-medium px-3 text-white d-inline-flex align-items-center justify-content-center gap-2"
                  style={{ backgroundColor: "#DC2626", borderColor: "#DC2626", minHeight: "36px" }}
                  onClick={handleConfirmRemoval}
                  disabled={isRemoving}
                >
                  {isRemoving ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" />
                      <span>Removing…</span>
                    </>
                  ) : (
                    <span>Confirm Soft Removal</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttachmentSection;
