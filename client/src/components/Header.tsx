import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "../context/AuthContext.js";
import { getDefaultViewForRole } from "../core/router/RouteGuard.js";

export type HeaderView =
  | "portal"
  | "create-ticket"
  | "my-tickets"
  | "ticket-detail"
  | "login"
  | "change-password"
  | "queue"
  | "staff-ticket-detail"
  | "user-management";

interface HeaderProps {
  currentView?: HeaderView;
  onNavigate?: (view: HeaderView) => void;
}

export const Header: React.FC<HeaderProps> = ({ currentView = "portal", onNavigate }) => {
  let auth: ReturnType<typeof useAuth> | null = null;
  try {
    auth = useAuth();
  } catch {
    // Graceful fallback if rendered outside AuthProvider in legacy tests
  }

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

  const activeUser = auth?.user;

  const renderRoleBadge = (role: string) => {
    switch (role) {
      case "REQUESTER":
        return (
          <span
            className="badge fw-medium px-2 py-1"
            style={{
              backgroundColor: "#EAF6EF",
              color: "#006B3C",
              border: "1px solid #C2E2D3",
              fontSize: "0.75rem",
            }}
          >
            Requester
          </span>
        );
      case "IT_STAFF":
        return (
          <span
            className="badge fw-medium px-2 py-1"
            style={{
              backgroundColor: "#0B7A46",
              color: "#FFFFFF",
              fontSize: "0.75rem",
            }}
          >
            IT Staff
          </span>
        );
      case "ADMINISTRATOR":
        return (
          <span
            className="badge fw-medium px-2 py-1"
            style={{
              backgroundColor: "#1C2D27",
              color: "#FFFFFF",
              fontSize: "0.75rem",
            }}
          >
            Administrator
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <header
      className="navbar navbar-expand px-3 py-2"
      style={{ backgroundColor: "#006B3C", color: "#FFFFFF", minHeight: "56px" }}
    >
      <div className="container-fluid d-flex justify-content-between align-items-center">
        {/* Brand and Nav links */}
        <div className="d-flex align-items-center gap-2 gap-sm-4">
          <a
            href="/"
            className="navbar-brand d-flex align-items-center gap-2 text-white fw-bold m-0 p-0 text-decoration-none"
            style={{ fontSize: "1.25rem", letterSpacing: "-0.02em" }}
            onClick={(e) => {
              e.preventDefault();
              if (auth?.isAuthenticated && !auth?.mustChangePassword) {
                const defaultView = getDefaultViewForRole(activeUser?.role);
                onNavigate?.(defaultView as HeaderView);
              } else if (!auth?.isAuthenticated) {
                onNavigate?.("login");
              }
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

          {/* Navigation Items (Only rendered if authenticated and not locked in change password or login) */}
          {auth?.isAuthenticated && !auth?.mustChangePassword && currentView !== "login" && currentView !== "change-password" && (
            <nav className="d-flex align-items-center gap-1 gap-sm-3">
              {/* Requester: My Tickets */}
              {(!activeUser?.role || activeUser.role === "REQUESTER") && (
                <button
                  type="button"
                  aria-label="My Tickets"
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
                  onClick={() => onNavigate?.("my-tickets")}
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
                  <span className="d-none d-sm-inline">My Tickets</span>
                </button>
              )}

              {/* IT Staff: My Queue */}
              {activeUser?.role === "IT_STAFF" && (
                <button
                  type="button"
                  aria-label="My Queue"
                  className="btn btn-link text-white text-decoration-none d-flex align-items-center gap-2 px-2 py-1 small fw-medium"
                  style={{
                    fontSize: "0.9rem",
                    opacity: currentView === "queue" || currentView === "staff-ticket-detail" ? 1 : 0.85,
                    borderBottom:
                      currentView === "queue" || currentView === "staff-ticket-detail"
                        ? "2px solid #FFFFFF"
                        : "2px solid transparent",
                    borderRadius: 0,
                  }}
                  onClick={() => onNavigate?.("queue")}
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
                    <line x1="8" y1="6" x2="21" y2="6" />
                    <line x1="8" y1="12" x2="21" y2="12" />
                    <line x1="8" y1="18" x2="21" y2="18" />
                    <line x1="3" y1="6" x2="3.01" y2="6" />
                    <line x1="3" y1="12" x2="3.01" y2="12" />
                    <line x1="3" y1="18" x2="3.01" y2="18" />
                  </svg>
                  <span className="d-none d-sm-inline">My Queue</span>
                </button>
              )}

              {/* Requester and IT Staff: Create Ticket */}
              {(activeUser?.role === "REQUESTER" || activeUser?.role === "IT_STAFF" || !activeUser?.role) && (
                <button
                  type="button"
                  aria-label="Create Ticket"
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
                  <span className="d-none d-sm-inline">Create Ticket</span>
                </button>
              )}

              {/* Administrator: Admin */}
              {activeUser?.role === "ADMINISTRATOR" && (
                <button
                  type="button"
                  aria-label="Admin"
                  className="btn btn-link text-white text-decoration-none d-flex align-items-center gap-2 px-2 py-1 small fw-medium"
                  style={{
                    fontSize: "0.9rem",
                    opacity: currentView === "user-management" ? 1 : 0.85,
                    borderBottom:
                      currentView === "user-management"
                        ? "2px solid #FFFFFF"
                        : "2px solid transparent",
                    borderRadius: 0,
                  }}
                  onClick={() => onNavigate?.("user-management")}
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
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                  <span className="d-none d-sm-inline">Admin</span>
                </button>
              )}
            </nav>
          )}
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
            <div
              className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold flex-shrink-0"
              style={{
                width: "28px",
                height: "28px",
                backgroundColor: "rgba(0, 0, 0, 0.25)",
                fontSize: "0.85rem",
              }}
            >
              {activeUser?.name ? activeUser.name.charAt(0) : "P"}
            </div>
            <div className="d-flex align-items-baseline gap-2 d-none d-sm-flex">
              <span className="fw-semibold small text-white">
                {activeUser?.name || "Profile"}
              </span>
              {activeUser ? renderRoleBadge(activeUser.role) : null}
            </div>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="flex-shrink-0"
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
              {activeUser ? (
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
                      {activeUser?.name ? activeUser.name.charAt(0) : "U"}
                    </div>
                    <div className="overflow-hidden">
                      <div className="fw-semibold text-truncate small">{activeUser?.name || "User"}</div>
                      <div className="mt-0.5">{renderRoleBadge(activeUser.role)}</div>
                    </div>
                  </div>
                  <div className="text-muted small mb-3 text-truncate" style={{ fontSize: "0.8rem" }}>
                    {activeUser.email}
                  </div>
                  <button
                    type="button"
                    className="btn btn-sm w-100 btn-outline-danger fw-medium"
                    onClick={async () => {
                      setDropdownOpen(false);
                      await auth?.logout();
                      onNavigate?.("login");
                    }}
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <div>
                  <p className="small text-muted mb-2">No user authenticated.</p>
                  <button
                    type="button"
                    className="btn btn-sm w-100 btn-success fw-medium"
                    style={{ backgroundColor: "#006B3C" }}
                    onClick={() => {
                      setDropdownOpen(false);
                      onNavigate?.("login");
                    }}
                  >
                    Sign In
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
