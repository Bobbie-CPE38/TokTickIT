import React, { useState, useEffect } from "react";
import { useRequester } from "../context/RequesterContext.js";

export const RequesterSelectorModal: React.FC = () => {
  const {
    currentRequester,
    activeRequesters,
    loadingRequesters,
    error,
    isSelectorOpen,
    selectRequester,
    refreshRequesters,
    closeSelector,
  } = useRequester();

  const [selectedId, setSelectedId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (currentRequester) {
      setSelectedId(currentRequester.id.toString());
    } else if (activeRequesters.length > 0) {
      setSelectedId(activeRequesters[0].id.toString());
    }
  }, [currentRequester, activeRequesters]);

  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault();
    const idNum = parseInt(selectedId, 10);
    const chosen = activeRequesters.find((r) => r.id === idNum);
    if (chosen) {
      selectRequester(chosen);
    }
  };

  return (
    <div
      style={{
        backgroundColor: "#F5F7F6",
        minHeight: "calc(100vh - 56px)",
        paddingBottom: "48px",
      }}
    >
      {/* Breadcrumb Bar */}
      <div className="container-fluid px-4 py-3" style={{ maxWidth: "1200px" }}>
        <div className="d-flex align-items-center gap-2 small" style={{ color: "#006B3C" }}>
          {/* Home Icon */}
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          <span style={{ color: "#9CA3AF" }}>&rsaquo;</span>
          <span className="fw-medium">Development Requester Selection</span>
        </div>
      </div>

      {/* Main Content: Centered Selection Card */}
      <div className="container px-3 mt-2" style={{ maxWidth: "700px" }}>
        <div
          className="card border-0 shadow-sm"
          style={{
            borderRadius: "12px",
            backgroundColor: "#FFFFFF",
            border: "1px solid #E2E8F0",
          }}
        >
          <div className="card-body p-4 p-md-5">
            {/* Top Icon Badge */}
            <div className="text-center mb-3">
              <div
                className="d-inline-flex align-items-center justify-content-center rounded-circle"
                style={{
                  width: "68px",
                  height: "68px",
                  backgroundColor: "#EAF6EF",
                  color: "#006B3C",
                }}
              >
                {/* User with gear icon */}
                <svg
                  width="36"
                  height="36"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <circle cx="19" cy="11" r="2" />
                  <path d="M19 8v1" />
                  <path d="M19 13v1" />
                  <path d="M21.6 9.5l-.87.5" />
                  <path d="M17.27 12l-.87.5" />
                  <path d="M21.6 12.5l-.87-.5" />
                  <path d="M17.27 10l-.87-.5" />
                </svg>
              </div>
            </div>

            {/* Title & Subtitle */}
            <div className="text-center mb-4">
              <h1
                className="h3 fw-bold mb-2"
                style={{ color: "#1C2D27", letterSpacing: "-0.01em" }}
              >
                Select Development Requester
              </h1>
              <p className="text-muted mb-0" style={{ fontSize: "0.95rem", lineHeight: "1.5" }}>
                Choose a development requester to simulate the current requester context for Lab 2.
                <br className="d-none d-sm-inline" /> This is for testing only and is not a login
                screen.
              </p>
              {/* Hidden text for spec notice compliance */}
              <span className="visually-hidden">
                Select a Development Requester to test requester-specific ticket behavior. This is not
                a login screen. Authentication and role-based access will be introduced in Lab 3.
              </span>
            </div>

            {/* Loading State */}
            {loadingRequesters && (
              <div className="text-center py-5">
                <div
                  className="spinner-border"
                  role="status"
                  style={{ color: "#006B3C", width: "2.5rem", height: "2.5rem" }}
                >
                  <span className="visually-hidden">Loading...</span>
                </div>
                <div className="text-muted mt-3 small fw-medium">
                  Loading active development requesters…
                </div>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div
                className="alert d-flex align-items-center justify-content-between p-3 mb-4"
                style={{ backgroundColor: "#FEE2E2", borderColor: "#EF4444", color: "#991B1B" }}
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
                    <strong>Error:</strong> {error}
                  </span>
                </div>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-danger fw-medium"
                  onClick={refreshRequesters}
                >
                  Retry
                </button>
              </div>
            )}

            {/* Empty State */}
            {!loadingRequesters && !error && activeRequesters.length === 0 && (
              <div className="text-center py-4">
                <p className="text-muted mb-3">
                  No active development requesters found in database. Please run seed script.
                </p>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-success"
                  style={{ borderColor: "#006B3C", color: "#006B3C" }}
                  onClick={refreshRequesters}
                >
                  Refresh
                </button>
              </div>
            )}

            {/* Active Form Controls */}
            {!loadingRequesters && !error && activeRequesters.length > 0 && (
              <form onSubmit={handleContinue}>
                <div className="mb-3">
                  <label
                    htmlFor="requester-select"
                    className="form-label fw-bold mb-2"
                    style={{ color: "#1C2D27", fontSize: "0.95rem" }}
                  >
                    Development Requester <span style={{ color: "#DC2626" }}>*</span>
                  </label>
                  <select
                    id="requester-select"
                    aria-label="Select Requester"
                    className="form-select form-select-lg"
                    value={selectedId}
                    onChange={(e) => setSelectedId(e.target.value)}
                    style={{
                      fontSize: "0.95rem",
                      borderColor: "#D1D5DB",
                      borderRadius: "8px",
                      padding: "10px 14px",
                      color: "#1C2D27",
                    }}
                  >
                    {activeRequesters.map((req) => (
                      <option key={req.id} value={req.id}>
                        {req.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Callout 1: Active Requesters Only Note */}
                <div
                  className="d-flex align-items-center gap-2 p-3 mb-3"
                  style={{
                    backgroundColor: "#EAF6EF",
                    border: "1px solid #A7F3D0",
                    borderRadius: "8px",
                    color: "#065F46",
                    fontSize: "0.875rem",
                  }}
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="flex-shrink-0"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                  <span className="fw-medium">Only active development requesters are shown.</span>
                </div>

                {/* Callout 2: Authentication Coming in Lab 3 Notice */}
                <div
                  className="d-flex align-items-start gap-3 p-3 mb-2"
                  style={{
                    backgroundColor: "#F8FAFC",
                    border: "1px solid #E2E8F0",
                    borderRadius: "8px",
                  }}
                >
                  <div
                    className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                    style={{
                      width: "36px",
                      height: "36px",
                      backgroundColor: "#E2E8F0",
                      color: "#475569",
                    }}
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
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                  </div>
                  <div>
                    <div className="fw-bold mb-1" style={{ color: "#1C2D27", fontSize: "0.9rem" }}>
                      Authentication coming in Lab 3
                    </div>
                    <div className="text-muted" style={{ fontSize: "0.85rem", lineHeight: "1.4" }}>
                      In Lab 3, this selection will be replaced with secure authentication so you can
                      access the system with your own account.
                    </div>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div
                  className="d-flex justify-content-end gap-2 pt-4 mt-4"
                  style={{ borderTop: "1px solid #E2E8F0" }}
                >
                  <button
                    type="button"
                    className="btn px-4 py-2 fw-medium"
                    style={{
                      backgroundColor: "#FFFFFF",
                      border: "1px solid #D1D5DB",
                      color: "#374151",
                      borderRadius: "6px",
                    }}
                    onClick={closeSelector}
                    disabled={!currentRequester}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn px-4 py-2 fw-semibold d-flex align-items-center gap-2"
                    style={{
                      backgroundColor: "#006B3C",
                      borderColor: "#006B3C",
                      color: "#FFFFFF",
                      borderRadius: "6px",
                    }}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                        <span>Continuing…</span>
                      </>
                    ) : (
                      <>
                        <span className="fs-6">&rarr;</span>
                        <span>Continue</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
