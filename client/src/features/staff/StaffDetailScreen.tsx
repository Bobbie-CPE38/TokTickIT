import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../context/AuthContext.js";
import { useRouter } from "../../core/router/RouterContext.js";
import * as api from "../../api.js";
import { PriorityBadge } from "../../components/common/PriorityBadge.js";
import { AttachmentList } from "../attachments/AttachmentList.js";

interface StaffDetailScreenProps {
  ticketId?: number;
  onBack?: () => void;
}

const PERMITTED_TRANSITIONS: Record<string, string[]> = {
  NEW: ["OPEN", "IN_PROGRESS", "CANCELLED"],
  OPEN: ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "CANCELLED"],
  IN_PROGRESS: ["WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
  WAITING_FOR_REQUESTER: ["IN_PROGRESS", "RESOLVED", "CANCELLED"],
  RESOLVED: ["CLOSED", "REOPENED"],
  REOPENED: ["IN_PROGRESS", "RESOLVED", "CANCELLED"],
  CLOSED: ["REOPENED"],
  CANCELLED: [],
};

export const StaffDetailScreen: React.FC<StaffDetailScreenProps> = ({ ticketId, onBack }) => {
  let router: ReturnType<typeof useRouter> | null = null;
  try {
    router = useRouter();
  } catch {}

  let authUser: api.AuthUser | null = null;
  try {
    const auth = useAuth();
    authUser = auth.user;
  } catch {}

  const [ticket, setTicket] = useState<api.StaffTicketDetail | null>(null);
  const [assignees, setAssignees] = useState<api.StaffAssignee[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Operational control loading states
  const [updatingOwner, setUpdatingOwner] = useState<boolean>(false);
  const [updatingPriority, setUpdatingPriority] = useState<boolean>(false);
  const [updatingStatus, setUpdatingStatus] = useState<boolean>(false);

  // Tabs: comments, notes, attachments
  const [activeTab, setActiveTab] = useState<"comments" | "notes" | "attachments">("comments");

  // Public comments state
  const [comments, setComments] = useState<api.PublicComment[]>([]);
  const [newComment, setNewComment] = useState<string>("");
  const [postingComment, setPostingComment] = useState<boolean>(false);
  const [commentError, setCommentError] = useState<string | null>(null);

  // Internal notes state
  const [notes, setNotes] = useState<api.InternalNote[]>([]);
  const [newNote, setNewNote] = useState<string>("");
  const [postingNote, setPostingNote] = useState<boolean>(false);
  const [noteError, setNoteError] = useState<string | null>(null);

  // Status transition modal states
  const [pendingStatus, setPendingStatus] = useState<api.TicketStatus | null>(null);
  const [modalSummary, setModalSummary] = useState<string>("");
  const [modalError, setModalError] = useState<string | null>(null);

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (router) {
      router.navigateTo("/queue");
    }
  };

  const loadTicketData = useCallback(async () => {
    if (!ticketId) return;
    setLoading(true);
    setError(null);
    try {
      const [ticketData, assigneesData] = await Promise.all([
        api.fetchStaffTicketDetail(ticketId),
        api.fetchStaffAssignees().catch(() => []),
      ]);
      setTicket(ticketData);
      setComments(ticketData.publicComments || []);
      setNotes(ticketData.internalNotes || []);
      setAssignees(assigneesData);
    } catch (err: any) {
      setError(err.message || "Failed to load ticket detail.");
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    loadTicketData();
  }, [loadTicketData]);

  // Handle Owner Change
  const handleOwnerChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!ticketId) return;
    const value = e.target.value;
    const newOwnerId = value === "" || value === "unassigned" ? null : parseInt(value, 10);
    setUpdatingOwner(true);
    setError(null);
    try {
      const res = await api.updateTicketAssignment(ticketId, newOwnerId);
      setTicket((prev) =>
        prev
          ? {
              ...prev,
              ticketOwnerId: res.ticketOwnerId,
              ticketOwner: res.ticketOwner,
            }
          : null
      );
      setSuccessMessage("Ticket ownership updated.");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to update ticket owner.");
    } finally {
      setUpdatingOwner(false);
    }
  };

  // Handle IT Priority Change
  const handlePriorityChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!ticketId) return;
    const newPriority = e.target.value as api.Priority;
    setUpdatingPriority(true);
    setError(null);
    try {
      const res = await api.updateTicketPriority(ticketId, newPriority);
      setTicket((prev) =>
        prev
          ? {
              ...prev,
              itPriority: res.itPriority,
            }
          : null
      );
      setSuccessMessage("IT Priority updated.");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to update IT Priority.");
    } finally {
      setUpdatingPriority(false);
    }
  };

  // Handle Status Dropdown Selection
  const handleStatusSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = e.target.value as api.TicketStatus;
    if (!selected || selected === ticket?.currentStatus) return;

    if (["RESOLVED", "CLOSED", "REOPENED", "CANCELLED"].includes(selected)) {
      setPendingStatus(selected);
      setModalSummary(selected === "CLOSED" ? ticket?.resolutionSummary || "" : "");
      setModalError(null);
    } else {
      executeStatusUpdate(selected);
    }
  };

  // Execute Status Update API Call
  const executeStatusUpdate = async (nextStatus: api.TicketStatus, summary?: string) => {
    if (!ticketId) return;
    setUpdatingStatus(true);
    setError(null);
    try {
      const res = await api.updateTicketStatus(ticketId, nextStatus, summary);
      setTicket((prev) =>
        prev
          ? {
              ...prev,
              currentStatus: res.currentStatus,
              resolutionSummary: res.resolutionSummary !== undefined ? res.resolutionSummary : prev.resolutionSummary,
            }
          : null
      );
      setPendingStatus(null);
      setModalSummary("");
      setSuccessMessage(`Ticket status transitioned to ${nextStatus}.`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to update ticket status.");
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Modal Confirm handler
  const handleConfirmModal = () => {
    if (!pendingStatus) return;

    if (pendingStatus === "RESOLVED") {
      const trimmed = modalSummary.trim();
      if (!trimmed || trimmed.length < 5) {
        setModalError("Resolution summary is required and must be at least 5 characters.");
        return;
      }
      if (trimmed.length > 1000) {
        setModalError("Resolution summary must not exceed 1000 characters.");
        return;
      }
      executeStatusUpdate("RESOLVED", trimmed);
      return;
    }

    if (pendingStatus === "CLOSED") {
      const trimmed = modalSummary.trim();
      executeStatusUpdate("CLOSED", trimmed || undefined);
      return;
    }

    executeStatusUpdate(pendingStatus, modalSummary.trim() || undefined);
  };

  // Post Public Comment
  const handlePostComment = async () => {
    if (!ticketId || !newComment.trim()) return;
    setPostingComment(true);
    setCommentError(null);
    try {
      const created = await api.createPublicComment(ticketId, newComment.trim());
      setComments((prev) => [...prev, created]);
      setNewComment("");
    } catch (err: any) {
      setCommentError(err.message || "Failed to post comment.");
    } finally {
      setPostingComment(false);
    }
  };

  // Post Internal Note
  const handlePostNote = async () => {
    if (!ticketId || !newNote.trim()) return;
    setPostingNote(true);
    setNoteError(null);
    try {
      const created = await api.createInternalNote(ticketId, newNote.trim());
      setNotes((prev) => [...prev, created]);
      setNewNote("");
    } catch (err: any) {
      setNoteError(err.message || "Failed to post internal note.");
    } finally {
      setPostingNote(false);
    }
  };

  const formatDate = (isoStr?: string | null) => {
    if (!isoStr) return "";
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return isoStr;
    }
  };

  if (loading) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border" style={{ color: "#006B3C" }} role="status">
          <span className="visually-hidden">Loading ticket details...</span>
        </div>
        <p className="text-muted mt-2">Loading ticket details...</p>
      </div>
    );
  }

  if (error && !ticket) {
    return (
      <div className="container py-4">
        <div className="alert alert-danger d-flex justify-content-between align-items-center">
          <div>{error}</div>
          <button type="button" className="btn btn-sm btn-outline-danger" onClick={handleBack}>
            Back to Queue
          </button>
        </div>
      </div>
    );
  }

  if (!ticket) return null;

  const permittedNext = PERMITTED_TRANSITIONS[ticket.currentStatus] || [];

  return (
    <div className="container-fluid py-4 px-3 px-md-4" style={{ backgroundColor: "#F5F7F6", minHeight: "calc(100vh - 56px)" }}>
      {/* Top Header & Breadcrumb */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-3 gap-2">
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb mb-0" style={{ fontSize: "0.875rem" }}>
            <li className="breadcrumb-item">
              <button
                type="button"
                className="btn btn-link p-0 text-decoration-none fw-semibold"
                style={{ color: "#006B3C" }}
                onClick={handleBack}
              >
                My Queue
              </button>
            </li>
            <li className="breadcrumb-item active text-muted" aria-current="page">
              Ticket Detail
            </li>
          </ol>
        </nav>
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-1"
          onClick={handleBack}
        >
          &larr; Back to Queue
        </button>
      </div>

      {/* Global Alerts */}
      {successMessage && (
        <div className="alert alert-success alert-dismissible fade show" role="alert">
          {successMessage}
          <button type="button" className="btn-close" aria-label="Close" onClick={() => setSuccessMessage(null)} />
        </div>
      )}
      {error && (
        <div className="alert alert-danger alert-dismissible fade show" role="alert">
          {error}
          <button type="button" className="btn-close" aria-label="Close" onClick={() => setError(null)} />
        </div>
      )}

      {/* "Problem Appears Resolved" Banner (Pale green with green border) */}
      {ticket.isRequesterResolved && (
        <div
          className="alert mb-4 d-flex align-items-center gap-3 shadow-sm"
          style={{
            backgroundColor: "#EAF6EF",
            borderColor: "#0B7A46",
            borderWidth: "1px",
            color: "#1C2D27",
            borderRadius: "8px",
          }}
          role="alert"
        >
          <span style={{ color: "#0B7A46", fontSize: "1.25rem" }}>&#9432;</span>
          <div>
            <strong>Requester indicated this issue appears resolved.</strong>
            <div className="small">Please confirm and update status to Resolved.</div>
          </div>
        </div>
      )}

      {/* Main Operational Card */}
      <div className="card shadow-sm border-0 mb-4" style={{ borderRadius: "8px", overflow: "hidden" }}>
        {/* Ticket Header & Metadata Grid */}
        <div className="card-header bg-white border-bottom p-3 p-md-4">
          <div className="row g-3 align-items-center mb-3">
            <div className="col-12 col-md-4">
              <span className="text-muted small d-block">Ticket No:</span>
              <span className="h5 fw-bold mb-0" style={{ color: "#006B3C" }}>
                {ticket.ticketNumber}
              </span>
            </div>
            <div className="col-6 col-md-4">
              <span className="text-muted small d-block">Category:</span>
              <span className="fw-semibold text-dark">{ticket.category?.name || "Uncategorized"}</span>
            </div>
            <div className="col-6 col-md-4">
              <span className="text-muted small d-block">Related System:</span>
              <span className="fw-semibold text-dark">{ticket.relatedSystem?.name || "None"}</span>
            </div>
          </div>

          <div className="row g-3 align-items-center pb-2 mb-2">
            <div className="col-12 col-md-4">
              <span className="text-muted small d-block">Requester:</span>
              <span className="fw-semibold text-dark">{ticket.requester.name}</span>
              <span className="text-muted small ms-1">({ticket.requester.email})</span>
            </div>
            <div className="col-6 col-md-4">
              <span className="text-muted small d-block mb-1">Req. Priority:</span>
              <PriorityBadge priority={ticket.requestedPriority} />
            </div>
            <div className="col-6 col-md-4">
              <label htmlFor="staff-status-select" className="text-muted small d-block mb-1">
                Current Status:
              </label>
              <div className="d-flex align-items-center gap-2">
                <select
                  id="staff-status-select"
                  aria-label="Current Status"
                  className="form-select form-select-sm"
                  style={{ borderColor: "#D1D5DB" }}
                  value={ticket.currentStatus}
                  onChange={handleStatusSelect}
                  disabled={updatingStatus || permittedNext.length === 0}
                >
                  <option value={ticket.currentStatus}>
                    {ticket.currentStatus.replace(/_/g, " ")} (Current)
                  </option>
                  {permittedNext.map((st) => (
                    <option key={st} value={st}>
                      {st.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
                {updatingStatus && <span className="spinner-border spinner-border-sm text-secondary" />}
              </div>
            </div>
          </div>

          {/* Operational Dropdowns: Ticket Owner & IT Priority */}
          <div className="row g-3 mt-1 pt-3 border-top">
            <div className="col-12 col-md-4">
              <label htmlFor="staff-owner-select" className="text-muted small d-block mb-1">
                Ticket Owner:
              </label>
              <div className="d-flex align-items-center gap-2">
                <select
                  id="staff-owner-select"
                  aria-label="Ticket Owner"
                  className="form-select form-select-sm"
                  style={{ borderColor: "#D1D5DB" }}
                  value={ticket.ticketOwnerId ?? ""}
                  onChange={handleOwnerChange}
                  disabled={updatingOwner}
                >
                  <option value="">Unassigned</option>
                  {assignees.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.role === "ADMINISTRATOR" ? "Admin" : "IT Staff"})
                    </option>
                  ))}
                </select>
                {updatingOwner && <span className="spinner-border spinner-border-sm text-secondary" />}
              </div>
            </div>

            <div className="col-12 col-md-4">
              <label htmlFor="staff-priority-select" className="text-muted small d-block mb-1">
                IT Priority:
              </label>
              <div className="d-flex align-items-center gap-2">
                <select
                  id="staff-priority-select"
                  aria-label="IT Priority"
                  className="form-select form-select-sm"
                  style={{ borderColor: "#D1D5DB" }}
                  value={ticket.itPriority}
                  onChange={handlePriorityChange}
                  disabled={updatingPriority}
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
                {updatingPriority && <span className="spinner-border spinner-border-sm text-secondary" />}
              </div>
            </div>

            <div className="col-12 col-md-4">
              <span className="text-muted small d-block mb-1">Created Date:</span>
              <span className="text-muted small">{formatDate(ticket.createdAt)}</span>
            </div>
          </div>
        </div>

        {/* Read-Only Problem Section */}
        <div className="card-body p-3 p-md-4">
          <div className="mb-3">
            <label className="fw-semibold text-muted small mb-1">Summary:</label>
            <div
              className="p-2 px-3 rounded border text-dark"
              style={{ backgroundColor: "#F3F6F4", borderColor: "#E2E8F0" }}
            >
              {ticket.summary}
            </div>
          </div>

          <div className="mb-3">
            <label className="fw-semibold text-muted small mb-1">Description:</label>
            <div
              className="p-3 rounded border text-dark"
              style={{
                backgroundColor: "#F3F6F4",
                borderColor: "#E2E8F0",
                minHeight: "80px",
                whiteSpace: "pre-wrap",
              }}
            >
              {ticket.description}
            </div>
          </div>

          {ticket.resolutionSummary && (
            <div className="mb-3">
              <label className="fw-semibold text-muted small mb-1">
                Resolution Summary:
              </label>
              <div
                className="p-3 rounded border text-dark"
                style={{
                  backgroundColor: "#EAF6EF",
                  borderColor: "#0B7A46",
                  whiteSpace: "pre-wrap",
                }}
              >
                {ticket.resolutionSummary}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs Navigation: Public Comments, Internal Notes, Attachments */}
      <div className="card shadow-sm border-0 mb-4" style={{ borderRadius: "8px" }}>
        <div className="card-header bg-white border-bottom p-0">
          <ul className="nav nav-tabs border-0 px-3 pt-2" role="tablist">
            <li className="nav-item" role="presentation">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "comments"}
                className={`nav-link border-0 fw-semibold ${activeTab === "comments" ? "active" : "text-muted"}`}
                style={{
                  color: activeTab === "comments" ? "#006B3C" : undefined,
                  borderBottom: activeTab === "comments" ? "3px solid #006B3C" : "none",
                }}
                onClick={() => setActiveTab("comments")}
              >
                Public Comments ({comments.length})
              </button>
            </li>
            <li className="nav-item" role="presentation">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "notes"}
                className={`nav-link border-0 fw-semibold ${activeTab === "notes" ? "active" : "text-muted"}`}
                style={{
                  color: activeTab === "notes" ? "#D97706" : undefined,
                  borderBottom: activeTab === "notes" ? "3px solid #F59E0B" : "none",
                }}
                onClick={() => setActiveTab("notes")}
              >
                &#9888; Internal Notes ({notes.length})
              </button>
            </li>
            <li className="nav-item" role="presentation">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "attachments"}
                className={`nav-link border-0 fw-semibold ${activeTab === "attachments" ? "active" : "text-muted"}`}
                style={{
                  color: activeTab === "attachments" ? "#006B3C" : undefined,
                  borderBottom: activeTab === "attachments" ? "3px solid #006B3C" : "none",
                }}
                onClick={() => setActiveTab("attachments")}
              >
                Attachments ({ticket.attachments.filter((a) => !a.isRemoved).length})
              </button>
            </li>
          </ul>
        </div>

        <div className="card-body p-3 p-md-4">
          {/* TAB 1: Public Comments */}
          {activeTab === "comments" && (
            <div>
              <div className="mb-4">
                <label htmlFor="staff-public-comment-input" className="form-label fw-semibold text-dark">
                  Add Public Comment (visible to requester):
                </label>
                <textarea
                  id="staff-public-comment-input"
                  className="form-control mb-2"
                  rows={3}
                  placeholder="Type a public message to the requester..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  style={{ borderColor: "#D1D5DB" }}
                />
                {commentError && <div className="text-danger small mb-2">{commentError}</div>}
                <div className="d-flex justify-content-end">
                  <button
                    type="button"
                    className="btn text-white btn-sm px-3"
                    style={{ backgroundColor: "#006B3C" }}
                    onClick={handlePostComment}
                    disabled={postingComment || !newComment.trim()}
                  >
                    {postingComment ? "Posting..." : "Post Comment"}
                  </button>
                </div>
              </div>

              {comments.length === 0 ? (
                <p className="text-muted text-center py-4 mb-0">No public comments yet.</p>
              ) : (
                <div className="d-flex flex-column gap-3">
                  {comments.map((c) => (
                    <div
                      key={c.id}
                      className="p-3 rounded border"
                      style={{
                        backgroundColor: "#FFFFFF",
                        borderColor: "#E2E8F0",
                        borderLeft: "4px solid #006B3C",
                      }}
                    >
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <div className="d-flex align-items-center gap-2">
                          <span className="fw-semibold text-dark">{c.author.name}</span>
                          <span
                            className="badge"
                            style={{
                              backgroundColor: c.author.role === "REQUESTER" ? "#DBEAFE" : "#EAF6EF",
                              color: c.author.role === "REQUESTER" ? "#1E40AF" : "#006B3C",
                            }}
                          >
                            {c.author.role === "REQUESTER" ? "Requester" : "IT Staff"}
                          </span>
                        </div>
                        <span className="text-muted small">{formatDate(c.createdAt)}</span>
                      </div>
                      <p className="mb-0 text-dark" style={{ whiteSpace: "pre-wrap" }}>
                        {c.content}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Internal Notes (Amber Styling) */}
          {activeTab === "notes" && (
            <div>
              {/* Amber Warning Security Banner */}
              <div
                className="alert mb-4 d-flex align-items-center gap-2"
                style={{
                  backgroundColor: "#FFFBEB",
                  borderColor: "#F59E0B",
                  borderWidth: "1px",
                  color: "#92400E",
                  borderRadius: "6px",
                }}
              >
                <span>&#128274;</span>
                <strong>Internal Notes are visible ONLY to IT Staff and Administrators.</strong>
              </div>

              <div className="mb-4">
                <label htmlFor="staff-internal-note-input" className="form-label fw-semibold text-dark">
                  Add Internal Note:
                </label>
                <textarea
                  id="staff-internal-note-input"
                  className="form-control mb-2"
                  rows={3}
                  placeholder="Add internal operational note, root cause, or triage logs..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  style={{ borderColor: "#F59E0B", backgroundColor: "#FFFBEB" }}
                />
                {noteError && <div className="text-danger small mb-2">{noteError}</div>}
                <div className="d-flex justify-content-end">
                  <button
                    type="button"
                    className="btn btn-sm px-3 text-white fw-semibold"
                    style={{ backgroundColor: "#D97706" }}
                    onClick={handlePostNote}
                    disabled={postingNote || !newNote.trim()}
                  >
                    {postingNote ? "Saving..." : "Save Internal Note"}
                  </button>
                </div>
              </div>

              {notes.length === 0 ? (
                <p className="text-muted text-center py-4 mb-0">No internal notes recorded.</p>
              ) : (
                <div className="d-flex flex-column gap-3">
                  {notes.map((n) => (
                    <div
                      key={n.id}
                      className="p-3 rounded border"
                      style={{
                        backgroundColor: "#FFFBEB",
                        borderColor: "#F59E0B",
                        borderLeft: "4px solid #F59E0B",
                      }}
                    >
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <div className="d-flex align-items-center gap-2">
                          <span className="fw-semibold text-dark">{n.author.name}</span>
                          <span
                            className="badge"
                            style={{
                              backgroundColor: "#FEF3C7",
                              color: "#92400E",
                            }}
                          >
                            {n.author.role === "ADMINISTRATOR" ? "Administrator" : "IT Staff"}
                          </span>
                        </div>
                        <span className="text-muted small">{formatDate(n.createdAt)}</span>
                      </div>
                      <p className="mb-0 text-dark" style={{ whiteSpace: "pre-wrap" }}>
                        {n.content}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Attachments (Option B Reusing AttachmentList) */}
          {activeTab === "attachments" && (
            <div>
              <AttachmentList
                ticketId={ticket.id}
                requesterId={ticket.requesterId}
                attachments={ticket.attachments}
                onAttachmentsChange={(updated) => {
                  setTicket((prev) => (prev ? { ...prev, attachments: updated } : null));
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modals for Status Transitions */}
      {pendingStatus && (
        <div
          className="modal fade show d-block"
          tabIndex={-1}
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          role="dialog"
          aria-modal="true"
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">
                  {pendingStatus === "RESOLVED" && "Resolve Ticket"}
                  {pendingStatus === "CLOSED" && "Close Ticket"}
                  {pendingStatus === "REOPENED" && "Reopen Ticket"}
                  {pendingStatus === "CANCELLED" && "Cancel Ticket"}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  aria-label="Close"
                  onClick={() => setPendingStatus(null)}
                />
              </div>

              <div className="modal-body">
                {pendingStatus === "RESOLVED" && (
                  <div>
                    <p className="text-muted small mb-3">
                      Please enter a resolution summary describing the fix. This will be visible to the requester.
                    </p>
                    <label htmlFor="modal-resolution-summary" className="form-label fw-semibold text-dark">
                      Resolution Summary * (min 5 characters):
                    </label>
                    <textarea
                      id="modal-resolution-summary"
                      aria-label="Resolution Summary"
                      className="form-control"
                      rows={3}
                      placeholder="e.g. Replaced faulty hardware unit and verified normal operation..."
                      value={modalSummary}
                      onChange={(e) => setModalSummary(e.target.value)}
                    />
                  </div>
                )}

                {pendingStatus === "CLOSED" && (
                  <div>
                    <p className="mb-3 text-dark">
                      Close Ticket &mdash; Confirm closing this ticket.
                    </p>
                    <label htmlFor="modal-close-summary" className="form-label fw-semibold text-dark">
                      Resolution Summary:
                    </label>
                    <textarea
                      id="modal-close-summary"
                      aria-label="Resolution Summary"
                      className="form-control"
                      rows={3}
                      placeholder="Review or refine closing notes before finalizing..."
                      value={modalSummary}
                      onChange={(e) => setModalSummary(e.target.value)}
                    />
                  </div>
                )}

                {pendingStatus === "REOPENED" && (
                  <div>
                    <p className="mb-3 text-dark">
                      Reopen Ticket &mdash; Enter rationale for reopening this ticket.
                    </p>
                    <label htmlFor="modal-reopen-rationale" className="form-label fw-semibold text-dark">
                      Reopen Rationale (optional):
                    </label>
                    <textarea
                      id="modal-reopen-rationale"
                      aria-label="Reopen Rationale"
                      className="form-control"
                      rows={3}
                      placeholder="e.g. User reported problem recurring after firmware update..."
                      value={modalSummary}
                      onChange={(e) => setModalSummary(e.target.value)}
                    />
                  </div>
                )}

                {pendingStatus === "CANCELLED" && (
                  <div className="text-danger">
                    <p className="mb-0">
                      <strong>Cancel Ticket &mdash; Are you sure you want to cancel this ticket?</strong>
                      <br />
                      Cancelled tickets cannot be reopened.
                    </p>
                  </div>
                )}

                {modalError && <div className="text-danger small mt-2">{modalError}</div>}
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => setPendingStatus(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-sm text-white"
                  style={{
                    backgroundColor: pendingStatus === "CANCELLED" ? "#DC2626" : "#006B3C",
                  }}
                  onClick={handleConfirmModal}
                  disabled={updatingStatus}
                >
                  {updatingStatus
                    ? "Updating..."
                    : pendingStatus === "RESOLVED"
                    ? "Confirm Resolution"
                    : pendingStatus === "CLOSED"
                    ? "Confirm Close"
                    : pendingStatus === "REOPENED"
                    ? "Confirm Reopen"
                    : "Confirm Cancellation"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffDetailScreen;
