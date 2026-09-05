import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRequester } from "../context/RequesterContext.js";
import {
  Category,
  RelatedSystem,
  Priority,
  Ticket,
  fetchCategories,
  fetchRelatedSystems,
  createTicket,
  uploadAttachment,
} from "../api.js";

interface CreateTicketProps {
  onSuccess?: (ticket: Ticket) => void;
  onCancel?: () => void;
}

interface FormErrors {
  category?: string;
  relatedSystem?: string;
  summary?: string;
  description?: string;
}

export const CreateTicket: React.FC<CreateTicketProps> = ({ onSuccess, onCancel }) => {
  const { currentRequester } = useRequester();

  const [categories, setCategories] = useState<Category[]>([]);
  const [relatedSystems, setRelatedSystems] = useState<RelatedSystem[]>([]);
  const [loadingMetadata, setLoadingMetadata] = useState<boolean>(true);
  const [metadataError, setMetadataError] = useState<string | null>(null);

  // Form State
  const [categoryId, setCategoryId] = useState<string>("");
  const [relatedSystemId, setRelatedSystemId] = useState<string>("");
  const [requestedPriority, setRequestedPriority] = useState<Priority>("MEDIUM");
  const [summary, setSummary] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);

  // UI State
  const [errors, setErrors] = useState<FormErrors>({});
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [createdTicket, setCreatedTicket] = useState<Ticket | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadMetadata = useCallback(async () => {
    setLoadingMetadata(true);
    setMetadataError(null);
    try {
      const [cats, systems] = await Promise.all([
        fetchCategories(),
        fetchRelatedSystems(),
      ]);
      setCategories(cats);
      setRelatedSystems(systems);
    } catch (err) {
      console.error("Failed to load ticket metadata:", err);
      setMetadataError(
        err instanceof Error ? err.message : "Unable to load categories and related systems."
      );
    } finally {
      setLoadingMetadata(false);
    }
  }, []);

  useEffect(() => {
    loadMetadata();
  }, [loadMetadata]);

  const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
  const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".pdf"];

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleAddFiles = (filesList: FileList | File[]) => {
    setAttachmentError(null);
    const filesArray = Array.from(filesList);
    const validFiles: File[] = [];

    for (const file of filesArray) {
      const ext = file.name.toLowerCase().substring(file.name.lastIndexOf("."));
      if (!ALLOWED_MIME_TYPES.includes(file.type) && !ALLOWED_EXTENSIONS.includes(ext)) {
        setAttachmentError(`Unsupported file type for "${file.name}". Only JPG, PNG, WEBP, and PDF files are permitted.`);
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setAttachmentError(`File "${file.name}" exceeds the 5 MB size limit.`);
        return;
      }
      validFiles.push(file);
    }

    if (stagedFiles.length + validFiles.length > 5) {
      setAttachmentError("You can attach a maximum of 5 files.");
      return;
    }

    setStagedFiles((prev) => [...prev, ...validFiles]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemoveStagedFile = (index: number) => {
    setStagedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (stagedFiles.length < 5 && !isSubmitting) {
      setIsDragging(true);
    }
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (stagedFiles.length < 5 && !isSubmitting) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (stagedFiles.length >= 5 || isSubmitting) return;

    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      handleAddFiles(e.dataTransfer.files);
    }
  };

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!categoryId) {
      newErrors.category = "Please select a category.";
    }

    if (!relatedSystemId) {
      newErrors.relatedSystem = "Please select a related system.";
    }

    const trimmedSummary = summary.trim();
    if (!trimmedSummary || trimmedSummary.length < 5) {
      newErrors.summary = "Summary must be at least 5 characters.";
    } else if (trimmedSummary.length > 150) {
      newErrors.summary = "Summary cannot exceed 150 characters.";
    }

    const trimmedDesc = description.trim();
    if (!trimmedDesc || trimmedDesc.length < 10) {
      newErrors.description = "Description must be at least 10 characters.";
    } else if (trimmedDesc.length > 2000) {
      newErrors.description = "Description cannot exceed 2000 characters.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);

    if (!validate()) {
      return;
    }

    if (!currentRequester) {
      setApiError("No active requester selected.");
      return;
    }

    setIsSubmitting(true);

    try {
      const ticket = await createTicket(
        {
          categoryId: parseInt(categoryId, 10),
          relatedSystemId: parseInt(relatedSystemId, 10),
          requestedPriority,
          summary: summary.trim(),
          description: description.trim(),
        },
        currentRequester.id
      );

      // Upload staged attachments if any
      if (stagedFiles.length > 0) {
        for (const file of stagedFiles) {
          try {
            await uploadAttachment(ticket.id, file, currentRequester.id);
          } catch (uploadErr) {
            console.error(`Failed to upload attachment ${file.name}:`, uploadErr);
          }
        }
      }

      setCreatedTicket(ticket);
      if (onSuccess) {
        onSuccess(ticket);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
      setApiError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setCategoryId("");
    setRelatedSystemId("");
    setRequestedPriority("MEDIUM");
    setSummary("");
    setDescription("");
    setStagedFiles([]);
    setErrors({});
    setAttachmentError(null);
    setApiError(null);
    setCreatedTicket(null);
  };

  const formattedDate = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(new Date());

  // Priority Pill options
  const priorities: Priority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];

  // Priority styling helpers
  const getPriorityStyle = (p: Priority, isSelected: boolean) => {
    if (!isSelected) {
      return {
        backgroundColor: "#F8FAFC",
        borderColor: "#E2E8F0",
        color: "#64748B",
      };
    }
    switch (p) {
      case "URGENT":
        return { backgroundColor: "#FEE2E2", borderColor: "#EF4444", color: "#991B1B" };
      case "HIGH":
        return { backgroundColor: "#FFEDD5", borderColor: "#F97316", color: "#9A3412" };
      case "MEDIUM":
        return { backgroundColor: "#FEF3C7", borderColor: "#F59E0B", color: "#92400E" };
      case "LOW":
        return { backgroundColor: "#D1FAE5", borderColor: "#10B981", color: "#065F46" };
      default:
        return { backgroundColor: "#EAF6EF", borderColor: "#006B3C", color: "#006B3C" };
    }
  };

  // If ticket was successfully created, show confirmation view
  if (createdTicket) {
    return (
      <div className="container py-4" style={{ maxWidth: "800px" }}>
        <div
          className="card shadow-sm border-0 p-4 p-md-5 text-center"
          style={{ backgroundColor: "#FFFFFF", borderRadius: "8px" }}
        >
          <div className="mb-4">
            <div
              className="rounded-circle d-inline-flex align-items-center justify-content-center"
              style={{
                width: "72px",
                height: "72px",
                backgroundColor: "#D1FAE5",
                color: "#006B3C",
              }}
            >
              <svg
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
          </div>

          <h2 className="h4 fw-bold mb-2" style={{ color: "#1C2D27" }}>
            Ticket Created Successfully
          </h2>
          <p className="text-muted mb-4">
            Your IT support request has been submitted and assigned a ticket number.
          </p>

          <div
            className="p-4 rounded mb-4 text-start border"
            style={{ backgroundColor: "#F3F6F4", borderColor: "#E2E8F0" }}
          >
            <div className="row g-3">
              <div className="col-12 col-sm-6">
                <span className="text-muted small d-block">Ticket Number</span>
                <span className="fw-bold fs-5" style={{ color: "#006B3C" }}>
                  {createdTicket.ticketNumber}
                </span>
              </div>
              <div className="col-12 col-sm-6">
                <span className="text-muted small d-block">Status</span>
                <span
                  className="badge px-2.5 py-1.5 fw-semibold"
                  style={{ backgroundColor: "#DBEAFE", color: "#1E40AF" }}
                >
                  {createdTicket.currentStatus}
                </span>
              </div>
              <div className="col-12 col-sm-6">
                <span className="text-muted small d-block">Category</span>
                <span className="fw-medium" style={{ color: "#1C2D27" }}>
                  {createdTicket.category?.name || "Hardware"}
                </span>
              </div>
              <div className="col-12 col-sm-6">
                <span className="text-muted small d-block">Related System</span>
                <span className="fw-medium" style={{ color: "#1C2D27" }}>
                  {createdTicket.relatedSystem?.name || "Corporate Laptop"}
                </span>
              </div>
              <div className="col-12">
                <span className="text-muted small d-block">Summary</span>
                <span className="fw-medium" style={{ color: "#1C2D27" }}>
                  {createdTicket.summary}
                </span>
              </div>
            </div>
          </div>

          <div className="d-flex flex-column flex-sm-row justify-content-center gap-3">
            <button
              type="button"
              className="btn btn-outline-secondary px-4 py-2"
              onClick={onCancel}
            >
              Back to My Tickets
            </button>
            <button
              type="button"
              className="btn text-white px-4 py-2 fw-medium"
              style={{ backgroundColor: "#006B3C" }}
              onClick={handleResetForm}
            >
              + Create Another Ticket
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isMetadataDisabled = loadingMetadata || Boolean(metadataError) || categories.length === 0;

  return (
    <div className="container py-4" style={{ maxWidth: "840px" }}>
      {/* Header */}
      <div className="mb-4">
        <h1 className="h3 fw-bold mb-1" style={{ color: "#1C2D27", letterSpacing: "-0.01em" }}>
          Create New IT Support Ticket
        </h1>
        <p className="text-muted mb-0" style={{ fontSize: "0.95rem" }}>
          Submit a new request for IT assistance, hardware repairs, or account provisioning.
        </p>
      </div>

      {/* Backend Metadata Offline Error Alert */}
      {metadataError && (
        <div
          className="alert alert-danger d-flex align-items-center justify-content-between mb-4 shadow-sm"
          style={{ backgroundColor: "#FEE2E2", borderColor: "#EF4444", color: "#991B1B" }}
          role="alert"
        >
          <div className="d-flex align-items-center gap-2">
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
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>
              <strong>System Offline:</strong> Unable to load categories and related systems ({metadataError}).
            </span>
          </div>
          <button
            type="button"
            className="btn btn-sm btn-outline-danger fw-semibold px-3"
            onClick={loadMetadata}
            disabled={loadingMetadata}
          >
            {loadingMetadata ? "Retrying..." : "Retry"}
          </button>
        </div>
      )}

      {/* API Submission Error Banner (Persistent) */}
      {apiError && (
        <div
          className="alert alert-danger d-flex align-items-center gap-2 mb-4 shadow-sm"
          style={{ backgroundColor: "#FEE2E2", borderColor: "#EF4444", color: "#991B1B" }}
          role="alert"
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
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <div>
            Submission failed: {apiError}. Your form data has been preserved.
          </div>
        </div>
      )}

      {/* Main Form Card */}
      <div className="card shadow-sm border-0 mb-4" style={{ backgroundColor: "#FFFFFF", borderRadius: "8px" }}>
        <div className="card-body p-4">
          <form onSubmit={handleSubmit} noValidate>
            {/* Requester Header Block */}
            <div
              className="p-3 rounded mb-4 border"
              style={{ backgroundColor: "#F3F6F4", borderColor: "#E2E8F0" }}
            >
              <div className="row g-3">
                <div className="col-12 col-md-6">
                  <span className="text-muted small d-block">Requester Name</span>
                  <span className="fw-semibold" style={{ color: "#1C2D27" }}>
                    {currentRequester ? `${currentRequester.name} (${currentRequester.department})` : "Unassigned"}
                  </span>
                </div>
                <div className="col-12 col-md-6">
                  <span className="text-muted small d-block">Ticket Date</span>
                  <span className="fw-semibold" style={{ color: "#1C2D27" }}>
                    {formattedDate}
                  </span>
                </div>
              </div>
            </div>

            {/* Category and Related System */}
            <div className="row g-3 mb-3">
              <div className="col-12 col-md-6">
                <label htmlFor="categoryId" className="form-label fw-medium" style={{ color: "#1C2D27" }}>
                  Category <span className="text-danger">*</span>
                </label>
                <select
                  id="categoryId"
                  className={`form-select ${errors.category ? "is-invalid" : ""}`}
                  style={{
                    borderColor: errors.category ? "#EF4444" : "#D1D5DB",
                    boxShadow: errors.category ? "0 0 0 3px rgba(239, 68, 68, 0.15)" : undefined,
                  }}
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  disabled={isMetadataDisabled || isSubmitting}
                >
                  <option value="">
                    {loadingMetadata
                      ? "Loading categories…"
                      : isMetadataDisabled
                      ? "Unavailable (System Offline)"
                      : "Select Category"}
                  </option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id.toString()}>
                      {cat.name}
                    </option>
                  ))}
                </select>
                {errors.category && (
                  <div className="text-danger small mt-1" style={{ color: "#991B1B" }}>
                    {errors.category}
                  </div>
                )}
              </div>

              <div className="col-12 col-md-6">
                <label htmlFor="relatedSystemId" className="form-label fw-medium" style={{ color: "#1C2D27" }}>
                  Related System <span className="text-danger">*</span>
                </label>
                <select
                  id="relatedSystemId"
                  className={`form-select ${errors.relatedSystem ? "is-invalid" : ""}`}
                  style={{
                    borderColor: errors.relatedSystem ? "#EF4444" : "#D1D5DB",
                    boxShadow: errors.relatedSystem ? "0 0 0 3px rgba(239, 68, 68, 0.15)" : undefined,
                  }}
                  value={relatedSystemId}
                  onChange={(e) => setRelatedSystemId(e.target.value)}
                  disabled={isMetadataDisabled || isSubmitting}
                >
                  <option value="">
                    {loadingMetadata
                      ? "Loading systems…"
                      : isMetadataDisabled
                      ? "Unavailable (System Offline)"
                      : "Select Related System"}
                  </option>
                  {relatedSystems.map((sys) => (
                    <option key={sys.id} value={sys.id.toString()}>
                      {sys.name}
                    </option>
                  ))}
                </select>
                {errors.relatedSystem && (
                  <div className="text-danger small mt-1" style={{ color: "#991B1B" }}>
                    {errors.relatedSystem}
                  </div>
                )}
              </div>
            </div>

            {/* Requested Priority Pill Selector */}
            <div className="mb-4">
              <label className="form-label fw-medium d-block mb-2" style={{ color: "#1C2D27" }}>
                Requested Priority
              </label>
              <div className="d-flex flex-wrap gap-2">
                {priorities.map((p) => {
                  const isSelected = requestedPriority === p;
                  const style = getPriorityStyle(p, isSelected);
                  return (
                    <label
                      key={p}
                      className="btn btn-sm px-3 py-1.5 fw-semibold text-capitalize rounded-pill border"
                      style={{
                        ...style,
                        cursor: isSubmitting ? "not-allowed" : "pointer",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <input
                        type="radio"
                        name="requestedPriority"
                        value={p}
                        checked={isSelected}
                        onChange={() => setRequestedPriority(p)}
                        className="visually-hidden"
                        disabled={isSubmitting}
                        aria-label={p}
                      />
                      {p.toLowerCase()}
                    </label>
                  );
                })}
              </div>
              <div className="text-muted small mt-1">
                Requested priority may be adjusted by IT staff based on business impact.
              </div>
            </div>

            {/* Summary Input */}
            <div className="mb-3">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <label htmlFor="summary" className="form-label fw-medium mb-0" style={{ color: "#1C2D27" }}>
                  Summary <span className="text-danger">*</span>
                </label>
                <span
                  className="small"
                  style={{ color: summary.length > 150 ? "#DC2626" : "#64748B" }}
                >
                  {summary.length} / 150
                </span>
              </div>
              <input
                id="summary"
                type="text"
                className={`form-control ${errors.summary ? "is-invalid" : ""}`}
                style={{
                  borderColor: errors.summary ? "#EF4444" : "#D1D5DB",
                  boxShadow: errors.summary ? "0 0 0 3px rgba(239, 68, 68, 0.15)" : undefined,
                }}
                placeholder="Brief summary of the issue (5–150 characters)"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                maxLength={150}
                disabled={isSubmitting}
              />
              {errors.summary && (
                <div className="text-danger small mt-1" style={{ color: "#991B1B" }}>
                  {errors.summary}
                </div>
              )}
            </div>

            {/* Description Textarea */}
            <div className="mb-4">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <label htmlFor="description" className="form-label fw-medium mb-0" style={{ color: "#1C2D27" }}>
                  Description <span className="text-danger">*</span>
                </label>
                <span
                  className="small"
                  style={{ color: description.length > 2000 ? "#DC2626" : "#64748B" }}
                >
                  {description.length} / 2000
                </span>
              </div>
              <textarea
                id="description"
                rows={5}
                className={`form-control ${errors.description ? "is-invalid" : ""}`}
                style={{
                  borderColor: errors.description ? "#EF4444" : "#D1D5DB",
                  boxShadow: errors.description ? "0 0 0 3px rgba(239, 68, 68, 0.15)" : undefined,
                }}
                placeholder="Detailed description of the issue or request (10–2000 characters)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={2000}
                disabled={isSubmitting}
              />
              {errors.description && (
                <div className="text-danger small mt-1" style={{ color: "#991B1B" }}>
                  {errors.description}
                </div>
              )}
            </div>

            {/* Supporting Attachments Section (In-Spec FR-05, UI-Spec 5.2) */}
            <div className="mb-4">
              <label className="form-label fw-medium d-block mb-1" style={{ color: "#1C2D27" }}>
                Supporting Attachments{" "}
                <span className="text-muted small fw-normal">
                  (Optional, max 5 files, 5 MB each, JPG, PNG, WEBP, PDF)
                </span>
              </label>

              {attachmentError && (
                <div
                  className="alert alert-danger py-2 small mb-2 shadow-sm d-flex align-items-center justify-content-between"
                  style={{ backgroundColor: "#FEE2E2", borderColor: "#EF4444", color: "#991B1B" }}
                >
                  <span>{attachmentError}</span>
                  <button
                    type="button"
                    className="btn-close btn-close-sm"
                    onClick={() => setAttachmentError(null)}
                    aria-label="Close"
                  />
                </div>
              )}

              {/* Dropzone */}
              <div
                className="p-3 border rounded mb-3 text-center"
                onDragOver={handleDragOver}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                style={{
                  backgroundColor: isDragging
                    ? "#EAF6EF"
                    : stagedFiles.length >= 5
                    ? "#F3F4F6"
                    : "#FFFFFF",
                  borderColor: isDragging
                    ? "#006B3C"
                    : stagedFiles.length >= 5
                    ? "#D1D5DB"
                    : "#006B3C",
                  borderStyle: stagedFiles.length >= 5 ? "solid" : "dashed",
                  borderWidth: "2px",
                  borderRadius: "8px",
                  transition: "all 0.2s ease",
                  cursor: stagedFiles.length >= 5 || isSubmitting ? "not-allowed" : "pointer",
                }}
                onClick={() => {
                  if (stagedFiles.length < 5 && !isSubmitting) {
                    fileInputRef.current?.click();
                  }
                }}
              >
                <div className="d-flex flex-column align-items-center justify-content-center py-2">
                  <div
                    className="rounded-circle d-flex align-items-center justify-content-center mb-2"
                    style={{
                      width: "44px",
                      height: "44px",
                      backgroundColor: isDragging ? "#006B3C" : "#EAF6EF",
                      color: isDragging ? "#FFFFFF" : "#006B3C",
                      transition: "all 0.2s ease",
                    }}
                  >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                  </div>
                  <div className="fw-semibold small" style={{ color: "#1C2D27" }}>
                    {isDragging
                      ? "Drop files here"
                      : stagedFiles.length >= 5
                      ? "Maximum 5 files attached"
                      : "Drag & drop files here or browse"}
                  </div>
                  <div className="text-muted small mt-0.5">
                    {stagedFiles.length >= 5
                      ? "Remove an attached file to add another"
                      : `Selected ${stagedFiles.length} of 5 files`}
                  </div>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
                  className="visually-hidden"
                  disabled={stagedFiles.length >= 5 || isSubmitting}
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleAddFiles(e.target.files);
                    }
                  }}
                  aria-label="Attach Supporting Files"
                />
              </div>

              {/* Staged File Pills */}
              {stagedFiles.length > 0 && (
                <div className="d-flex flex-wrap gap-2">
                  {stagedFiles.map((file, idx) => (
                    <div
                      key={`${file.name}-${idx}`}
                      className="badge p-2 d-inline-flex align-items-center gap-2 border text-start"
                      style={{
                        backgroundColor: "#F3F6F4",
                        borderColor: "#E2E8F0",
                        color: "#1C2D27",
                        fontSize: "0.825rem",
                        fontWeight: "normal",
                        borderRadius: "6px",
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#006B3C" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                      <span className="fw-medium text-truncate" style={{ maxWidth: "160px" }}>
                        {file.name}
                      </span>
                      <span className="text-muted small">({formatFileSize(file.size)})</span>
                      <button
                        type="button"
                        className="btn btn-sm p-0 text-muted ms-1"
                        style={{ lineHeight: 1, border: "none", background: "transparent" }}
                        disabled={isSubmitting}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveStagedFile(idx);
                        }}
                        aria-label={`Remove file ${file.name}`}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="d-flex justify-content-between align-items-center pt-2">
              <button
                type="button"
                className="btn fw-medium px-4"
                style={{ borderColor: "#006B3C", color: "#006B3C" }}
                onClick={onCancel}
                disabled={isSubmitting}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="btn fw-medium px-4 text-white d-flex align-items-center gap-2"
                style={{
                  backgroundColor: isMetadataDisabled ? "#9CA3AF" : "#006B3C",
                  cursor: isSubmitting || isMetadataDisabled ? "not-allowed" : "pointer",
                }}
                disabled={isSubmitting || isMetadataDisabled}
              >
                {isSubmitting ? (
                  <>
                    <span
                      className="spinner-border spinner-border-sm"
                      role="status"
                      aria-hidden="true"
                    ></span>
                    <span>Submitting…</span>
                  </>
                ) : (
                  <span>Submit Ticket</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateTicket;

