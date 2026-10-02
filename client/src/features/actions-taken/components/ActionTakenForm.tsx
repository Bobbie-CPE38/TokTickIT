import React, { useState } from "react";
import { ActionTaken } from "../types.js";
import { createActionTaken, updateActionTaken } from "../api.js";

interface ActionTakenFormProps {
  ticketId: number;
  action?: ActionTaken; // present if editing
  onSuccess: (action: ActionTaken) => void;
  onCancel: () => void;
}

function formatForDateTimeLocal(isoString?: string): string {
  const d = isoString ? new Date(isoString) : new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export const ActionTakenForm: React.FC<ActionTakenFormProps> = ({
  ticketId,
  action,
  onSuccess,
  onCancel,
}) => {
  const isEditMode = Boolean(action);

  const [actionDateTime, setActionDateTime] = useState<string>(
    formatForDateTimeLocal(action?.actionDateTime)
  );
  const [description, setDescription] = useState<string>(action?.description || "");
  const [result, setResult] = useState<string>(action?.result || "");
  const [isFollowUpRequired, setIsFollowUpRequired] = useState<boolean>(
    action?.isFollowUpRequired || false
  );
  const [followUpNote, setFollowUpNote] = useState<string>(action?.followUpNote || "");
  const [attachmentNotes, setAttachmentNotes] = useState<string>(
    action?.attachmentNotes || ""
  );

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [followUpError, setFollowUpError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFollowUpError(null);

    // Client-side validations
    if (description.trim().length < 3) {
      setError("Action description must be at least 3 characters.");
      return;
    }
    if (result.trim().length < 3) {
      setError("Result must be at least 3 characters.");
      return;
    }
    if (isFollowUpRequired && (!followUpNote.trim() || followUpNote.trim().length < 3)) {
      setFollowUpError(
        "Follow-up note is required when follow-up is flagged (minimum 3 characters)."
      );
      return;
    }

    setSubmitting(true);
    try {
      const isoDateTime = actionDateTime ? new Date(actionDateTime).toISOString() : undefined;
      let savedAction: ActionTaken;

      if (isEditMode && action) {
        savedAction = await updateActionTaken(action.id, {
          actionDateTime: isoDateTime,
          description: description.trim(),
          result: result.trim(),
          isFollowUpRequired,
          followUpNote: isFollowUpRequired ? followUpNote.trim() : null,
          attachmentNotes: attachmentNotes.trim() || null,
        });
      } else {
        savedAction = await createActionTaken(ticketId, {
          actionDateTime: isoDateTime,
          description: description.trim(),
          result: result.trim(),
          isFollowUpRequired,
          followUpNote: isFollowUpRequired ? followUpNote.trim() : null,
          attachmentNotes: attachmentNotes.trim() || null,
        });
      }

      onSuccess(savedAction);
    } catch (err: any) {
      // Form values are preserved in state on failure (BR-17)
      setError(err.message || "Failed to save action taken. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="card mb-3 shadow-sm"
      style={{
        backgroundColor: "#FFFFFF",
        borderColor: "#0B7A46",
        borderRadius: "8px",
      }}
    >
      <div className="card-header bg-white border-bottom py-3 px-3 px-md-4">
        <h5 className="mb-0 fw-semibold" style={{ color: "#006B3C", fontSize: "1.05rem" }}>
          {isEditMode ? "Edit Action Taken" : "Record Action Taken"}
        </h5>
      </div>

      <div className="card-body p-3 p-md-4">
        {error && (
          <div
            className="alert alert-danger mb-3 py-2 px-3 small d-flex align-items-center"
            role="alert"
            style={{
              backgroundColor: "#FEE2E2",
              borderColor: "#EF4444",
              color: "#991B1B",
            }}
          >
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {/* Action Date/Time */}
          <div className="mb-3">
            <label
              htmlFor="actionDateTime"
              className="form-label fw-semibold text-muted small mb-1"
            >
              Action Date/Time <span className="text-danger">*</span>
            </label>
            <input
              type="datetime-local"
              id="actionDateTime"
              name="actionDateTime"
              className="form-control"
              style={{
                borderRadius: "6px",
                borderColor: "#D1D5DB",
                minHeight: "40px",
                maxWidth: "320px",
              }}
              value={actionDateTime}
              onChange={(e) => setActionDateTime(e.target.value)}
              required
            />
          </div>

          {/* Action Description */}
          <div className="mb-3">
            <div className="d-flex justify-content-between align-items-center mb-1">
              <label
                htmlFor="actionDescription"
                className="form-label fw-semibold text-muted small mb-0"
              >
                Action Description <span className="text-danger">*</span>
              </label>
              <span className="text-muted small" style={{ fontSize: "0.75rem" }}>
                {description.length} / 2000 characters
              </span>
            </div>
            <textarea
              id="actionDescription"
              name="actionDescription"
              rows={3}
              className="form-control"
              style={{
                borderRadius: "6px",
                borderColor: "#D1D5DB",
                fontSize: "0.9rem",
              }}
              placeholder="Describe the concrete technical step taken..."
              value={description}
              maxLength={2000}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          {/* Result */}
          <div className="mb-3">
            <div className="d-flex justify-content-between align-items-center mb-1">
              <label
                htmlFor="actionResult"
                className="form-label fw-semibold text-muted small mb-0"
              >
                Result <span className="text-danger">*</span>
              </label>
              <span className="text-muted small" style={{ fontSize: "0.75rem" }}>
                {result.length} / 2000 characters
              </span>
            </div>
            <textarea
              id="actionResult"
              name="actionResult"
              rows={3}
              className="form-control"
              style={{
                borderRadius: "6px",
                borderColor: "#D1D5DB",
                fontSize: "0.9rem",
              }}
              placeholder="Describe the outcome or finding..."
              value={result}
              maxLength={2000}
              onChange={(e) => setResult(e.target.value)}
              required
            />
          </div>

          {/* Follow-Up Required Toggle */}
          <div className="form-check form-switch mb-3">
            <input
              type="checkbox"
              id="followUpRequired"
              name="followUpRequired"
              className="form-check-input"
              role="switch"
              checked={isFollowUpRequired}
              onChange={(e) => {
                setIsFollowUpRequired(e.target.checked);
                if (!e.target.checked) {
                  setFollowUpError(null);
                }
              }}
              style={{ cursor: "pointer" }}
            />
            <label
              htmlFor="followUpRequired"
              className="form-check-label fw-semibold text-dark small"
              style={{ cursor: "pointer" }}
            >
              Follow-up required?
            </label>
          </div>

          {/* Conditional Follow-up Note */}
          {isFollowUpRequired && (
            <div
              className="p-3 mb-3 rounded"
              style={{
                backgroundColor: "#FFFBEB",
                border: "1px solid #FDE68A",
              }}
            >
              <div className="d-flex justify-content-between align-items-center mb-1">
                <label
                  htmlFor="followUpNote"
                  className="form-label fw-semibold small mb-0"
                  style={{ color: "#B45309" }}
                >
                  Follow-up Note <span className="text-danger">*</span>
                </label>
                <span
                  className="small"
                  style={{
                    color: followUpNote.length > 900 ? "#B45309" : "#6B7280",
                    fontSize: "0.75rem",
                  }}
                >
                  {followUpNote.length} / 1000 characters
                </span>
              </div>
              <textarea
                id="followUpNote"
                name="followUpNote"
                rows={2}
                className="form-control"
                style={{
                  borderRadius: "6px",
                  borderColor: followUpError ? "#EF4444" : "#D1D5DB",
                  fontSize: "0.9rem",
                }}
                placeholder="Specify next steps or pending deliveries (up to 1000 characters)..."
                value={followUpNote}
                maxLength={1000}
                onChange={(e) => {
                  setFollowUpNote(e.target.value);
                  if (followUpError && e.target.value.trim().length >= 3) {
                    setFollowUpError(null);
                  }
                }}
              />
              {followUpError && (
                <div className="small mt-1" style={{ color: "#991B1B" }}>
                  {followUpError}
                </div>
              )}
            </div>
          )}

          {/* Attachment Notes */}
          <div className="mb-4">
            <label
              htmlFor="attachmentNotes"
              className="form-label fw-semibold text-muted small mb-1"
            >
              Attachment Notes
            </label>
            <input
              type="text"
              id="attachmentNotes"
              name="attachmentNotes"
              className="form-control"
              style={{
                borderRadius: "6px",
                borderColor: "#D1D5DB",
                fontSize: "0.9rem",
                minHeight: "40px",
              }}
              placeholder="e.g. diagnostic_log.txt or screenshot.png"
              value={attachmentNotes}
              maxLength={500}
              onChange={(e) => setAttachmentNotes(e.target.value)}
            />
          </div>

          {/* Actions: Save & Cancel with Debounce Spinner (BR-18) */}
          <div className="d-flex align-items-center gap-2">
            <button
              type="submit"
              className="btn btn-sm px-4 fw-semibold text-white d-inline-flex align-items-center"
              style={{
                backgroundColor: "#006B3C",
                borderColor: "#006B3C",
                borderRadius: "6px",
                minHeight: "38px",
              }}
              disabled={submitting}
            >
              {submitting && (
                <span
                  className="spinner-border spinner-border-sm me-2"
                  role="status"
                  aria-hidden="true"
                />
              )}
              {submitting
                ? isEditMode
                  ? "Saving Changes..."
                  : "Saving Action..."
                : isEditMode
                ? "Save Changes"
                : "Save Action"}
            </button>

            <button
              type="button"
              className="btn btn-sm px-3 fw-medium"
              style={{
                backgroundColor: "#FFFFFF",
                color: "#52665D",
                border: "1px solid #D1D5DB",
                borderRadius: "6px",
                minHeight: "38px",
              }}
              onClick={onCancel}
              disabled={submitting}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
