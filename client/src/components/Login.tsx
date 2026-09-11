import React, { useState } from "react";
import { AuthResponse, login as apiLogin, ApiError } from "../api.js";

interface LoginProps {
  onSuccess?: (auth: AuthResponse) => void;
}

export const Login: React.FC<LoginProps> = ({ onSuccess }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMessage("Please enter both email and password.");
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const result = await apiLogin(email, password);
      onSuccess?.(result);
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message);
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("An unexpected error occurred. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="d-flex align-items-center justify-content-center px-3"
      style={{
        minHeight: "100vh",
        backgroundColor: "#F5F7F6",
      }}
    >
      <div
        className="card border shadow-sm p-4"
        style={{
          width: "100%",
          maxWidth: "420px",
          backgroundColor: "#FFFFFF",
          borderRadius: "8px",
          borderColor: "#E2E8F0",
        }}
      >
        {/* Brand Header */}
        <div className="text-center mb-4">
          <div className="d-inline-flex align-items-center justify-content-center gap-2 mb-2">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#006B3C"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span
              className="fw-bold fs-4"
              style={{ color: "#006B3C", letterSpacing: "-0.02em" }}
            >
              TokTickIT
            </span>
          </div>
          <h1 className="h5 fw-bold mb-1" style={{ color: "#1C2D27" }}>
            Sign in to your account
          </h1>
          <p className="text-muted small mb-0" style={{ color: "#52665D" }}>
            Enter your credentials to access the service desk
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div
            className="alert p-3 mb-3 small d-flex align-items-start gap-2"
            role="alert"
            style={{
              backgroundColor: "#FEE2E2",
              color: "#991B1B",
              border: "1px solid #F87171",
              borderRadius: "6px",
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="flex-shrink-0 mt-0.5"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {/* Email Address */}
          <div className="mb-3">
            <label
              htmlFor="email"
              className="form-label fw-semibold small"
              style={{ color: "#1C2D27" }}
            >
              Email address <span className="text-danger">*</span>
            </label>
            <input
              id="email"
              aria-label="Email address"
              type="email"
              className="form-control"
              placeholder="name@toktickit.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
              style={{
                borderColor: "#D1D5DB",
                fontSize: "0.95rem",
              }}
            />
          </div>

          {/* Password */}
          <div className="mb-4">
            <label
              htmlFor="password"
              className="form-label fw-semibold small"
              style={{ color: "#1C2D27" }}
            >
              Password <span className="text-danger">*</span>
            </label>
            <div className="position-relative">
              <input
                id="password"
                aria-label="Password"
                type={showPassword ? "text" : "password"}
                className="form-control pe-5"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
                style={{
                  borderColor: "#D1D5DB",
                  fontSize: "0.95rem",
                }}
              />
              <button
                type="button"
                className="btn btn-link position-absolute end-0 top-50 translate-middle-y text-muted pe-3 text-decoration-none"
                onClick={() => setShowPassword((prev) => !prev)}
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
                style={{ color: "#52665D" }}
              >
                {showPassword ? (
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="btn w-100 fw-medium d-flex align-items-center justify-content-center gap-2 py-2"
            disabled={loading}
            style={{
              backgroundColor: "#006B3C",
              borderColor: "#006B3C",
              color: "#FFFFFF",
              fontSize: "0.95rem",
              minHeight: "44px",
            }}
          >
            {loading ? (
              <>
                <span
                  className="spinner-border spinner-border-sm"
                  role="status"
                  aria-hidden="true"
                />
                <span>Signing In…</span>
              </>
            ) : (
              <span>Sign In</span>
            )}
          </button>
        </form>

        <div className="mt-4 pt-3 border-top text-center">
          <span className="small text-muted" style={{ color: "#52665D" }}>
            Forgot your password? (Contact your administrator)
          </span>
        </div>
      </div>
    </div>
  );
};
