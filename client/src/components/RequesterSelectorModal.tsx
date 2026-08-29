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

  useEffect(() => {
    if (currentRequester) {
      setSelectedId(currentRequester.id.toString());
    } else if (activeRequesters.length > 0) {
      setSelectedId(activeRequesters[0].id.toString());
    }
  }, [currentRequester, activeRequesters]);

  if (!isSelectorOpen) {
    return null;
  }

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
      className="modal fade show d-block"
      tabIndex={-1}
      role="dialog"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
    >
      <div className="modal-dialog modal-dialog-centered" role="document">
        <div className="modal-content shadow" style={{ borderRadius: "8px" }}>
          <div className="modal-header border-bottom pb-2">
            <h5 className="modal-title d-flex align-items-center gap-2" style={{ color: "#1C2D27" }}>
              <span className="fs-5">👤</span> Select Development Requester
            </h5>
            {currentRequester && (
              <button
                type="button"
                className="btn-close"
                aria-label="Close"
                onClick={closeSelector}
              />
            )}
          </div>

          <div className="modal-body">
            {/* Notice Callout */}
            <div
              className="alert mb-3"
              style={{
                backgroundColor: "#EAF6EF",
                borderColor: "#A7F3D0",
                color: "#065F46",
                fontSize: "0.875rem",
              }}
            >
              Select a Development Requester to test requester-specific ticket behavior. This is not a
              login screen. Authentication and role-based access will be introduced in Lab 3.
            </div>

            {loadingRequesters && (
              <div className="text-center py-4">
                <div className="spinner-border text-success" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                <div className="text-muted mt-2 small">Loading active requesters…</div>
              </div>
            )}

            {error && (
              <div className="alert alert-danger d-flex align-items-center justify-content-between">
                <div>
                  <strong>Error:</strong> {error}
                </div>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-danger"
                  onClick={refreshRequesters}
                >
                  Retry
                </button>
              </div>
            )}

            {!loadingRequesters && !error && activeRequesters.length === 0 && (
              <div className="text-muted py-3 text-center">
                No active development requesters found in database. Please run seed script.
              </div>
            )}

            {!loadingRequesters && !error && activeRequesters.length > 0 && (
              <form onSubmit={handleContinue}>
                <div className="mb-3">
                  <label
                    htmlFor="requester-select"
                    className="form-label fw-semibold"
                    style={{ color: "#1C2D27" }}
                  >
                    Select Requester
                  </label>
                  <select
                    id="requester-select"
                    aria-label="Select Requester"
                    className="form-select"
                    value={selectedId}
                    onChange={(e) => setSelectedId(e.target.value)}
                    style={{ borderColor: "#D1D5DB" }}
                  >
                    {activeRequesters.map((req) => (
                      <option key={req.id} value={req.id}>
                        {req.name} ({req.department}) - {req.email}
                      </option>
                    ))}
                  </select>
                  <div className="form-text mt-1" style={{ color: "#52665D", fontSize: "0.8rem" }}>
                    Only active development requesters are shown.
                  </div>
                </div>

                <div className="d-flex justify-content-end gap-2 mt-4">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={closeSelector}
                    disabled={!currentRequester}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn"
                    style={{
                      backgroundColor: "#006B3C",
                      borderColor: "#006B3C",
                      color: "#FFFFFF",
                    }}
                  >
                    Continue
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
