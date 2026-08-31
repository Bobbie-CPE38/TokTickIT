import React, { useState, useEffect, useCallback, useTransition } from "react";
import { useRequester } from "../context/RequesterContext.js";
import {
  Category,
  Priority,
  TicketStatus,
  TicketListItem,
  PaginationMetadata,
  fetchCategories,
  fetchTickets,
} from "../api.js";

interface MyTicketsProps {
  onNavigateCreate: () => void;
  onSelectTicket?: (ticketId: number) => void;
}

export const MyTickets: React.FC<MyTicketsProps> = ({ onNavigateCreate, onSelectTicket }) => {
  const { currentRequester } = useRequester();

  const [categories, setCategories] = useState<Category[]>([]);
  const [tickets, setTickets] = useState<TicketListItem[]>([]);
  const [pagination, setPagination] = useState<PaginationMetadata>({
    total: 0,
    page: 1,
    pageSize: 10,
    totalPages: 0,
  });

  // Filter States
  const [search, setSearch] = useState<string>("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [requestedPriority, setRequestedPriority] = useState<Priority | "">("");
  const [itPriority, setItPriority] = useState<Priority | "">("");
  const [status, setStatus] = useState<TicketStatus | "">("");
  const [page, setPage] = useState<number>(1);
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Loading & Error States
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [, startTransition] = useTransition();

  // Load categories
  useEffect(() => {
    let mounted = true;
    async function loadCats() {
      try {
        const cats = await fetchCategories();
        if (mounted) setCategories(cats);
      } catch (e) {
        console.error("Failed to load categories:", e);
      }
    }
    loadCats();
    return () => {
      mounted = false;
    };
  }, []);

  // Fetch tickets whenever filters, sorting, page, or requester changes
  const loadTickets = useCallback(async () => {
    if (!currentRequester) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchTickets(
        {
          page,
          pageSize: 10,
          search,
          categoryId,
          requestedPriority,
          itPriority,
          status,
          sortBy,
          sortOrder,
        },
        currentRequester.id
      );
      setTickets(res.data);
      setPagination(res.pagination);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unable to load tickets from server.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [
    currentRequester,
    page,
    search,
    categoryId,
    requestedPriority,
    itPriority,
    status,
    sortBy,
    sortOrder,
  ]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const handleClearFilters = () => {
    setSearch("");
    setCategoryId("");
    setRequestedPriority("");
    setItPriority("");
    setStatus("");
    setPage(1);
    setSortBy("createdAt");
    setSortOrder("desc");
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
    setPage(1);
  };

  const isFiltered = Boolean(search || categoryId || requestedPriority || itPriority || status);

  const formatTicketDate = (isoString: string): string => {
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
        className="badge rounded-pill px-2.5 py-1 fw-semibold"
        style={{
          backgroundColor: c.bg,
          color: c.text,
          border: `1px solid ${c.border}`,
          fontSize: "0.75rem",
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
        className="badge rounded-pill px-2.5 py-1 fw-semibold"
        style={{
          backgroundColor: c.bg,
          color: c.text,
          border: `1px solid ${c.border}`,
          fontSize: "0.75rem",
        }}
      >
        {c.label}
      </span>
    );
  };

  const renderSortIndicator = (field: string) => {
    if (sortBy !== field) {
      return (
        <span className="text-muted ms-1 small" style={{ opacity: 0.6 }}>
          ↕
        </span>
      );
    }
    return (
      <span className="ms-1 fw-bold" style={{ color: "#006B3C" }}>
        {sortOrder === "asc" ? "▲" : "▼"}
      </span>
    );
  };

  const showingStart = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1;
  const showingEnd = Math.min(pagination.page * pagination.pageSize, pagination.total);

  return (
    <div className="container py-4" style={{ maxWidth: "1200px" }}>
      {/* Top Header & Actions */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3 mb-4">
        <div>
          <h1 className="h3 fw-bold mb-1" style={{ color: "#1C2D27" }}>
            My Tickets
          </h1>
          <p className="text-muted mb-0" style={{ color: "#52665D" }}>
            View and track all of your support requests.
          </p>
        </div>

        <div className="d-flex align-items-center gap-2">
          <button
            type="button"
            className="btn btn-sm px-3 py-1.5 fw-medium d-flex align-items-center gap-2 shadow-sm"
            style={{
              backgroundColor: "#FFFFFF",
              borderColor: "#D1D5DB",
              color: "#1C2D27",
            }}
            onClick={handleClearFilters}
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
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
            <span>Clear Filters</span>
          </button>

          <button
            type="button"
            className="btn btn-sm px-3 py-1.5 fw-medium text-white d-flex align-items-center gap-2 shadow-sm"
            style={{ backgroundColor: "#006B3C", borderColor: "#006B3C" }}
            onClick={onNavigateCreate}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>Create Ticket</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div
        className="card shadow-sm border mb-4"
        style={{ backgroundColor: "#FFFFFF", borderColor: "#E2E8F0", borderRadius: "8px" }}
      >
        <div className="card-body p-3">
          <div className="row g-3 align-items-end">
            {/* Search Input */}
            <div className="col-12 col-lg-4">
              <div className="position-relative">
                <span
                  className="position-absolute top-50 translate-middle-y ps-3 text-muted"
                  style={{ pointerEvents: "none" }}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </span>
                <input
                  type="text"
                  className="form-control ps-5 pe-4 py-2"
                  style={{ fontSize: "0.9rem", borderColor: "#D1D5DB" }}
                  placeholder="Search by ticket number or summary..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  aria-label="Search by ticket number or summary"
                />
                {search && (
                  <button
                    type="button"
                    className="btn position-absolute top-50 end-0 translate-middle-y pe-3 border-0 bg-transparent text-muted"
                    onClick={() => {
                      setSearch("");
                      setPage(1);
                    }}
                    aria-label="Clear search"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Category Dropdown */}
            <div className="col-6 col-md-3 col-lg-2">
              <label
                htmlFor="filterCategory"
                className="form-label small fw-medium mb-1"
                style={{ color: "#1C2D27" }}
              >
                Category
              </label>
              <select
                id="filterCategory"
                className="form-select form-select-sm py-2"
                style={{ fontSize: "0.85rem", borderColor: "#D1D5DB" }}
                value={categoryId}
                onChange={(e) => {
                  setCategoryId(e.target.value);
                  setPage(1);
                }}
                aria-label="Category"
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id.toString()}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Requested Priority */}
            <div className="col-6 col-md-3 col-lg-2">
              <label
                htmlFor="filterReqPriority"
                className="form-label small fw-medium mb-1"
                style={{ color: "#1C2D27" }}
              >
                Requested Priority
              </label>
              <select
                id="filterReqPriority"
                className="form-select form-select-sm py-2"
                style={{ fontSize: "0.85rem", borderColor: "#D1D5DB" }}
                value={requestedPriority}
                onChange={(e) => {
                  setRequestedPriority(e.target.value as Priority | "");
                  setPage(1);
                }}
                aria-label="Requested Priority"
              >
                <option value="">All Priorities</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>

            {/* IT Priority */}
            <div className="col-6 col-md-3 col-lg-2">
              <label
                htmlFor="filterItPriority"
                className="form-label small fw-medium mb-1"
                style={{ color: "#1C2D27" }}
              >
                IT Priority
              </label>
              <select
                id="filterItPriority"
                className="form-select form-select-sm py-2"
                style={{ fontSize: "0.85rem", borderColor: "#D1D5DB" }}
                value={itPriority}
                onChange={(e) => {
                  setItPriority(e.target.value as Priority | "");
                  setPage(1);
                }}
                aria-label="IT Priority"
              >
                <option value="">All Priorities</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>

            {/* Current Status */}
            <div className="col-6 col-md-3 col-lg-2">
              <label
                htmlFor="filterStatus"
                className="form-label small fw-medium mb-1"
                style={{ color: "#1C2D27" }}
              >
                Current Status
              </label>
              <select
                id="filterStatus"
                className="form-select form-select-sm py-2"
                style={{ fontSize: "0.85rem", borderColor: "#D1D5DB" }}
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value as TicketStatus | "");
                  setPage(1);
                }}
                aria-label="Current Status"
              >
                <option value="">All Statuses</option>
                <option value="NEW">New</option>
                <option value="OPEN">Open</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="PENDING">Pending</option>
                <option value="RESOLVED">Resolved</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div
          className="alert alert-danger d-flex align-items-center justify-content-between mb-4 shadow-sm"
          style={{ backgroundColor: "#FEE2E2", borderColor: "#EF4444", color: "#991B1B" }}
        >
          <div className="d-flex align-items-center gap-2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>Unable to load tickets from server. {error}</span>
          </div>
          <button
            type="button"
            className="btn btn-sm btn-outline-danger fw-semibold px-3"
            onClick={loadTickets}
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && !error && (
        <div className="card shadow-sm border mb-4 p-4 text-center" style={{ backgroundColor: "#FFFFFF" }}>
          <div className="spinner-border text-success my-4" role="status" style={{ color: "#006B3C" }}>
            <span className="visually-hidden">Loading tickets…</span>
          </div>
          <p className="text-muted small">Loading your tickets…</p>
        </div>
      )}

      {/* Empty State (0 tickets overall) */}
      {!loading && !error && tickets.length === 0 && !isFiltered && (
        <div
          className="card shadow-sm border mb-4 py-5 text-center"
          style={{ backgroundColor: "#FFFFFF", borderColor: "#E2E8F0", borderRadius: "8px" }}
        >
          <div className="card-body">
            <div
              className="rounded-circle d-inline-flex align-items-center justify-content-center mb-3"
              style={{ width: "60px", height: "60px", backgroundColor: "#EAF6EF", color: "#006B3C" }}
            >
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </div>
            <h3 className="h5 fw-bold mb-2" style={{ color: "#1C2D27" }}>
              No support tickets yet.
            </h3>
            <p className="text-muted mb-4" style={{ maxWidth: "400px", margin: "0 auto" }}>
              Get started by creating your first IT support ticket.
            </p>
            <button
              type="button"
              className="btn fw-medium px-4 text-white"
              style={{ backgroundColor: "#006B3C" }}
              onClick={onNavigateCreate}
            >
              + Create Ticket
            </button>
          </div>
        </div>
      )}

      {/* No Results State (Filters returned 0 results) */}
      {!loading && !error && tickets.length === 0 && isFiltered && (
        <div
          className="card shadow-sm border mb-4 py-5 text-center"
          style={{ backgroundColor: "#FFFFFF", borderColor: "#E2E8F0", borderRadius: "8px" }}
        >
          <div className="card-body">
            <div
              className="rounded-circle d-inline-flex align-items-center justify-content-center mb-3"
              style={{ width: "60px", height: "60px", backgroundColor: "#FEF3C7", color: "#B45309" }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
            <h3 className="h5 fw-bold mb-2" style={{ color: "#1C2D27" }}>
              No tickets match your filter criteria.
            </h3>
            <p className="text-muted mb-4">
              Try adjusting your search terms or clearing the selected filters.
            </p>
            <button
              type="button"
              className="btn btn-outline-success fw-medium px-4"
              style={{ borderColor: "#006B3C", color: "#006B3C" }}
              onClick={handleClearFilters}
            >
              Clear Filters
            </button>
          </div>
        </div>
      )}

      {/* Tickets List Table & Cards */}
      {!loading && !error && tickets.length > 0 && (
        <div
          className="card shadow-sm border mb-4"
          style={{ backgroundColor: "#FFFFFF", borderColor: "#E2E8F0", borderRadius: "8px", overflow: "hidden" }}
        >
          {/* Desktop Table View (≥ 992px) */}
          <div className="table-responsive d-none d-lg-block">
            <table className="table align-middle mb-0" style={{ borderColor: "#E2E8F0" }}>
              <thead style={{ backgroundColor: "#F8FAFC", color: "#52665D", fontSize: "0.82rem" }}>
                <tr>
                  <th
                    scope="col"
                    className="py-3 px-3 fw-semibold text-nowrap"
                    style={{ cursor: "pointer", width: "140px" }}
                    onClick={() => handleSort("ticketNumber")}
                  >
                    <span>Ticket No.</span>
                    {renderSortIndicator("ticketNumber")}
                  </th>
                  <th
                    scope="col"
                    className="py-3 px-3 fw-semibold text-nowrap"
                    style={{ cursor: "pointer", width: "170px" }}
                    onClick={() => handleSort("createdAt")}
                  >
                    <span>Created Date</span>
                    {renderSortIndicator("createdAt")}
                  </th>
                  <th scope="col" className="py-3 px-3 fw-semibold">
                    Summary
                  </th>
                  <th scope="col" className="py-3 px-3 fw-semibold" style={{ width: "110px" }}>
                    Category
                  </th>
                  <th scope="col" className="py-3 px-3 fw-semibold text-center" style={{ width: "130px" }}>
                    Requested Priority
                  </th>
                  <th scope="col" className="py-3 px-3 fw-semibold text-center" style={{ width: "110px" }}>
                    IT Priority
                  </th>
                  <th scope="col" className="py-3 px-3 fw-semibold text-center" style={{ width: "120px" }}>
                    Current Status
                  </th>
                  <th scope="col" className="py-3 px-3 fw-semibold" style={{ width: "130px" }}>
                    Ticket Owner
                  </th>
                  <th
                    scope="col"
                    className="py-3 px-3 fw-semibold text-nowrap"
                    style={{ cursor: "pointer", width: "170px" }}
                    onClick={() => handleSort("updatedAt")}
                  >
                    <span>Last Updated</span>
                    {renderSortIndicator("updatedAt")}
                  </th>
                </tr>
              </thead>
              <tbody style={{ fontSize: "0.875rem" }}>
                {tickets.map((t) => (
                  <tr
                    key={t.id}
                    style={{ cursor: "pointer", transition: "background-color 0.15s ease" }}
                    className="ticket-row"
                    onClick={() => onSelectTicket?.(t.id)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#EAF6EF";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                    }}
                  >
                    <td className="py-3 px-3">
                      <span className="fw-bold" style={{ color: "#006B3C" }}>
                        {t.ticketNumber}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-muted text-nowrap">
                      {formatTicketDate(t.createdAt)}
                    </td>
                    <td className="py-3 px-3">
                      <div
                        className="fw-medium text-truncate"
                        style={{ color: "#1C2D27", maxWidth: "320px" }}
                        title={t.summary}
                      >
                        {t.summary}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-muted text-nowrap">
                      {t.categoryName}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {renderPriorityBadge(t.requestedPriority)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {renderPriorityBadge(t.itPriority)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {renderStatusBadge(t.currentStatus)}
                    </td>
                    <td className="py-3 px-3 text-muted text-nowrap">
                      {t.ticketOwner || "Unassigned"}
                    </td>
                    <td className="py-3 px-3 text-muted text-nowrap">
                      {formatTicketDate(t.updatedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Ticket Cards View (< 992px) */}
          <div className="d-lg-none p-3">
            <div className="d-flex flex-column gap-3">
              {tickets.map((t) => (
                <div
                  key={t.id}
                  className="card border rounded-3 p-3 shadow-sm"
                  style={{
                    backgroundColor: "#FFFFFF",
                    borderColor: "#E2E8F0",
                    cursor: "pointer",
                  }}
                  onClick={() => onSelectTicket?.(t.id)}
                >
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <span className="fw-bold fs-6" style={{ color: "#006B3C" }}>
                      {t.ticketNumber}
                    </span>
                    {renderStatusBadge(t.currentStatus)}
                  </div>
                  <div
                    className="fw-medium mb-2"
                    style={{ color: "#1C2D27", fontSize: "0.95rem" }}
                  >
                    {t.summary}
                  </div>
                  <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
                    <span
                      className="badge text-muted fw-normal"
                      style={{ backgroundColor: "#F3F6F4", border: "1px solid #E2E8F0" }}
                    >
                      {t.categoryName}
                    </span>
                    {renderPriorityBadge(t.requestedPriority)}
                  </div>
                  <div className="d-flex justify-content-between align-items-center text-muted small pt-2 border-top">
                    <span>{formatTicketDate(t.createdAt)}</span>
                    <span style={{ color: "#006B3C" }}>→</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pagination Footer */}
          <div
            className="d-flex flex-column flex-sm-row justify-content-between align-items-center gap-3 p-3 border-top"
            style={{ backgroundColor: "#F8FAFC", borderColor: "#E2E8F0" }}
          >
            <div className="small text-muted">
              Showing {showingStart} to {showingEnd} of {pagination.total} tickets
            </div>

            <div className="d-flex align-items-center gap-1">
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary px-3 py-1 fw-medium"
                disabled={pagination.page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                &lt; Previous
              </button>

              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((pNum) => {
                // Display page buttons with window around current page
                if (
                  pNum === 1 ||
                  pNum === pagination.totalPages ||
                  (pNum >= pagination.page - 1 && pNum <= pagination.page + 1)
                ) {
                  const isActive = pNum === pagination.page;
                  return (
                    <button
                      key={pNum}
                      type="button"
                      className="btn btn-sm px-3 py-1 fw-medium"
                      style={{
                        backgroundColor: isActive ? "#006B3C" : "#FFFFFF",
                        color: isActive ? "#FFFFFF" : "#1C2D27",
                        borderColor: isActive ? "#006B3C" : "#D1D5DB",
                      }}
                      onClick={() => setPage(pNum)}
                    >
                      {pNum}
                    </button>
                  );
                }
                if (pNum === pagination.page - 2 || pNum === pagination.page + 2) {
                  return (
                    <span key={pNum} className="px-1 text-muted small">
                      …
                    </span>
                  );
                }
                return null;
              })}

              <button
                type="button"
                className="btn btn-sm btn-outline-secondary px-3 py-1 fw-medium"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              >
                Next &gt;
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyTickets;
