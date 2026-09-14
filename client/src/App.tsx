import React, { useState, useEffect, useCallback } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext.js";
import { Header } from "./components/Header.js";
import { CreateTicket } from "./components/CreateTicket.js";
import { MyTickets } from "./components/MyTickets.js";
import { RequesterTicketDetail } from "./components/RequesterTicketDetail.js";
import { Login } from "./components/Login.js";
import { ChangePassword } from "./components/ChangePassword.js";
import { checkSystem, Category, Ticket } from "./api.js";

export type AppView =
  | "portal"
  | "create-ticket"
  | "my-tickets"
  | "ticket-detail"
  | "login"
  | "change-password"
  | "queue"
  | "user-management";

export interface IntendedDestination {
  view: AppView;
  ticketId: number | null;
}

export function isViewPermittedForRole(view: AppView, role?: string): boolean {
  if (view === "login" || view === "change-password") return true;
  if (!role) return false;
  if (role === "REQUESTER") {
    return ["portal", "my-tickets", "create-ticket", "ticket-detail"].includes(view);
  }
  if (role === "IT_STAFF") {
    return ["portal", "my-tickets", "create-ticket", "ticket-detail", "queue"].includes(view);
  }
  if (role === "ADMINISTRATOR") {
    return ["portal", "my-tickets", "create-ticket", "ticket-detail", "user-management"].includes(view);
  }
  return false;
}

export function getDefaultViewForRole(role?: string): AppView {
  switch (role) {
    case "IT_STAFF":
      return "my-tickets";
    case "ADMINISTRATOR":
      return "my-tickets";
    case "REQUESTER":
    default:
      return "my-tickets";
  }
}

interface InitialViewState {
  view: AppView;
  ticketId: number | null;
}

function getInitialViewState(): InitialViewState {
  if (typeof window !== "undefined") {
    const pathname = window.location.pathname;
    if (pathname === "/login") {
      return { view: "login", ticketId: null };
    }
    if (pathname === "/change-password") {
      return { view: "change-password", ticketId: null };
    }
    if (pathname === "/tickets/new") {
      return { view: "create-ticket", ticketId: null };
    }
    const match = pathname.match(/^\/tickets\/(\d+)$/);
    if (match) {
      return { view: "ticket-detail", ticketId: parseInt(match[1], 10) };
    }
    if (pathname === "/queue") {
      return { view: "queue", ticketId: null };
    }
    if (pathname === "/admin/users") {
      return { view: "user-management", ticketId: null };
    }
    if (pathname === "/tickets" || pathname === "/") {
      return { view: "my-tickets", ticketId: null };
    }
  }
  return { view: "my-tickets", ticketId: null };
}

