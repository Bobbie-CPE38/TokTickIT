import { useState } from "react";
import { checkSystem, Category } from "./api.js";
import { RequesterProvider, useRequester } from "./context/RequesterContext.js";
import { Header } from "./components/Header.js";
import { RequesterSelectorModal } from "./components/RequesterSelectorModal.js";

type UiState = "idle" | "loading" | "success" | "error";

function MainContent() {
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
    <div className="container py-4" style={{ maxWidth: 800 }}>
      <div className="card shadow-sm border-0 mb-4" style={{ backgroundColor: "#FFFFFF" }}>
        <div className="card-body p-4">
          <h2 className="h4 mb-3" style={{ color: "#1C2D27" }}>
            IT Service Desk Portal
          </h2>
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

export default function App() {
  return (
    <RequesterProvider>
      <div style={{ minHeight: "100vh", backgroundColor: "#F5F7F6" }}>
        <Header />
        <main>
          <MainContent />
        </main>
        <RequesterSelectorModal />
      </div>
    </RequesterProvider>
  );
}

