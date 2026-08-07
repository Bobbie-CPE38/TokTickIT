import { useState } from "react";
import { checkSystem } from "./api.js";

// UI states you must handle for Issue 4: idle, loading, success, error.
type UiState = "idle" | "loading" | "success" | "error";

export default function App() {
  const [state, setState] = useState<UiState>("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");

  async function handleCheck() {
    setState("loading");
    setErrorMessage("");
    try {
      await checkSystem();
      setState("success");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Backend is unavailable.");
      setState("error");
    }
  }

  return (
    <div className="container py-5" style={{ maxWidth: 640 }}>
      <h1 className="h3 mb-4">
        TokTickIT <span className="text-success">IT Service Desk</span>
      </h1>

      <button className="btn btn-success mb-4" onClick={handleCheck} disabled={state === "loading"}>
        {state === "loading" ? "Loading…" : "Check System"}
      </button>

      {state === "success" && (
        <div className="alert alert-success">
          <div className="fw-bold">Status: Online</div>
        </div>
      )}

      {state === "error" && (
        <div className="alert alert-danger">
          <div className="fw-bold mb-1">Status: Offline</div>
          <div>{errorMessage || "Backend is unavailable."}</div>
        </div>
      )}
    </div>
  );
}
