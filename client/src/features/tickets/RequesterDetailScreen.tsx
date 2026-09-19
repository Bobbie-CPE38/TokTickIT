import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../context/AuthContext.js";
import {
  Priority,
  TicketStatus,
  TicketDetail,
  PublicComment,
  fetchTicketDetail,
  indicateTicketResolved,
  fetchPublicComments,
  createPublicComment,
} from "../../api.js";
import { AttachmentList as AttachmentSection } from "../attachments/AttachmentList.js";
import { StatusBadge } from "../../components/common/StatusBadge.js";
import { PriorityBadge } from "../../components/common/PriorityBadge.js";

export interface RequesterTicketDetailProps {
  ticketId: number;
  onBack: () => void;
  defaultTab?: "comments" | "attachments";
}

export const RequesterTicketDetail: React.FC<RequesterTicketDetailProps> = ({
  ticketId,
  onBack,
  defaultTab = "attachments",
}) => {
  let activeUser: { id: number; name: string; email: string; role?: string } | null = null;
  try {
    const auth = useAuth();
    activeUser = auth.user;
  } catch {
    // fallback if outside AuthProvider
  }
  if (!activeUser) {
    try {
      const userStr = typeof window !== "undefined" ? localStorage.getItem("toktickit_auth_user") : null;
      if (userStr) activeUser = JSON.parse(userStr);
    } catch {}
  }

  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"comments" | "attachments">(defaultTab);
  const [comments, setComments] = useState<PublicComment[]>([]);
  const [commentContent, setCommentContent] = useState<string>("");
  const [postingComment, setPostingComment] = useState<boolean>(false);
  const [commentError, setCommentError] = useState<string | null>(null);

  const [showResolveModal, setShowResolveModal] = useState<boolean>(false);
  const [resolving, setResolving] = useState<boolean>(false);
  const [resolveError, setResolveError] = useState<string | null>(null);

  const loadTicket = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchTicketDetail(ticketId, activeUser?.id);
      setTicket(data);
      try {
        const commentData = await fetchPublicComments(ticketId, activeUser?.id);
        setComments(commentData);
      } catch {
        // If comments fail or endpoint not reached, keep empty array
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unable to load ticket details.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [ticketId, activeUser?.id]);

  useEffect(() => {
    loadTicket();
  }, [loadTicket]);

  const handleConfirmResolve = async () => {
    setResolving(true);
    setResolveError(null);
    try {
      await indicateTicketResolved(ticketId, activeUser?.id);
      setTicket((prev) => (prev ? { ...prev, isRequesterResolved: true } : null));
      setShowResolveModal(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to mark problem as resolved.";
      setResolveError(msg);
    } finally {
      setResolving(false);
    }
  };

  const handlePostComment = async () => {
    const trimmed = commentContent.trim();
    if (!trimmed) return;
    setPostingComment(true);
    setCommentError(null);
    try {
      const newComment = await createPublicComment(ticketId, trimmed, activeUser?.id);
      setComments((prev) => [...prev, newComment]);
      setCommentContent("");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to post comment.";
      setCommentError(msg);
    } finally {
      setPostingComment(false);
    }
  };

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
          {/* Resolution Indicator Banner */}
          {!ticket.isRequesterResolved ? (
            <div
              className="p-3 mb-4 rounded-3 border d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-3"
              style={{
                backgroundColor: "#EAF6EF",
                borderColor: "#006B3C",
                color: "#1C2D27",
              }}
            >
              <div>
                <div className="fw-semibold d-flex align-items-center gap-2" style={{ color: "#006B3C" }}>
                  <span>Problem appears resolved?</span>
                </div>
                <div className="small text-muted mt-0.5">
                  Let IT know if this issue has been fixed for you.
                </div>
              </div>
              <button
                type="button"
                className="btn btn-sm btn-success fw-medium px-3 py-1.5 flex-shrink-0"
                style={{ backgroundColor: "#006B3C", borderColor: "#006B3C" }}
                onClick={() => setShowResolveModal(true)}
              >
                Mark as Resolved
              </button>
            </div>
          ) : (
            <div
              className="p-3 mb-4 rounded-3 border d-flex align-items-center gap-2"
              style={{
                backgroundColor: "#EAF6EF",
                borderColor: "#006B3C",
                color: "#006B3C",
              }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              <span className="fw-medium small">
                You marked this problem as resolved. IT Staff will confirm and close the ticket.
              </span>
            </div>
          )}

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
                title={ticket.requester.name}
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
                <PriorityBadge priority={ticket.requestedPriority} size="md" />
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
                <PriorityBadge priority={ticket.itPriority} size="md" />
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
                <StatusBadge status={ticket.currentStatus} size="md" />
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

          {/* Tabs for Public Comments and Attachments */}
          <div className="mt-4 pt-3 border-top">
            <ul className="nav nav-tabs border-bottom mb-4">
              <li className="nav-item">
                <button
                  type="button"
                  className={`nav-link fw-semibold px-3 py-2 ${
                    activeTab === "comments" ? "active text-success border-success" : "text-muted"
                  }`}
                  style={
                    activeTab === "comments"
                      ? { color: "#006B3C", borderBottom: "2px solid #006B3C" }
                      : {}
                  }
                  onClick={() => setActiveTab("comments")}
                >
                  Public Comments ({comments.length})
                </button>
              </li>
              <li className="nav-item">
                <button
                  type="button"
                  className={`nav-link fw-semibold px-3 py-2 ${
                    activeTab === "attachments" ? "active text-success border-success" : "text-muted"
                  }`}
                  style={
                    activeTab === "attachments"
                      ? { color: "#006B3C", borderBottom: "2px solid #006B3C" }
                      : {}
                  }
                  onClick={() => setActiveTab("attachments")}
                >
                  Attachments ({ticket.attachments ? ticket.attachments.filter((a) => !a.isRemoved).length : 0})
                </button>
              </li>
            </ul>

            {activeTab === "attachments" && (
              <AttachmentSection
                ticketId={ticket.id}
                requesterId={activeUser?.id ?? ticket.requesterId}
                attachments={ticket.attachments}
                onAttachmentsChange={(newAttachments) => {
                  setTicket((prev) =>
                    prev ? { ...prev, attachments: newAttachments } : null
                  );
                }}
              />
            )}

            {activeTab === "comments" && (
              <div>
                {/* Add Public Comment Form */}
                <div className="card border mb-4 shadow-sm" style={{ borderColor: "#E2E8F0" }}>
                  <div className="card-body p-3 p-md-4">
                    <label className="form-label small fw-bold mb-2" style={{ color: "#1C2D27" }}>
                      Add Public Comment
                    </label>
                    <textarea
                      className="form-control mb-2"
                      rows={3}
                      placeholder="Type your comment here..."
                      value={commentContent}
                      onChange={(e) => setCommentContent(e.target.value)}
                      maxLength={2000}
                      disabled={postingComment}
                      style={{ fontSize: "0.9rem" }}
                    />
                    <div className="d-flex justify-content-between align-items-center">
                      <span className="small text-muted">
                        {commentContent.length} / 2000
                      </span>
                      <button
                        type="button"
                        className="btn btn-sm btn-success fw-medium px-3"
                        style={{ backgroundColor: "#006B3C", borderColor: "#006B3C" }}
                        disabled={postingComment || commentContent.trim().length === 0}
                        onClick={handlePostComment}
                      >
                        {postingComment ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                            Posting...
                          </>
                        ) : (
                          "Post Comment"
                        )}
                      </button>
                    </div>
                    {commentError && (
                      <div className="alert alert-danger mt-3 mb-0 small py-2 px-3">
                        {commentError}
                      </div>
                    )}
                  </div>
                </div>

                {/* Comment Thread List */}
                <div className="d-flex flex-column gap-3">
                  {comments.length === 0 ? (
                    <p className="text-muted small py-3 mb-0">No public comments yet.</p>
                  ) : (
                    comments.map((comment) => (
                      <div
                        key={comment.id}
                        className="p-3 rounded border bg-white shadow-sm"
                        style={{ borderColor: "#E2E8F0" }}
                      >
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <div className="d-flex align-items-center gap-2">
                            <div
                              className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold small flex-shrink-0"
                              style={{
                                width: "32px",
                                height: "32px",
                                backgroundColor: "#006B3C",
                                fontSize: "0.8rem",
                              }}
                            >
                              {comment.author?.name ? comment.author.name.charAt(0) : "U"}
                            </div>
                            <div>
                              <span className="fw-semibold small" style={{ color: "#1C2D27" }}>
                                {comment.author?.name || "User"}
                              </span>
                              <span
                                className="badge ms-2 fw-medium"
                                style={{
                                  backgroundColor: comment.author?.role === "IT_STAFF" ? "#0B7A46" : "#EAF6EF",
                                  color: comment.author?.role === "IT_STAFF" ? "#FFFFFF" : "#006B3C",
                                  border: comment.author?.role === "IT_STAFF" ? "none" : "1px solid #C2E2D3",
                                  fontSize: "0.75rem",
                                }}
                              >
                                {comment.author?.role === "IT_STAFF"
                                  ? "IT Staff"
                                  : comment.author?.role === "ADMINISTRATOR"
                                  ? "Administrator"
                                  : "Requester"}
                              </span>
                            </div>
                          </div>
                          <span className="text-muted small" style={{ fontSize: "0.8rem" }}>
                            {formatTicketDate(comment.createdAt)}
                          </span>
                        </div>
                        <div
                          className="ps-1"
                          style={{
                            color: "#1C2D27",
                            fontSize: "0.9rem",
                            whiteSpace: "pre-wrap",
                            lineHeight: "1.5",
                          }}
                        >
                          {comment.content}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Marking as Resolved */}
      {showResolveModal && (
        <div
          className="modal show d-block"
          tabIndex={-1}
          role="dialog"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.5)", zIndex: 1060 }}
        >
          <div className="modal-dialog modal-dialog-centered" role="document">
            <div className="modal-content border-0 shadow">
              <div className="modal-header border-bottom">
                <h5 className="modal-title fw-bold" style={{ color: "#1C2D27" }}>
                  Confirm Problem Resolution
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  aria-label="Close"
                  onClick={() => setShowResolveModal(false)}
                  disabled={resolving}
                />
              </div>
              <div className="modal-body py-4">
                <p className="mb-0" style={{ color: "#1C2D27" }}>
                  Are you sure this issue has been resolved? This will notify IT Staff that the problem appears resolved.
                </p>
                {resolveError && (
                  <div className="alert alert-danger mt-3 mb-0 small">
                    {resolveError}
                  </div>
                )}
              </div>
              <div className="modal-footer border-top">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary px-3"
                  onClick={() => setShowResolveModal(false)}
                  disabled={resolving}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-success px-3 fw-medium"
                  style={{ backgroundColor: "#006B3C", borderColor: "#006B3C" }}
                  onClick={handleConfirmResolve}
                  disabled={resolving}
                >
                  {resolving ? "Confirming..." : "Confirm"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const RequesterDetailScreen = RequesterTicketDetail;
export default RequesterDetailScreen;
