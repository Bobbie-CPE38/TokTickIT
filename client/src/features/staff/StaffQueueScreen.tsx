import React, { useState, useEffect, useCallback, useRef } from "react";
import * as api from "../../api.js";
import { PriorityBadge } from "../../components/common/PriorityBadge.js";
import { StatusBadge } from "../../components/common/StatusBadge.js";
import { useRouter } from "../../core/router/RouterContext.js";

interface StaffQueueScreenProps {
  onSelectTicket?: (ticketId: number) => void;
}

export const StaffQueueScreen: React.FC<StaffQueueScreenProps> = ({ onSelectTicket }) => {
  let router: ReturnType<typeof useRouter> | null = null;
  try {
    router = useRouter();
  } catch {
    // Graceful fallback if rendered outside RouterProvider
  }

  // Data states
  const [tickets, setTickets] = useState<api.StaffTicket[]>([]);
  const [categories, setCategories] = useState<api.Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination states
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(10);
  const [total, setTotal] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);

  // Search and filter states
  const [searchInput, setSearchInput] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedPriority, setSelectedPriority] = useState<string>("");
  const [selectedOwner, setSelectedOwner] = useState<string>("");

  // Sort states
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Debounce search input (300ms)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchInput(value);
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedSearch(value.trim());
      setPage(1);
    }, 300);
  };

  // Fetch categories once
  useEffect(() => {
    let isMounted = true;
    api
      .fetchCategories()
      .then((cats) => {
        if (isMounted) setCategories(cats);
      })
      .catch((err) => {
        console.error("Failed to load categories", err);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch staff tickets
  const loadTickets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: api.StaffQueueParams = {
        page,
        pageSize,
        sortBy,
        sortOrder,
        search: debouncedSearch || undefined,
        status: selectedStatus || undefined,
        categoryId: selectedCategory ? parseInt(selectedCategory, 10) : undefined,
        itPriority: selectedPriority || undefined,
        ticketOwnerId:
          selectedOwner === "unassigned"
            ? "unassigned"
            : selectedOwner
            ? parseInt(selectedOwner, 10)
            : undefined,
      };

      const res = await api.fetchStaffTickets(params);
      setTickets(res.data);
      setTotal(res.pagination.total);
      setTotalPages(res.pagination.totalPages);
    } catch (err: any) {
      setError(err.message || "Failed to load IT Staff queue");
    } finally {
      setLoading(false);
    }
  }, [
    page,
    pageSize,
    sortBy,
    sortOrder,
    debouncedSearch,
    selectedStatus,
    selectedCategory,
    selectedPriority,
    selectedOwner,
  ]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const handleClearFilters = () => {
    setSearchInput("");
    setDebouncedSearch("");
    setSelectedStatus("");
    setSelectedCategory("");
    setSelectedPriority("");
    setSelectedOwner("");
    setPage(1);
    setSortBy("createdAt");
    setSortOrder("desc");
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
    setPage(1);
  };

  const handleTicketClick = (ticketId: number) => {
    if (onSelectTicket) {
      onSelectTicket(ticketId);
    } else if (router) {
      router.navigateTo(`/queue/${ticketId}`);
    }
  };

  const hasActiveFilters = Boolean(
    debouncedSearch ||
      selectedStatus ||
      selectedCategory ||
      selectedPriority ||
      selectedOwner
  );

  const startRecord = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endRecord = Math.min(page * pageSize, total);

  const renderSortIndicator = (field: string) => {
    if (sortBy !== field) {
      return <span className="text-muted ms-1 small">↕</span>;
    }
    return (
      <span className="ms-1 small" style={{ color: "#006B3C" }}>
        {sortOrder === "asc" ? "▲" : "▼"}
      </span>
    );
  };

  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="container-fluid py-3 px-3 px-md-4" style={{ backgroundColor: "#F5F7F6", minHeight: "calc(100vh - 56px)" }}>
      {/* Header and Title */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-3 gap-2">
        <div>
          <h1 className="h4 fw-bold mb-1" style={{ color: "#1C2D27" }}>
            IT Staff Ticket Queue
          </h1>
          <p className="text-muted small mb-0">
            Triage, prioritize, and manage support requests across all departments.
          </p>
        </div>
      </div>

      {/* Search and Filters Toolbar */}
      <div className="card shadow-sm border-0 mb-4" style={{ borderRadius: "8px" }}>
        <div className="card-body p-3">
          <div className="row g-2 align-items-center">
            {/* Search Input */}
            <div className="col-12 col-md-4">
              <div className="input-group">
                <span className="input-group-text bg-white border-end-0 text-muted" style={{ borderColor: "#D1D5DB" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </span>
                <input
                  type="text"
                  className="form-control border-start-0"
                  style={{ borderColor: "#D1D5DB", minHeight: "40px" }}
                  placeholder="Search by ticket number or summary..."
                  value={searchInput}
                  onChange={handleSearchChange}
                  aria-label="Search tickets"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="col-6 col-md-2">
              <select
                aria-label="Filter by Status"
                className="form-select"
                style={{ borderColor: "#D1D5DB", minHeight: "40px" }}
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All Statuses</option>
                <option value="NEW">New</option>
                <option value="OPEN">Open</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="WAITING_FOR_REQUESTER">Waiting for Requester</option>
                <option value="RESOLVED">Resolved</option>
                <option value="CLOSED">Closed</option>
                <option value="REOPENED">Reopened</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            {/* Category Filter */}
            <div className="col-6 col-md-2">
              <select
                aria-label="Filter by Category"
                className="form-select"
                style={{ borderColor: "#D1D5DB", minHeight: "40px" }}
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* IT Priority Filter */}
            <div className="col-6 col-md-2">
              <select
                aria-label="Filter by IT Priority"
                className="form-select"
                style={{ borderColor: "#D1D5DB", minHeight: "40px" }}
                value={selectedPriority}
                onChange={(e) => {
                  setSelectedPriority(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All Priorities</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>

            {/* Owner Filter */}
            <div className="col-6 col-md-2">
              <select
                aria-label="Filter by Owner"
                className="form-select"
                style={{ borderColor: "#D1D5DB", minHeight: "40px" }}
                value={selectedOwner}
                onChange={(e) => {
                  setSelectedOwner(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All Owners</option>
                <option value="unassigned">Unassigned</option>
              </select>
            </div>
          </div>

          {/* Active Filter Chips / Clear Button */}
          {hasActiveFilters && (
            <div className="d-flex align-items-center justify-content-between mt-2 pt-2 border-top">
              <span className="text-muted small">Active filters applied</span>
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-1"
                onClick={handleClearFilters}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
                Clear Filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div className="alert alert-danger shadow-sm py-2 px-3 mb-3" role="alert">
          {error}
        </div>
      )}

      {/* Item Counter */}
      <div className="d-flex justify-content-between align-items-center mb-2 px-1">
        <span className="text-muted small fw-medium">
          Showing {startRecord} to {endRecord} of {total} tickets
        </span>
      </div>

      {/* Main Content Area */}
      <div className="card shadow-sm border-0 overflow-hidden mb-4" style={{ borderRadius: "8px" }}>
        {loading ? (
          <div className="p-5 text-center">
            <div className="spinner-border" style={{ color: "#006B3C" }} role="status">
              <span className="visually-hidden">Loading queue...</span>
            </div>
            <p className="text-muted small mt-2 mb-0">Loading ticket queue...</p>
          </div>
        ) : total === 0 ? (
          <div className="p-5 text-center">
            {hasActiveFilters ? (
              <div>
                <p className="h6 text-muted mb-2">No items match your active filters</p>
                <button
                  type="button"
                  className="btn btn-sm text-white"
                  style={{ backgroundColor: "#006B3C" }}
                  onClick={handleClearFilters}
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              <div>
                <p className="h6 text-muted mb-0">No tickets found</p>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Desktop / Tablet 8-Column Table (Hidden on Viewports < 768px) */}
            <div className="table-responsive d-none d-md-block">
              <table className="table table-hover align-middle mb-0" style={{ fontSize: "0.875rem" }}>
                <thead style={{ backgroundColor: "#F9FAFB", borderBottom: "1px solid #E2E8F0" }}>
                  <tr>
                    {/* 1. Ticket No */}
                    <th scope="col" style={{ width: "140px" }}>
                      <button
                        type="button"
                        className="btn btn-link p-0 text-decoration-none fw-semibold text-dark d-inline-flex align-items-center"
                        onClick={() => handleSort("ticketNumber")}
                        aria-label="Sort by Ticket No"
                      >
                        Ticket No {renderSortIndicator("ticketNumber")}
                      </button>
                    </th>

                    {/* 2. Created Date */}
                    <th scope="col" style={{ width: "130px" }}>
                      <button
                        type="button"
                        className="btn btn-link p-0 text-decoration-none fw-semibold text-dark d-inline-flex align-items-center"
                        onClick={() => handleSort("createdAt")}
                        aria-label="Sort by Created Date"
                      >
                        Created Date {renderSortIndicator("createdAt")}
                      </button>
                    </th>

                    {/* 3. Summary */}
                    <th scope="col">Summary</th>

                    {/* 4. Category */}
                    <th scope="col" style={{ width: "140px" }}>Category</th>

                    {/* 5. Req. Priority */}
                    <th scope="col" style={{ width: "110px" }}>Req. Priority</th>

                    {/* 6. IT Priority */}
                    <th scope="col" style={{ width: "110px" }}>
                      <button
                        type="button"
                        className="btn btn-link p-0 text-decoration-none fw-semibold text-dark d-inline-flex align-items-center"
                        onClick={() => handleSort("itPriority")}
                        aria-label="Sort by IT Priority"
                      >
                        IT Priority {renderSortIndicator("itPriority")}
                      </button>
                    </th>

                    {/* 7. Status */}
                    <th scope="col" style={{ width: "130px" }}>
                      <button
                        type="button"
                        className="btn btn-link p-0 text-decoration-none fw-semibold text-dark d-inline-flex align-items-center"
                        onClick={() => handleSort("status")}
                        aria-label="Sort by Status"
                      >
                        Status {renderSortIndicator("status")}
                      </button>
                    </th>

                    {/* 8. Owner */}
                    <th scope="col" style={{ width: "140px" }}>Owner</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((t) => (
                    <tr
                      key={t.id}
                      onClick={() => handleTicketClick(t.id)}
                      style={{ cursor: "pointer" }}
                    >
                      <td className="fw-semibold text-nowrap" style={{ color: "#006B3C" }}>
                        {t.ticketNumber}
                      </td>
                      <td className="text-muted text-nowrap">{formatDate(t.createdAt)}</td>
                      <td>
                        <div className="fw-medium text-dark text-truncate" style={{ maxWidth: "320px" }}>
                          {t.summary}
                        </div>
                      </td>
                      <td className="text-muted">{t.category?.name || "—"}</td>
                      <td>
                        <PriorityBadge priority={t.requestedPriority} size="sm" />
                      </td>
                      <td>
                        <PriorityBadge priority={t.itPriority} size="sm" />
                      </td>
                      <td>
                        <StatusBadge status={t.currentStatus} size="sm" />
                      </td>
                      <td>
                        {t.ticketOwner ? (
                          <span className="text-dark fw-medium">{t.ticketOwner.name}</span>
                        ) : (
                          <span className="text-muted fst-italic">Unassigned</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Responsive Stacked Cards (Visible on Viewports < 768px) */}
            <div className="d-md-none p-2 d-flex flex-column gap-2">
              {tickets.map((t) => (
                <div
                  key={t.id}
                  data-testid="staff-ticket-card"
                  className="card border p-3 shadow-none"
                  style={{ borderColor: "#E2E8F0", cursor: "pointer", minHeight: "44px" }}
                  onClick={() => handleTicketClick(t.id)}
                >
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <span className="fw-bold" style={{ color: "#006B3C" }}>
                      {t.ticketNumber}
                    </span>
                    <StatusBadge status={t.currentStatus} size="sm" />
                  </div>
                  <h6 className="fw-semibold text-dark mb-2">{t.summary}</h6>
                  <div className="d-flex flex-wrap gap-2 align-items-center mb-2">
                    <span className="badge bg-light text-dark border">
                      {t.category?.name || "General"}
                    </span>
                    <span className="d-flex align-items-center gap-1 small text-muted">
                      IT Prio: <PriorityBadge priority={t.itPriority} size="sm" />
                    </span>
                  </div>
                  <div className="d-flex justify-content-between align-items-center pt-2 border-top small text-muted">
                    <span>{formatDate(t.createdAt)}</span>
                    <span>
                      {t.ticketOwner ? (
                        <strong className="text-dark">{t.ticketOwner.name}</strong>
                      ) : (
                        <em>Unassigned</em>
                      )}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="card-footer bg-white border-top p-3 d-flex justify-content-between align-items-center">
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              style={{ minHeight: "36px" }}
            >
              &lt; Previous
            </button>

            <div className="d-flex align-items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                .map((p, idx, arr) => {
                  const showEllipsis = idx > 0 && p - arr[idx - 1] > 1;
                  return (
                    <React.Fragment key={p}>
                      {showEllipsis && <span className="px-1 text-muted">…</span>}
                      <button
                        type="button"
                        className={`btn btn-sm ${
                          p === page
                            ? "text-white"
                            : "btn-outline-secondary"
                        }`}
                        style={{
                          backgroundColor: p === page ? "#006B3C" : undefined,
                          borderColor: p === page ? "#006B3C" : undefined,
                          minWidth: "32px",
                          minHeight: "36px",
                        }}
                        onClick={() => setPage(p)}
                      >
                        {p}
                      </button>
                    </React.Fragment>
                  );
                })}
            </div>

            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              style={{ minHeight: "36px" }}
            >
              Next &gt;
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default StaffQueueScreen;
