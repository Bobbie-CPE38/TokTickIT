import React, { useState, useEffect, useCallback } from "react";
import { RequesterProvider, useRequester } from "./context/RequesterContext.js";
import { Header } from "./components/Header.js";
import { RequesterSelectorModal } from "./components/RequesterSelectorModal.js";
import { CreateTicket } from "./components/CreateTicket.js";
import { MyTickets } from "./components/MyTickets.js";
import { checkSystem, Category } from "./api.js";

export type AppView = "portal" | "create-ticket" | "my-tickets";

function getInitialView(): AppView {
  if (typeof window !== "undefined") {
    const pathname = window.location.pathname;
    if (pathname === "/tickets/new") {
      return "create-ticket";
    }
  }
  return "my-tickets";
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
            <h2 className="h6 fw-bold mb-0 text-uppercase tracking-wide" style={{ color: "#1C2D27" }}>
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
            <span className={`badge ${status === "Online" ? "bg-success" : "bg-danger"}`}>
              Status: {status}
            </span>
          </div>
        )}

        {categories.length > 0 && (
          <div>
            <span className="text-muted small d-block mb-2">Supported Categories:</span>
            <div className="d-flex flex-wrap gap-2">
              {categories.map((c) => (
                <span
                  key={c.id}
                  className="badge px-3 py-2 fw-medium"
                  style={{ backgroundColor: "#EAF6EF", color: "#006B3C", border: "1px solid #C2E2D3" }}
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
  navigateTo: (view: AppView) => void;
}

function AppBody({ currentView, navigateTo }: AppBodyProps) {
  const { currentRequester, isSelectorOpen } = useRequester();

  if (!currentRequester || isSelectorOpen) {
    return <RequesterSelectorModal />;
  }

  if (currentView === "create-ticket") {
    return (
      <CreateTicket
        onCancel={() => navigateTo("my-tickets")}
      />
    );
  }

  return (
    <>
      <MyTickets
        onNavigateCreate={() => navigateTo("create-ticket")}
      />
      <SystemHealthSection />
    </>
  );
}

function AppContent() {
  const [currentView, setCurrentView] = useState<AppView>(getInitialView);
  const { currentRequester, closeSelector } = useRequester();

  const navigateTo = useCallback(
    (view: AppView) => {
      setCurrentView(view);
      if (currentRequester) {
        closeSelector();
      }
      if (typeof window !== "undefined") {
        const targetPath =
          view === "create-ticket" ? "/tickets/new" : view === "my-tickets" ? "/tickets" : "/";
        if (window.location.pathname !== targetPath) {
          window.history.pushState({}, "", targetPath);
        }
      }
    },
    [currentRequester, closeSelector]
  );

  useEffect(() => {
    function handlePopState() {
      setCurrentView(getInitialView());
    }
    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#F5F7F6" }}>
      <Header currentView={currentView} onNavigate={navigateTo} />
      <main>
        <AppBody currentView={currentView} navigateTo={navigateTo} />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <RequesterProvider>
      <AppContent />
    </RequesterProvider>
  );
}
