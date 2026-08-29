import React from "react";
import { useRequester } from "../context/RequesterContext.js";

export const Header: React.FC = () => {
  const { currentRequester, openSelector } = useRequester();

  return (
    <header
      className="navbar navbar-expand-lg px-3 py-2 shadow-sm"
      style={{ backgroundColor: "#006B3C", color: "#FFFFFF" }}
    >
      <div className="container-fluid d-flex justify-content-between align-items-center">
        <div className="d-flex align-items-center gap-2">
          <span className="fs-4">🎫</span>
          <span className="navbar-brand mb-0 h1 text-white fw-bold">TokTickIT</span>
        </div>

        <div className="d-flex align-items-center gap-3">
          {currentRequester ? (
            <div className="d-flex align-items-center gap-2">
              <div className="text-end">
                <div className="fw-semibold text-white small">{currentRequester.name}</div>
                <div className="text-white-50" style={{ fontSize: "0.75rem" }}>
                  {currentRequester.department}
                </div>
              </div>
              <button
                type="button"
                className="btn btn-sm btn-outline-light"
                onClick={openSelector}
                aria-label="Switch Requester"
              >
                Switch Requester
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="btn btn-sm btn-light text-success fw-semibold"
              onClick={openSelector}
            >
              Select Requester
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
