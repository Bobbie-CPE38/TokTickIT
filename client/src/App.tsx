import { useState, useEffect, useCallback } from "react";
import { checkSystem, Category } from "./api.js";
import { RequesterProvider, useRequester } from "./context/RequesterContext.js";
import { Header } from "./components/Header.js";
import { RequesterSelectorModal } from "./components/RequesterSelectorModal.js";
import { CreateTicket } from "./components/CreateTicket.js";
import { MyTickets } from "./components/MyTickets.js";

type UiState = "idle" | "loading" | "success" | "error";
export type AppView = "portal" | "create-ticket" | "my-tickets";

function getInitialView(): AppView {
  if (typeof window !== "undefined") {
    const path = window.location.pathname;
    if (path.startsWith("/tickets/new")) {
      return "create-ticket";
    }
    if (path.startsWith("/tickets")) {
      return "my-tickets";
    }
  }
  return "my-tickets";
}

function SystemHealthSection() {
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
    <div className="container pb-5" style={{ maxWidth: "1200px" }}>
      <div className="card shadow-sm border p-3 bg-white" style={{ borderColor: "#E2E8F0", borderRadius: "8px" }}>
        <div className="d-flex justify-content-between align-items-center mb-2">
          <span className="small text-muted fw-medium">System Health & Catalog Status</span>
          <button
            type="button"
            className="btn btn-sm px-3"
            style={{ backgroundColor: "#006B3C", color: "#FFFFFF" }}
            onClick={handleCheck}
            disabled={state === "loading"}
          >
            {state === "loading" ? "Loading…" : "Check System"}
          </button>
        </div>

        {state === "success" && (
          <div
            className="alert alert-success mt-2 mb-0"
            style={{ backgroundColor: "#EAF6EF", borderColor: "#A7F3D0", color: "#065F46" }}
          >
            <div className="fw-bold">Status: Online</div>
            <ul className="mb-0 mt-1">
              {categories.map((cat) => (
                <li key={cat.id}>{cat.name}</li>
              ))}
            </ul>
          </div>
        )}

        {state === "error" && (
          <div
            className="alert alert-danger mt-2 mb-0"
            style={{ backgroundColor: "#FEE2E2", borderColor: "#EF4444", color: "#991B1B" }}
          >
            <div className="fw-bold mb-1">Status: Offline</div>
            <div>{errorMessage || "Backend is unavailable."}</div>
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
  const { currentRequester, isSelectorOpen, error } = useRequester();

  if (!currentRequester || isSelectorOpen || Boolean(error)) {
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

export default function App() {
  const [currentView, setCurrentView] = useState<AppView>(getInitialView);

  const navigateTo = useCallback((view: AppView) => {
    setCurrentView(view);
    if (typeof window !== "undefined") {
      const targetPath =
        view === "create-ticket" ? "/tickets/new" : view === "my-tickets" ? "/tickets" : "/";
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
