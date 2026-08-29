import { useState, useEffect, useCallback } from "react";
import { checkSystem, Category } from "./api.js";
import { RequesterProvider, useRequester } from "./context/RequesterContext.js";
import { Header } from "./components/Header.js";
import { RequesterSelectorModal } from "./components/RequesterSelectorModal.js";
import { CreateTicket } from "./components/CreateTicket.js";

type UiState = "idle" | "loading" | "success" | "error";
export type AppView = "portal" | "create-ticket" | "my-tickets";

function getInitialView(): AppView {
  if (typeof window !== "undefined") {
    const path = window.location.pathname;
    if (path.startsWith("/tickets/new")) {
      return "create-ticket";
    }
  }
  return "portal";
}

interface MainContentProps {
  onNavigateCreate: () => void;
}

function MainContent({ onNavigateCreate }: MainContentProps) {
  const { currentRequester } = useRequester();
  const [state, setState] = useState<UiState>("idle");
  const [categories, setCategories] = useState<Category[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>("");

  async function handleCheck() {
    setState("loading");
    setErrorMessage("");
    try {
      const result = await checkSystem();
      setCategories(result.categories);
      setState("success");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Backend is unavailable.");
      setState("error");
    }
  }

  return (
    <div className="container py-4" style={{ maxWidth: 840 }}>
      <div className="card shadow-sm border-0 mb-4" style={{ backgroundColor: "#FFFFFF", borderRadius: "8px" }}>
        <div className="card-body p-4">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h2 className="h4 m-0 fw-bold" style={{ color: "#1C2D27" }}>
              IT Service Desk Portal
            </h2>
            <button
              type="button"
              className="btn btn-sm px-3 fw-medium text-white d-flex align-items-center gap-1.5"
              style={{ backgroundColor: "#006B3C" }}
              onClick={onNavigateCreate}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>Create Ticket</span>
            </button>
          </div>

          {currentRequester ? (
            <p className="text-muted mb-4">
              Active Requester: <strong>{currentRequester.name}</strong> ({currentRequester.department})
            </p>
          ) : (
            <p className="text-muted mb-4">Please select a requester identity to proceed.</p>
          )}

          <div className="border-top pt-3">
            <h3 className="h6 text-muted mb-3">System Health & Catalog Status</h3>
            <button
              className="btn mb-3"
              style={{ backgroundColor: "#006B3C", color: "#FFFFFF" }}
              onClick={handleCheck}
              disabled={state === "loading"}
            >
              {state === "loading" ? "Loading…" : "Check System"}
            </button>

            {state === "success" && (
              <div
                className="alert alert-success"
                style={{ backgroundColor: "#EAF6EF", borderColor: "#A7F3D0", color: "#065F46" }}
              >
                <div className="fw-bold">Status: Online</div>
                <ul className="mb-0 mt-2">
                  {categories.map((cat) => (
                    <li key={cat.id}>{cat.name}</li>
                  ))}
                </ul>
              </div>
            )}

            {state === "error" && (
              <div
                className="alert alert-danger"
                style={{ backgroundColor: "#FEE2E2", borderColor: "#EF4444", color: "#991B1B" }}
              >
                <div className="fw-bold mb-1">Status: Offline</div>
                <div>{errorMessage || "Backend is unavailable."}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface AppBodyProps {
  currentView: AppView;
  navigateTo: (view: AppView) => void;
}

function AppBody({ currentView, navigateTo }: AppBodyProps) {
  const { currentRequester, isSelectorOpen, error } = useRequester();

  if (!currentRequester || isSelectorOpen || Boolean(error)) {
    return <RequesterSelectorModal />;
  }

  if (currentView === "create-ticket") {
    return <CreateTicket onCancel={() => navigateTo("portal")} />;
  }

  return <MainContent onNavigateCreate={() => navigateTo("create-ticket")} />;
}

export default function App() {
  const [currentView, setCurrentView] = useState<AppView>(getInitialView);

  const navigateTo = useCallback((view: AppView) => {
    setCurrentView(view);
    if (typeof window !== "undefined") {
      const targetPath = view === "create-ticket" ? "/tickets/new" : "/";
      if (window.location.pathname !== targetPath) {
        window.history.pushState({}, "", targetPath);
      }
    }
  }, []);

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
    <RequesterProvider>
      <div style={{ minHeight: "100vh", backgroundColor: "#F5F7F6" }}>
        <Header currentView={currentView} onNavigate={navigateTo} />
        <main>
          <AppBody currentView={currentView} navigateTo={navigateTo} />
        </main>
      </div>
    </RequesterProvider>
  );
}
