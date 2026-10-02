import React from "react";
import { ActionTaken } from "../types.js";

interface ActionTakenCardProps {
  action: ActionTaken;
  readOnly?: boolean;
  onEdit?: () => void;
}

export const ActionTakenCard: React.FC<ActionTakenCardProps> = ({
  action,
  readOnly = false,
  onEdit,
}) => {
  const performerName =
    action.performedBy?.name || action.performer?.name || `Staff ID #${action.performedByUserId}`;
  const performerRole = action.performedBy?.role || action.performer?.role;

  const formatDateTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div
      className="card mb-3 shadow-sm"
      style={{
        backgroundColor: "#FFFFFF",
        borderColor: "#E2E8F0",
        borderRadius: "8px",
      }}
    >
      <div className="card-body p-3 p-md-4">
        {/* Header: Date/Time, Performer, Badges, and optional Edit button */}
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 pb-3 mb-3 border-bottom border-light-subtle">
          <div className="d-flex flex-wrap align-items-center gap-2">
            <span className="fw-semibold text-dark" style={{ fontSize: "0.95rem" }}>
              {formatDateTime(action.actionDateTime)}
            </span>
            <span className="text-muted small">&bull;</span>
            <span className="text-muted small d-inline-flex align-items-center gap-1.5 flex-wrap">
              Performed by: <strong className="text-dark">{performerName}</strong>
              <span
                className="badge px-2 py-0.5 fw-medium"
                style={{
                  fontSize: "0.7rem",
                  color: performerRole === "ADMINISTRATOR" ? "#6D28D9" : "#0B7A46",
                  backgroundColor: performerRole === "ADMINISTRATOR" ? "#EDE9FE" : "#EAF6EF",
                  border: `1px solid ${performerRole === "ADMINISTRATOR" ? "#DDD6FE" : "#A7F3D0"}`,
                }}
              >
                {performerRole === "ADMINISTRATOR" ? "Administrator" : "IT Staff"}
              </span>
            </span>
          </div>

          <div className="d-flex align-items-center gap-2">
            {action.isFollowUpRequired ? (
              <span
                className="badge px-2.5 py-1.5 fw-medium rounded-pill"
                style={{
                  color: "#B45309",
                  backgroundColor: "#FEF3C7",
                  border: "1px solid #FDE68A",
                  fontSize: "0.75rem",
                }}
              >
                Follow-Up Required
              </span>
            ) : (
              <span
                className="badge px-2.5 py-1.5 fw-medium rounded-pill"
                style={{
                  color: "#065F46",
                  backgroundColor: "#D1FAE5",
                  border: "1px solid #A7F3D0",
                  fontSize: "0.75rem",
                }}
              >
                Action Complete
              </span>
            )}

            {!readOnly && onEdit && (
              <button
                type="button"
                className="btn btn-sm px-3 ms-2 fw-medium"
                style={{
                  backgroundColor: "#FFFFFF",
                  color: "#006B3C",
                  border: "1px solid #006B3C",
                  borderRadius: "6px",
                  minHeight: "36px",
                }}
                onClick={onEdit}
              >
                Edit
              </button>
            )}
          </div>
        </div>

        {/* Action Description */}
        <div className="mb-3">
          <div className="text-muted small fw-semibold mb-1">Description:</div>
          <div
            className="text-dark p-2 px-3 rounded"
            style={{
              backgroundColor: "#F8FAF9",
              border: "1px solid #E2E8F0",
              whiteSpace: "pre-wrap",
              fontSize: "0.9rem",
              lineHeight: 1.5,
            }}
          >
            {action.description}
          </div>
        </div>

        {/* Action Result */}
        <div className="mb-3">
          <div className="text-muted small fw-semibold mb-1">Result:</div>
          <div
            className="text-dark p-2 px-3 rounded"
            style={{
              backgroundColor: "#F8FAF9",
              border: "1px solid #E2E8F0",
              whiteSpace: "pre-wrap",
              fontSize: "0.9rem",
              lineHeight: 1.5,
            }}
          >
            {action.result}
          </div>
        </div>

        {/* Follow-Up Note Callout (if flagged) */}
        {action.isFollowUpRequired && action.followUpNote && (
          <div
            className="p-3 rounded mb-3"
            style={{
              backgroundColor: "#FFFBEB",
              border: "1px solid #FDE68A",
              borderLeft: "4px solid #F59E0B",
            }}
          >
            <div
              className="fw-semibold mb-1 small"
              style={{ color: "#B45309" }}
            >
              Follow-Up Note:
            </div>
            <div
              style={{
                color: "#92400E",
                fontSize: "0.875rem",
                whiteSpace: "pre-wrap",
              }}
            >
              {action.followUpNote}
            </div>
          </div>
        )}

        {/* Attachment Notes Callout (if present) */}
        {action.attachmentNotes && (
          <div
            className="p-2.5 px-3 rounded text-muted small"
            style={{
              backgroundColor: "#F3F6F4",
              border: "1px solid #E2E8F0",
            }}
          >
            <span className="fw-semibold text-dark">Attachment Notes: </span>
            <span>{action.attachmentNotes}</span>
          </div>
        )}
      </div>
    </div>
  );
};
