import React, { useState, useEffect, useCallback } from "react";
import { useRequester } from "../context/RequesterContext.js";
import {
  Category,
  RelatedSystem,
  Priority,
  Ticket,
  fetchCategories,
  fetchRelatedSystems,
  createTicket,
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

  // UI State
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [createdTicket, setCreatedTicket] = useState<Ticket | null>(null);

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
    setErrors({});
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

            {/* Supporting Attachments Notice */}
            <div
              className="p-3 rounded mb-4 border"
              style={{ backgroundColor: "#F8FAFC", borderColor: "#E2E8F0" }}
            >
              <div className="d-flex align-items-center gap-2 mb-1">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#006B3C" strokeWidth="2">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                </svg>
                <span className="fw-medium small" style={{ color: "#1C2D27" }}>
                  Supporting Attachments (Optional, max 5 files, 5 MB each, JPG, PNG, WEBP, PDF)
                </span>
              </div>
              <div className="text-muted small">
                Attachments can be uploaded and managed after ticket creation in the Ticket Details view.
              </div>
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
