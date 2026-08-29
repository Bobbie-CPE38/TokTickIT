import React, { useState, useEffect } from "react";
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

  useEffect(() => {
    let mounted = true;
    async function loadMetadata() {
      try {
        const [cats, systems] = await Promise.all([
          fetchCategories(),
          fetchRelatedSystems(),
        ]);
        if (mounted) {
          setCategories(cats);
          setRelatedSystems(systems);
        }
      } catch (err) {
        console.error("Failed to load ticket metadata:", err);
      } finally {
        if (mounted) {
          setLoadingMetadata(false);
        }
      }
    }
    loadMetadata();
    return () => {
      mounted = false;
    };
  }, []);

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
      const msg = err instanceof Error ? err.message : "Failed to create ticket";
      setApiError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formattedDate = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "numeric",
    hour12: true,
  }).format(new Date());

  if (createdTicket) {
    return (
      <div className="container py-4" style={{ maxWidth: 840 }}>
        <div className="card shadow-sm border-0" style={{ backgroundColor: "#FFFFFF", borderRadius: "8px" }}>
          <div className="card-body p-5 text-center">
            <div
              className="rounded-circle d-inline-flex align-items-center justify-content-center mb-3"
              style={{ width: "64px", height: "64px", backgroundColor: "#D1FAE5", color: "#065F46" }}
            >
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h2 className="h4 fw-bold mb-2" style={{ color: "#1C2D27" }}>
              Ticket Created Successfully
            </h2>
            <p className="text-muted mb-4">
              Your support ticket has been submitted to the IT service desk.
            </p>
            <div
              className="p-3 rounded mb-4 d-inline-block text-start"
              style={{ backgroundColor: "#EAF6EF", border: "1px solid #A7F3D0", minWidth: "300px" }}
            >
              <div className="small text-muted mb-1">Official Ticket Number:</div>
              <div className="h5 fw-bold mb-0" style={{ color: "#006B3C" }}>
                {createdTicket.ticketNumber}
              </div>
            </div>
            <div className="d-flex justify-content-center gap-3">
              {onCancel && (
                <button
                  type="button"
                  className="btn px-4 fw-medium"
                  style={{ borderColor: "#006B3C", color: "#006B3C" }}
                  onClick={onCancel}
                >
                  Back to My Tickets
                </button>
              )}
              <button
                type="button"
                className="btn px-4 fw-medium text-white"
                style={{ backgroundColor: "#006B3C" }}
                onClick={() => {
                  setCreatedTicket(null);
                  setSummary("");
                  setDescription("");
                  setCategoryId("");
                  setRelatedSystemId("");
                  setRequestedPriority("MEDIUM");
                  setErrors({});
                  setApiError(null);
                }}
              >
                Create Another Ticket
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-4" style={{ maxWidth: 900 }}>
      {/* Breadcrumb */}
      <div className="text-muted small mb-2">
        <span>My Tickets</span> &gt; <span className="fw-medium" style={{ color: "#1C2D27" }}>Create Ticket</span>
      </div>

      {/* Heading */}
      <div className="mb-4">
        <h1 className="h3 fw-bold mb-1" style={{ color: "#1C2D27" }}>
          Create New IT Support Ticket
        </h1>
        <p className="text-muted mb-0">
          Describe your issue and attach supporting evidence for the IT team.
        </p>
      </div>

      {/* Persistent Error Banner */}
      {apiError && (
        <div
          className="alert alert-danger d-flex align-items-center gap-2 mb-4 shadow-sm"
          style={{ backgroundColor: "#FEE2E2", borderColor: "#EF4444", color: "#991B1B" }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
                  disabled={loadingMetadata || isSubmitting}
                >
                  <option value="">Select Category</option>
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
                  disabled={loadingMetadata || isSubmitting}
                >
                  <option value="">Select Related System</option>
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

            {/* Requested Priority */}
            <div className="mb-3">
              <label className="form-label fw-medium d-block" style={{ color: "#1C2D27" }}>
                Requested Priority <span className="text-danger">*</span>
              </label>
              <div className="d-flex flex-wrap gap-2">
                {(
                  [
                    { value: "LOW", label: "Low", bg: "#D1FAE5", text: "#059669", border: "#A7F3D0" },
                    { value: "MEDIUM", label: "Medium", bg: "#FEF3C7", text: "#D97706", border: "#FDE68A" },
                    { value: "HIGH", label: "High", bg: "#FEE2E2", text: "#DC2626", border: "#FCA5A5" },
                    { value: "URGENT", label: "Urgent", bg: "#FCA5A5", text: "#991B1B", border: "#F87171" },
                  ] as const
                ).map((p) => {
                  const isChecked = requestedPriority === p.value;
                  return (
                    <label
                      key={p.value}
                      className="btn d-flex align-items-center gap-2 px-3 py-2 border rounded"
                      style={{
                        backgroundColor: isChecked ? p.bg : "#FFFFFF",
                        color: isChecked ? p.text : "#1C2D27",
                        borderColor: isChecked ? p.border : "#D1D5DB",
                        cursor: "pointer",
                        fontWeight: isChecked ? 600 : 400,
                      }}
                    >
                      <input
                        type="radio"
                        name="requestedPriority"
                        value={p.value}
                        checked={isChecked}
                        onChange={() => setRequestedPriority(p.value)}
                        className="form-check-input m-0"
                        disabled={isSubmitting}
                      />
                      <span>{p.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Summary */}
            <div className="mb-3">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <label htmlFor="summary" className="form-label fw-medium m-0" style={{ color: "#1C2D27" }}>
                  Summary <span className="text-danger">*</span> (5–150 characters)
                </label>
                <span className="small text-muted">{summary.length}/150 characters</span>
              </div>
              <input
                type="text"
                id="summary"
                className={`form-control ${errors.summary ? "is-invalid" : ""}`}
                style={{
                  borderColor: errors.summary ? "#EF4444" : "#D1D5DB",
                  boxShadow: errors.summary ? "0 0 0 3px rgba(239, 68, 68, 0.15)" : undefined,
                }}
                maxLength={150}
                placeholder="Brief summary of the issue..."
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                disabled={isSubmitting}
              />
              {errors.summary && (
                <div className="text-danger small mt-1" style={{ color: "#991B1B" }}>
                  {errors.summary}
                </div>
              )}
            </div>

            {/* Description */}
            <div className="mb-4">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <label htmlFor="description" className="form-label fw-medium m-0" style={{ color: "#1C2D27" }}>
                  Description <span className="text-danger">*</span> (10–2000 characters)
                </label>
                <span className="small text-muted">{description.length}/2000 characters</span>
              </div>
              <textarea
                id="description"
                rows={4}
                className={`form-control ${errors.description ? "is-invalid" : ""}`}
                style={{
                  borderColor: errors.description ? "#EF4444" : "#D1D5DB",
                  boxShadow: errors.description ? "0 0 0 3px rgba(239, 68, 68, 0.15)" : undefined,
                  minHeight: "120px",
                }}
                maxLength={2000}
                placeholder="Detailed description of what happened, error messages, and reproduction steps..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
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
                  backgroundColor: "#006B3C",
                  cursor: isSubmitting ? "not-allowed" : "pointer",
                }}
                disabled={isSubmitting}
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
                  <>
                    <span>Submit Ticket</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="5" y1="12" x2="19" y2="12" />
                      <polyline points="12 5 19 12 12 19" />
                    </svg>
                  </>
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
