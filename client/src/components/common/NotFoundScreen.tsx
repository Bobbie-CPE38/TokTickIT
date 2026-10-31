import React from "react";

export interface NotFoundScreenProps {
  onGoHome: () => void;
}

export function NotFoundScreen({ onGoHome }: NotFoundScreenProps) {
  return (
    <div className="container py-5" data-testid="not-found-screen">
      <div
        className="card border-0 shadow-sm p-4 p-md-5 mx-auto text-center"
        style={{ maxWidth: "520px", backgroundColor: "#FFFFFF", borderRadius: "8px", border: "1px solid #E2E8F0" }}
      >
        <h1 className="h4 fw-semibold mb-2" style={{ color: "#1C2D27" }}>
          Page not found
        </h1>
        <p className="mb-4" style={{ color: "#52665D" }}>
          The page you're looking for doesn't exist or may have been moved.
        </p>
        <div>
          <button
            type="button"
            className="btn text-white px-4"
            style={{ backgroundColor: "#006B3C", minHeight: "44px" }}
            onClick={onGoHome}
          >
            Go to home
          </button>
        </div>
      </div>
    </div>
  );
}
