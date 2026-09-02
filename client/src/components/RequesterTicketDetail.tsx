import React, { useState, useEffect, useCallback } from "react";
import { useRequester } from "../context/RequesterContext.js";
import {
  Priority,
  TicketStatus,
  TicketDetail,
  fetchTicketDetail,
} from "../api.js";
import { AttachmentSection } from "./AttachmentSection.js";

interface RequesterTicketDetailProps {
  ticketId: number;
  onBack: () => void;
}

export const RequesterTicketDetail: React.FC<RequesterTicketDetailProps> = ({
  ticketId,
  onBack,
}) => {
  const { currentRequester } = useRequester();

  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadTicket = useCallback(async () => {
    if (!currentRequester) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchTicketDetail(ticketId, currentRequester.id);
      setTicket(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unable to load ticket details.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [ticketId, currentRequester]);

  useEffect(() => {
    loadTicket();
  }, [loadTicket]);

  const formatTicketDate = (isoString?: string | null): string => {
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

  const renderStatusBadge = (st: TicketStatus) => {
    const config: Record<
      TicketStatus,
      { label: string; bg: string; text: string; border: string }
    > = {
      NEW: { label: "New", bg: "#DBEAFE", text: "#1E40AF", border: "#93C5FD" },
      OPEN: { label: "Open", bg: "#CCFBF1", text: "#0D9488", border: "#5EEAD4" },
      IN_PROGRESS: { label: "In Progress", bg: "#EAF6EF", text: "#0B7A46", border: "#A7F3D0" },
      PENDING: { label: "Pending", bg: "#FEF3C7", text: "#D97706", border: "#FDE68A" },
      RESOLVED: { label: "Resolved", bg: "#D1FAE5", text: "#059669", border: "#6EE7B7" },
      CLOSED: { label: "Closed", bg: "#F3F4F6", text: "#4B5563", border: "#D1D5DB" },
    };
    const c = config[st] || config.NEW;
    return (
      <span
        className="badge rounded-pill px-3 py-1.5 fw-semibold"
        style={{
          backgroundColor: c.bg,
          color: c.text,
          border: `1px solid ${c.border}`,
          fontSize: "0.8rem",
        }}
      >
        {c.label}
      </span>
    );
  };

  const renderPriorityBadge = (p: Priority) => {
    const config: Record<
      Priority,
      { label: string; bg: string; text: string; border: string }
    > = {
      LOW: { label: "Low", bg: "#D1FAE5", text: "#059669", border: "#A7F3D0" },
      MEDIUM: { label: "Medium", bg: "#FEF3C7", text: "#D97706", border: "#FDE68A" },
      HIGH: { label: "High", bg: "#FEE2E2", text: "#DC2626", border: "#FCA5A5" },
      URGENT: { label: "Urgent", bg: "#FCA5A5", text: "#991B1B", border: "#F87171" },
    };
    const c = config[p] || config.MEDIUM;
    return (
      <span
        className="badge rounded-pill px-3 py-1.5 fw-semibold"
        style={{
          backgroundColor: c.bg,
          color: c.text,
          border: `1px solid ${c.border}`,
          fontSize: "0.8rem",
        }}
      >
        {c.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="container py-5 text-center">
        <div
          className="spinner-border mb-3"
          role="status"
          style={{ color: "#006B3C", width: "3rem", height: "3rem" }}
        >
          <span className="visually-hidden">Loading ticket details…</span>
        </div>
        <p className="text-muted small">Loading ticket details…</p>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="container py-4" style={{ maxWidth: "1140px" }}>
        <div className="d-flex align-items-center justify-content-between mb-4">
          <div className="text-muted small">
            <span>My Tickets</span> &gt; <strong>Ticket Details</strong>
          </div>
          <button
            type="button"
            className="btn btn-sm btn-outline-success fw-medium d-inline-flex align-items-center gap-1.5 px-3 py-1.5"
            style={{ borderColor: "#006B3C", color: "#006B3C" }}
            onClick={onBack}
          >
            <span>&larr; Back to My Tickets</span>
          </button>
        </div>

        <div
          className="alert alert-danger d-flex align-items-center justify-content-between p-4 shadow-sm"
          style={{ backgroundColor: "#FEE2E2", borderColor: "#EF4444", color: "#991B1B" }}
        >
          <div className="d-flex align-items-center gap-2">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>Unable to load ticket details: {error || "Ticket not found."}</span>
          </div>
          <button
            type="button"
            className="btn btn-sm btn-outline-danger fw-semibold px-3"
            onClick={loadTicket}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-4" style={{ maxWidth: "1140px" }}>
      {/* Top Breadcrumbs & Back Action */}
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div className="text-muted small d-flex align-items-center gap-2">
          <span
            style={{ cursor: "pointer", color: "#006B3C" }}
            onClick={onBack}
          >
            My Tickets
          </span>
          <span>&gt;</span>
          <strong style={{ color: "#1C2D27" }}>Ticket Details</strong>
        </div>

        <button
          type="button"
          className="btn btn-sm btn-outline-success fw-medium d-inline-flex align-items-center gap-1.5 px-3 py-1.5 shadow-sm"
          style={{ borderColor: "#006B3C", color: "#006B3C", backgroundColor: "#FFFFFF" }}
          onClick={onBack}
        >
          <span>&larr; Back to My Tickets</span>
        </button>
      </div>

      {/* Main Ticket Details Card */}
      <div
        className="card shadow-sm border mb-4"
        style={{
          backgroundColor: "#FFFFFF",
          borderColor: "#E2E8F0",
          borderRadius: "8px",
        }}
      >
        <div className="card-body p-4 p-md-5">
          {/* Metadata Grid */}

          {/* Row 1: Ticket No., Ticket Date, Category, Related System */}
          <div className="row g-3 mb-3">
            <div className="col-12 col-sm-6 col-lg-3">
              <label className="form-label small fw-medium text-muted mb-1">
                Ticket No.
              </label>
              <div
                className="rounded border d-flex align-items-center px-3 fw-bold"
                style={{
                  backgroundColor: "#F3F6F4",
                  borderColor: "#E2E8F0",
                  color: "#006B3C",
                  height: "44px",
                  minHeight: "44px",
                  fontSize: "0.95rem",
                  borderRadius: "6px",
                }}
              >
                {ticket.ticketNumber}
              </div>
            </div>

            <div className="col-12 col-sm-6 col-lg-3">
              <label className="form-label small fw-medium text-muted mb-1">
                Ticket Date
              </label>
              <div
                className="rounded border d-flex align-items-center px-3 text-truncate"
                style={{
                  backgroundColor: "#F3F6F4",
                  borderColor: "#E2E8F0",
                  color: "#1C2D27",
                  height: "44px",
                  minHeight: "44px",
                  fontSize: "0.9rem",
                  borderRadius: "6px",
                }}
              >
                {formatTicketDate(ticket.createdAt)}
              </div>
            </div>

            <div className="col-12 col-sm-6 col-lg-3">
              <label className="form-label small fw-medium text-muted mb-1">
                Category
              </label>
              <div
                className="rounded border d-flex align-items-center px-3 text-truncate fw-medium"
                style={{
                  backgroundColor: "#F3F6F4",
                  borderColor: "#E2E8F0",
                  color: "#1C2D27",
                  height: "44px",
                  minHeight: "44px",
                  fontSize: "0.9rem",
                  borderRadius: "6px",
                }}
              >
                {ticket.category.name}
              </div>
            </div>

            <div className="col-12 col-sm-6 col-lg-3">
              <label className="form-label small fw-medium text-muted mb-1">
                Related System
              </label>
              <div
                className="rounded border d-flex align-items-center px-3 text-truncate fw-medium"
                style={{
                  backgroundColor: "#F3F6F4",
                  borderColor: "#E2E8F0",
                  color: "#1C2D27",
                  height: "44px",
                  minHeight: "44px",
                  fontSize: "0.9rem",
                  borderRadius: "6px",
                }}
              >
                {ticket.relatedSystem.name}
              </div>
            </div>
          </div>

          {/* Row 2: Requester, Requested Priority, IT Priority, Current Status */}
          <div className="row g-3 mb-3">
            <div className="col-12 col-sm-6 col-lg-3">
              <label className="form-label small fw-medium text-muted mb-1">
                Requester
              </label>
              <div
                className="rounded border d-flex align-items-center px-3 text-truncate"
                style={{
                  backgroundColor: "#F3F6F4",
                  borderColor: "#E2E8F0",
                  color: "#1C2D27",
                  height: "44px",
                  minHeight: "44px",
                  fontSize: "0.9rem",
                  borderRadius: "6px",
                }}
                title={`${ticket.requester.name} (${ticket.requester.department})`}
              >
                {ticket.requester.name}
              </div>
            </div>

            <div className="col-12 col-sm-6 col-lg-3">
              <label className="form-label small fw-medium text-muted mb-1">
                Requested Priority
              </label>
              <div
                className="rounded border d-flex align-items-center px-3"
                style={{
                  backgroundColor: "#F3F6F4",
                  borderColor: "#E2E8F0",
                  height: "44px",
                  minHeight: "44px",
                  borderRadius: "6px",
                }}
              >
                {renderPriorityBadge(ticket.requestedPriority)}
              </div>
            </div>

            <div className="col-12 col-sm-6 col-lg-3">
              <label className="form-label small fw-medium text-muted mb-1">
                IT Priority
              </label>
              <div
                className="rounded border d-flex align-items-center px-3"
                style={{
                  backgroundColor: "#F3F6F4",
                  borderColor: "#E2E8F0",
                  height: "44px",
                  minHeight: "44px",
                  borderRadius: "6px",
                }}
              >
                {renderPriorityBadge(ticket.itPriority)}
              </div>
            </div>

            <div className="col-12 col-sm-6 col-lg-3">
              <label className="form-label small fw-medium text-muted mb-1">
                Current Status
              </label>
              <div
                className="rounded border d-flex align-items-center px-3"
                style={{
                  backgroundColor: "#F3F6F4",
                  borderColor: "#E2E8F0",
                  height: "44px",
                  minHeight: "44px",
                  borderRadius: "6px",
                }}
              >
                {renderStatusBadge(ticket.currentStatus)}
              </div>
            </div>
          </div>

          {/* Row 3: Ticket Owner, Summary */}
          <div className="row g-3 mb-3">
            <div className="col-12 col-md-4">
              <label className="form-label small fw-medium text-muted mb-1">
                Ticket Owner
              </label>
              <div
                className="rounded border d-flex align-items-center px-3 text-truncate"
                style={{
                  backgroundColor: "#F3F6F4",
                  borderColor: "#E2E8F0",
                  color: "#1C2D27",
                  height: "44px",
                  minHeight: "44px",
                  fontSize: "0.9rem",
                  borderRadius: "6px",
                }}
              >
                {ticket.ticketOwner || "Unassigned"}
              </div>
            </div>

            <div className="col-12 col-md-8">
              <label className="form-label small fw-medium text-muted mb-1">
                Summary
              </label>
              <div
                className="rounded border d-flex align-items-center px-3 fw-medium text-truncate"
                style={{
                  backgroundColor: "#F3F6F4",
                  borderColor: "#E2E8F0",
                  color: "#1C2D27",
                  height: "44px",
                  minHeight: "44px",
                  fontSize: "0.95rem",
                  borderRadius: "6px",
                }}
              >
                {ticket.summary}
              </div>
            </div>
          </div>

          {/* Row 4: Description */}
          <div className="mb-3">
            <label className="form-label small fw-medium text-muted mb-1">
              Description
            </label>
            <div
              className="rounded border p-3"
              style={{
                backgroundColor: "#F3F6F4",
                borderColor: "#E2E8F0",
                color: "#1C2D27",
                fontSize: "0.925rem",
                minHeight: "120px",
                whiteSpace: "pre-wrap",
                lineHeight: "1.6",
                borderRadius: "6px",
              }}
            >
              {ticket.description}
            </div>
          </div>

          {/* Row 5: Resolution Summary */}
          <div className="mb-4">
            <label className="form-label small fw-medium text-muted mb-1">
              Resolution Summary
            </label>
            <div
              className="rounded border px-3 py-2.5 fst-italic d-flex align-items-center"
              style={{
                backgroundColor: "#F3F6F4",
                borderColor: "#E2E8F0",
                color: ticket.resolutionSummary ? "#1C2D27" : "#64748B",
                fontSize: "0.9rem",
                minHeight: "56px",
                borderRadius: "6px",
              }}
            >
              {ticket.resolutionSummary || "No resolution summary available yet."}
            </div>
          </div>

          {/* Attachments Section */}
          <AttachmentSection
            ticketId={ticket.id}
            requesterId={currentRequester?.id ?? ticket.requesterId}
            attachments={ticket.attachments}
            onAttachmentsChange={(newAttachments) => {
              setTicket((prev) =>
                prev ? { ...prev, attachments: newAttachments } : null
              );
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default RequesterTicketDetail;
