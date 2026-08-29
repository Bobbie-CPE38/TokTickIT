import React, { useState, useRef, useEffect } from "react";
import { useRequester } from "../context/RequesterContext.js";

interface HeaderProps {
  currentView?: "portal" | "create-ticket" | "my-tickets";
  onNavigate?: (view: "portal" | "create-ticket" | "my-tickets") => void;
}

export const Header: React.FC<HeaderProps> = ({ currentView = "portal", onNavigate }) => {
  const { currentRequester, openSelector } = useRequester();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header
      className="navbar navbar-expand px-3 py-2"
      style={{ backgroundColor: "#006B3C", color: "#FFFFFF", minHeight: "56px" }}
    >
      <div className="container-fluid d-flex justify-content-between align-items-center">
        {/* Brand and Nav links */}
        <div className="d-flex align-items-center gap-4">
          <a
            href="/"
            className="navbar-brand d-flex align-items-center gap-2 text-white fw-bold m-0 p-0 text-decoration-none"
            style={{ fontSize: "1.25rem", letterSpacing: "-0.02em" }}
            onClick={(e) => {
              e.preventDefault();
              onNavigate?.("portal");
            }}
          >
            {/* Clock & Checkmark Logo Icon */}
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-white"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span>TokTickIT</span>
          </a>

          {/* Navigation Items */}
          <nav className="d-flex align-items-center gap-3">
            <button
              type="button"
              className="btn btn-link text-white text-decoration-none d-flex align-items-center gap-2 px-2 py-1 small fw-medium"
              style={{
                fontSize: "0.9rem",
                opacity: currentView === "portal" || currentView === "my-tickets" ? 1 : 0.85,
                borderBottom:
                  currentView === "portal" || currentView === "my-tickets"
                    ? "2px solid #FFFFFF"
                    : "2px solid transparent",
                borderRadius: 0,
              }}
              onClick={() => onNavigate?.("portal")}
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
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
              <span>My Tickets</span>
            </button>

            <button
              type="button"
              className="btn btn-link text-white text-decoration-none d-flex align-items-center gap-2 px-2 py-1 small fw-medium"
              style={{
                fontSize: "0.9rem",
                opacity: currentView === "create-ticket" ? 1 : 0.85,
                borderBottom: currentView === "create-ticket" ? "2px solid #FFFFFF" : "2px solid transparent",
                borderRadius: 0,
              }}
              onClick={() => onNavigate?.("create-ticket")}
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
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="16" />
                <line x1="8" y1="12" x2="16" y2="12" />
              </svg>
              <span>Create Ticket</span>
            </button>
          </nav>
        </div>

        {/* Right: Profile Dropdown */}
        <div className="position-relative" ref={dropdownRef}>
          <button
            type="button"
            className="btn d-flex align-items-center gap-2 text-white border-0 p-1"
            style={{ backgroundColor: "transparent" }}
            onClick={() => setDropdownOpen((prev) => !prev)}
            aria-expanded={dropdownOpen}
            aria-label="Profile"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <span className="fw-medium small">Profile</span>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {/* Profile Dropdown Menu */}
          {dropdownOpen && (
            <div
              className="position-absolute end-0 mt-2 bg-white rounded-3 shadow-lg border p-3"
              style={{ width: "260px", zIndex: 1050, color: "#1C2D27" }}
            >
              {currentRequester ? (
                <div>
                  <div className="d-flex align-items-center gap-2 pb-2 mb-2 border-bottom">
                    <div
                      className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold"
                      style={{
                        width: "36px",
                        height: "36px",
                        backgroundColor: "#006B3C",
                        fontSize: "0.875rem",
                      }}
                    >
                      {currentRequester.name.charAt(0)}
                    </div>
                    <div className="overflow-hidden">
                      <div className="fw-semibold text-truncate small">{currentRequester.name}</div>
                      <div className="text-muted text-truncate" style={{ fontSize: "0.75rem" }}>
                        {currentRequester.department}
                      </div>
                    </div>
                  </div>
                  <div className="text-muted small mb-3 text-truncate" style={{ fontSize: "0.8rem" }}>
                    {currentRequester.email}
                  </div>
                  <button
                    type="button"
                    className="btn btn-sm w-100 btn-outline-success fw-medium"
                    style={{ borderColor: "#006B3C", color: "#006B3C" }}
                    onClick={() => {
                      setDropdownOpen(false);
                      openSelector();
                    }}
                  >
                    Switch Requester
                  </button>
                </div>
              ) : (
                <div>
                  <p className="small text-muted mb-2">No requester selected.</p>
                  <button
                    type="button"
                    className="btn btn-sm w-100 btn-success fw-medium"
                    style={{ backgroundColor: "#006B3C" }}
                    onClick={() => {
                      setDropdownOpen(false);
                      openSelector();
                    }}
                  >
                    Select Requester
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
