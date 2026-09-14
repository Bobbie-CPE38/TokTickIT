import React, { useState, useRef } from "react";
import {
  Attachment,
  uploadAttachment,
  downloadAttachment,
  softRemoveAttachment,
} from "../../api.js";
import { SoftRemoveModal } from "./SoftRemoveModal.js";

export interface AttachmentSectionProps {
  ticketId: number;
  requesterId: number;
  attachments: Attachment[];
  onAttachmentsChange?: (attachments: Attachment[]) => void;
}

export const AttachmentList: React.FC<AttachmentSectionProps> = ({
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

      {/* Active Attachments List */}
      {activeAttachments.length > 0 ? (
        <div className="table-responsive mb-4">
          <table className="table table-hover align-middle border shadow-sm rounded-2 overflow-hidden mb-0">
            <thead style={{ backgroundColor: "#F8FAFC" }}>
              <tr>
                <th className="py-2.5 px-3 text-muted small fw-semibold">File Name</th>
                <th className="py-2.5 px-3 text-muted small fw-semibold">Size</th>
                <th className="py-2.5 px-3 text-muted small fw-semibold">Uploaded Date</th>
                <th className="py-2.5 px-3 text-muted small fw-semibold text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {activeAttachments.map((att) => (
                <tr key={att.id}>
                  <td className="py-3 px-3">
                    <div className="d-flex align-items-center gap-2">
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
                      <span className="fw-medium text-dark">{att.originalFileName}</span>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-muted small">{formatFileSize(att.fileSize)}</td>
                  <td className="py-3 px-3 text-muted small">{formatDate(att.createdAt)}</td>
                  <td className="py-3 px-3 text-end">
                    <div className="d-inline-flex gap-2">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-success d-inline-flex align-items-center gap-1.5"
                        style={{ borderColor: "#006B3C", color: "#006B3C" }}
                        onClick={() => handleDownload(att)}
                        disabled={downloadingId === att.id}
                        aria-label={`Download ${att.originalFileName}`}
                      >
                        {downloadingId === att.id ? (
                          <span className="spinner-border spinner-border-sm" role="status" />
                        ) : (
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
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
                        className="btn btn-sm btn-outline-danger d-inline-flex align-items-center gap-1.5"
                        onClick={() => handleOpenRemovalModal(att)}
                        aria-label={`Remove ${att.originalFileName}`}
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                        <span>Remove</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card p-4 text-center text-muted mb-4 border-dashed bg-light">
          <p className="mb-0 small">No active attachments uploaded for this ticket.</p>
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
        <SoftRemoveModal
          attachment={selectedForRemoval}
          removalReason={removalReason}
          removalError={removalError}
          isRemoving={isRemoving}
          onReasonChange={setRemovalReason}
          onConfirm={handleConfirmRemoval}
          onClose={handleCloseRemovalModal}
        />
      )}
    </div>
  );
};

export const AttachmentSection = AttachmentList;
export default AttachmentList;