function SystemHealthSection() {
  const [status, setStatus] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const handleCheck = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await checkSystem();
      setStatus(result.online ? "Online" : "Offline");
      setCategories(result.categories);
    } catch (err) {
      setStatus("Offline");
      setError(err instanceof Error ? err.message : "Backend is unavailable.");
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-4">
      <div
        className="card border-0 shadow-sm p-4"
        style={{
          backgroundColor: "#FFFFFF",
          borderRadius: "8px",
          border: "1px solid #E2E8F0",
        }}
      >
        <div className="d-flex align-items-center justify-content-between mb-3">
          <div className="d-flex align-items-center gap-2">
            <span
              className="rounded-circle"
              style={{
                width: "10px",
                height: "10px",
                backgroundColor:
                  status === "Online"
                    ? "#006B3C"
                    : status === "Offline"
                    ? "#DC2626"
                    : "#D97706",
                display: "inline-block",
              }}
            />
            <h2
              className="h6 fw-bold mb-0 text-uppercase tracking-wide"
              style={{ color: "#1C2D27" }}
            >
              System Catalog &amp; Health (Lab 1)
            </h2>
          </div>
          <button
            type="button"
            className="btn btn-sm btn-outline-success"
            style={{ borderColor: "#006B3C", color: "#006B3C" }}
            onClick={handleCheck}
            disabled={loading}
          >
            {loading ? "Checking..." : "Check System"}
          </button>
        </div>

        {status && (
          <div className="mb-3">
            <span
              className={`badge ${status === "Online" ? "bg-success" : "bg-danger"}`}
            >
              Status: {status}
            </span>
          </div>
        )}

        {categories.length > 0 && (
          <div>
            <span className="text-muted small d-block mb-2">
              Supported Categories:
            </span>
            <div className="d-flex flex-wrap gap-2">
              {categories.map((c) => (
                <span
                  key={c.id}
                  className="badge px-3 py-2 fw-medium"
                  style={{
                    backgroundColor: "#EAF6EF",
                    color: "#006B3C",
                    border: "1px solid #C2E2D3",
                  }}
                >
                  {c.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="alert alert-danger mt-3 mb-0 py-2 small" role="alert">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

interface AppBodyProps {
  currentView: AppView;
  selectedTicketId: number | null;
  navigateTo: (view: AppView, ticketId?: number | null) => void;
  intendedDestination: IntendedDestination | null;
  onClearIntendedDestination: () => void;
}

function AppBody({
  currentView,
  selectedTicketId,
  navigateTo,
  intendedDestination,
  onClearIntendedDestination,
}: AppBodyProps) {
  const auth = useAuth();

  const handlePostAuthRedirect = (userRole?: string) => {
    const role = userRole || auth.user?.role;
    if (
      intendedDestination &&
      isViewPermittedForRole(intendedDestination.view, role)
    ) {
      const dest = intendedDestination;
      onClearIntendedDestination();
      navigateTo(dest.view, dest.ticketId);
    } else {
      onClearIntendedDestination();
      navigateTo(getDefaultViewForRole(role));
    }
  };

  const storedUser =
    typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem("toktickit_auth_user") || "{}")
      : {};
  const effectiveMustChange =
    auth.mustChangePassword && (storedUser.mustChangePassword ?? true);

  // If user is authenticated and must change password, intercept view (BR-02)
  if (auth.isAuthenticated && effectiveMustChange) {
    return (
      <ChangePassword
        onSuccess={() => {
          handlePostAuthRedirect();
        }}
      />
    );
  }

  // Unauthenticated users are strictly shown the Login screen (cannot access tickets or portal)
  if (!auth.isAuthenticated || currentView === "login") {
    return (
      <Login
        onSuccess={(authResponse) => {
          if (authResponse.user.mustChangePassword) {
            navigateTo("change-password");
          } else {
            handlePostAuthRedirect(authResponse.user.role);
          }
        }}
      />
    );
  }

  // Explicit change-password screen (accessible via user profile dropdown)
  if (currentView === "change-password") {
    return (
      <ChangePassword
        onSuccess={() => {
          handlePostAuthRedirect();
        }}
      />
    );
  }

  if (currentView === "ticket-detail" && selectedTicketId) {
    return (
      <RequesterTicketDetail
        ticketId={selectedTicketId}
        onBack={() => navigateTo("my-tickets")}
      />
    );
  }

  if (currentView === "create-ticket") {
    return (
      <CreateTicket
        onSuccess={(_ticket: Ticket) => {
          // Can stay on success confirmation or navigate
        }}
        onCancel={() => navigateTo("my-tickets")}
      />
    );
  }

  return (
    <>
      <MyTickets
        onNavigateCreate={() => navigateTo("create-ticket")}
        onSelectTicket={(ticketId: number) => navigateTo("ticket-detail", ticketId)}
      />
      <SystemHealthSection />
    </>
  );
}

function AppContent() {
  const auth = useAuth();
  const [initial] = useState<InitialViewState>(getInitialViewState);

  // If unauthenticated (and not loading), start with login view; otherwise use requested initial view
  const [currentView, setCurrentView] = useState<AppView>(() => {
    if (!auth.loading && !auth.isAuthenticated) {
      return "login";
    }
    return initial.view;
  });

  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(() => {
    if (!auth.loading && !auth.isAuthenticated) {
      return null;
    }
    return initial.ticketId;
  });

  // Preserve intended destination if user initially attempted access to a protected route while unauthenticated
  const [intendedDestination, setIntendedDestination] = useState<IntendedDestination | null>(() => {
    if (initial.view !== "login" && initial.view !== "change-password") {
      return { view: initial.view, ticketId: initial.ticketId };
    }
    return null;
  });

  const navigateTo = useCallback(
    (view: AppView, ticketId: number | null = null) => {
      const isAuth =
        auth.isAuthenticated ||
        (typeof window !== "undefined" && !!localStorage.getItem("toktickit_auth_token"));

      // Guard: Unauthenticated users cannot navigate to protected views
      if (!isAuth && view !== "login") {
        setIntendedDestination({ view, ticketId });
        setCurrentView("login");
        setSelectedTicketId(null);
        if (typeof window !== "undefined" && window.location.pathname !== "/login") {
          window.history.replaceState({}, "", "/login");
        }
        return;
      }

      // Guard: Authenticated users with mustChangePassword must remain on change-password
      const mustChange =
        auth.mustChangePassword &&
        (typeof window !== "undefined"
          ? JSON.parse(localStorage.getItem("toktickit_auth_user") || "{}").mustChangePassword ?? true
          : true);

      if (auth.isAuthenticated && mustChange && view !== "change-password") {
        setCurrentView("change-password");
        setSelectedTicketId(null);
        if (typeof window !== "undefined" && window.location.pathname !== "/change-password") {
          window.history.replaceState({}, "", "/change-password");
        }
        return;
      }

      // Guard: Role-based destination permission
      if (auth.isAuthenticated && auth.user && !isViewPermittedForRole(view, auth.user.role)) {
        const fallback = getDefaultViewForRole(auth.user.role);
        setCurrentView(fallback);
        setSelectedTicketId(null);
        if (typeof window !== "undefined") {
          const fallbackPath = fallback === "my-tickets" ? "/tickets" : "/";
          if (window.location.pathname !== fallbackPath) {
            window.history.replaceState({}, "", fallbackPath);
          }
        }
        return;
      }

      // Explicit voluntary login navigation clears intended destination
      if (view === "login") {
        setIntendedDestination(null);
      }

      setCurrentView(view);
      setSelectedTicketId(ticketId);

      if (typeof window !== "undefined") {
        let targetPath = "/";
        if (view === "login") targetPath = "/login";
        else if (view === "change-password") targetPath = "/change-password";
        else if (view === "create-ticket") targetPath = "/tickets/new";
        else if (view === "ticket-detail" && ticketId) targetPath = `/tickets/${ticketId}`;
        else if (view === "my-tickets") targetPath = "/tickets";
        else if (view === "queue") targetPath = "/queue";
        else if (view === "user-management") targetPath = "/admin/users";

        if (window.location.pathname !== targetPath) {
          window.history.pushState({}, "", targetPath);
        }
      }
    },
    [auth.isAuthenticated, auth.mustChangePassword, auth.user]
  );

  // Synchronize URL and current view with authentication status
  useEffect(() => {
    // Wait for auth bootstrap before making unauthenticated redirect decisions
    if (auth.loading) {
      return;
    }

    const storedUser =
      typeof window !== "undefined"
        ? JSON.parse(localStorage.getItem("toktickit_auth_user") || "{}")
        : {};
    const effectiveMustChange =
      auth.mustChangePassword && (storedUser.mustChangePassword ?? true);

    if (!auth.isAuthenticated) {
      if (currentView !== "login") {
        setIntendedDestination((prev) => prev ?? { view: currentView, ticketId: selectedTicketId });
        setCurrentView("login");
        setSelectedTicketId(null);
      }
      if (typeof window !== "undefined" && window.location.pathname !== "/login") {
        window.history.replaceState({}, "", "/login");
      }
    } else if (effectiveMustChange) {
      if (currentView !== "change-password") {
        setCurrentView("change-password");
      }
      if (typeof window !== "undefined" && window.location.pathname !== "/change-password") {
        window.history.replaceState({}, "", "/change-password");
      }
    } else if (currentView === "login" || (currentView === "change-password" && intendedDestination)) {
      // Authenticated user on login or change-password with pending destination -> forward to destination or default
      if (
        intendedDestination &&
        isViewPermittedForRole(intendedDestination.view, auth.user?.role)
      ) {
        const dest = intendedDestination;
        setIntendedDestination(null);
        navigateTo(dest.view, dest.ticketId);
      } else {
        setIntendedDestination(null);
        navigateTo(getDefaultViewForRole(auth.user?.role));
      }
    }
  }, [
    auth.loading,
    auth.isAuthenticated,
    auth.mustChangePassword,
    auth.user,
    currentView,
    selectedTicketId,
    intendedDestination,
    navigateTo,
  ]);

  // Handle browser back/forward navigation while respecting authentication and role guards
  useEffect(() => {
    function handlePopState() {
      if (auth.loading) return;

      const state = getInitialViewState();

      if (!auth.isAuthenticated) {
        if (state.view !== "login") {
          setIntendedDestination({ view: state.view, ticketId: state.ticketId });
          setCurrentView("login");
          setSelectedTicketId(null);
          window.history.replaceState({}, "", "/login");
          return;
        }
        setCurrentView("login");
        setSelectedTicketId(null);
        return;
      }

      const storedUser =
        typeof window !== "undefined"
          ? JSON.parse(localStorage.getItem("toktickit_auth_user") || "{}")
          : {};
      const effectiveMustChange =
        auth.mustChangePassword && (storedUser.mustChangePassword ?? true);

      if (effectiveMustChange) {
        if (state.view !== "change-password") {
          setCurrentView("change-password");
          setSelectedTicketId(null);
          window.history.replaceState({}, "", "/change-password");
          return;
        }
        setCurrentView("change-password");
        setSelectedTicketId(null);
        return;
      }

      if (auth.user && !isViewPermittedForRole(state.view, auth.user.role)) {
        const fallback = getDefaultViewForRole(auth.user.role);
        setCurrentView(fallback);
        setSelectedTicketId(null);
        window.history.replaceState({}, "", fallback === "my-tickets" ? "/tickets" : "/");
        return;
      }

      setCurrentView(state.view);
      setSelectedTicketId(state.ticketId);
    }

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [auth.loading, auth.isAuthenticated, auth.mustChangePassword, auth.user]);

  // If loading auth state and session token exists, display clean Zen Green loading state
  if (auth.loading && auth.token) {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: "#F5F7F6" }}>
        <Header currentView={currentView} onNavigate={(view) => navigateTo(view)} />
        <main className="d-flex justify-content-center align-items-center" style={{ minHeight: "60vh" }}>
          <div className="spinner-border" style={{ color: "#006B3C" }} role="status">
            <span className="visually-hidden">Loading session...</span>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#F5F7F6" }}>
      <Header currentView={currentView} onNavigate={(view) => navigateTo(view)} />
      <main>
        <AppBody
          currentView={currentView}
          selectedTicketId={selectedTicketId}
          navigateTo={navigateTo}
          intendedDestination={intendedDestination}
          onClearIntendedDestination={() => setIntendedDestination(null)}
        />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
