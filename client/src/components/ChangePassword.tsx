import React, { useState, useMemo } from "react";
import { ApiError } from "../api.js";
import { useAuth } from "../context/AuthContext.js";

interface ChangePasswordProps {
  onSuccess?: () => void;
}

function EyeToggleIcon({ isVisible }: { isVisible: boolean }) {
  return isVisible ? (
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
  );
}

export const ChangePassword: React.FC<ChangePasswordProps> = ({ onSuccess }) => {
  const auth = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Live checklist evaluations per BR-07
  const isLengthValid = useMemo(() => newPassword.length >= 8, [newPassword]);
  const isCaseValid = useMemo(
    () => /[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword),
    [newPassword]
  );
  const isNumSpecialValid = useMemo(
    () => /[0-9]/.test(newPassword) && /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(newPassword),
    [newPassword]
  );

  const isAllValid = isLengthValid && isCaseValid && isNumSpecialValid;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setValidationError(null);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setValidationError("All password fields are required.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setValidationError("Passwords do not match.");
      return;
    }

    if (!isAllValid) {
      setValidationError("Please satisfy all password complexity requirements.");
      return;
    }

    setLoading(true);

    try {
      await auth.changePassword(currentPassword, newPassword, confirmPassword);
      onSuccess?.();
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message);
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("Unable to change password. Please try again.");
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
          maxWidth: "440px",
          backgroundColor: "#FFFFFF",
          borderRadius: "8px",
          borderColor: "#E2E8F0",
        }}
      >
        {/* Brand and Header */}
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
            Change Your Password
          </h1>
          <p className="text-muted small mb-0" style={{ color: "#52665D" }}>
            You must change your password to continue.
          </p>
        </div>

        {/* Global Error Alert */}
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
          {/* Current Password */}
          <div className="mb-3">
            <label
              htmlFor="currentPassword"
              className="form-label fw-semibold small"
              style={{ color: "#1C2D27" }}
            >
              Current (temporary) password <span className="text-danger">*</span>
            </label>
            <div className="position-relative">
              <input
                id="currentPassword"
                aria-label="Current (temporary) password"
                type={showCurrent ? "text" : "password"}
                className="form-control pe-5"
                placeholder="••••••••"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                disabled={loading}
                required
                style={{ borderColor: "#D1D5DB", fontSize: "0.95rem" }}
              />
              <button
                type="button"
                className="btn btn-link position-absolute end-0 top-50 translate-middle-y text-muted pe-3 text-decoration-none"
                onClick={() => setShowCurrent((prev) => !prev)}
                tabIndex={-1}
                aria-label={showCurrent ? "Hide current password" : "Show current password"}
                style={{ color: "#52665D" }}
              >
                <EyeToggleIcon isVisible={showCurrent} />
              </button>
            </div>
          </div>

          {/* New Password */}
          <div className="mb-3">
            <label
              htmlFor="newPassword"
              className="form-label fw-semibold small"
              style={{ color: "#1C2D27" }}
            >
              New password <span className="text-danger">*</span>
            </label>
            <div className="position-relative">
              <input
                id="newPassword"
                aria-label="New password"
                type={showNew ? "text" : "password"}
                className="form-control pe-5"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={loading}
                required
                style={{ borderColor: "#D1D5DB", fontSize: "0.95rem" }}
              />
              <button
                type="button"
                className="btn btn-link position-absolute end-0 top-50 translate-middle-y text-muted pe-3 text-decoration-none"
                onClick={() => setShowNew((prev) => !prev)}
                tabIndex={-1}
                aria-label={showNew ? "Hide new password" : "Show new password"}
                style={{ color: "#52665D" }}
              >
                <EyeToggleIcon isVisible={showNew} />
              </button>
            </div>
          </div>

          {/* Confirm New Password */}
          <div className="mb-3">
            <label
              htmlFor="confirmPassword"
              className="form-label fw-semibold small"
              style={{ color: "#1C2D27" }}
            >
              Confirm new password <span className="text-danger">*</span>
            </label>
            <div className="position-relative">
              <input
                id="confirmPassword"
                aria-label="Confirm new password"
                type={showConfirm ? "text" : "password"}
                className="form-control pe-5"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
                required
                style={{ borderColor: "#D1D5DB", fontSize: "0.95rem" }}
              />
              <button
                type="button"
                className="btn btn-link position-absolute end-0 top-50 translate-middle-y text-muted pe-3 text-decoration-none"
                onClick={() => setShowConfirm((prev) => !prev)}
                tabIndex={-1}
                aria-label={showConfirm ? "Hide confirm password" : "Show confirm password"}
                style={{ color: "#52665D" }}
              >
                <EyeToggleIcon isVisible={showConfirm} />
              </button>
            </div>
          </div>

          {/* Validation Feedback */}
          {validationError && (
            <div className="alert alert-danger p-2 mb-3 small" role="alert">
              {validationError}
            </div>
          )}

          {/* Live Complexity Checklist */}
          <div
            className="p-3 mb-4 rounded-3 border"
            style={{ backgroundColor: "#F9FAFB", borderColor: "#E5E7EB" }}
          >
            <span className="fw-semibold small d-block mb-2" style={{ color: "#1C2D27" }}>
              Password must:
            </span>
            <ul className="list-unstyled mb-0 small" style={{ fontSize: "0.85rem" }}>
              <li
                className="d-flex align-items-center gap-2 mb-1"
                data-satisfied={isLengthValid ? "true" : "false"}
                style={{ color: isLengthValid ? "#059669" : "#52665D" }}
              >
                <span>{isLengthValid ? "✓" : "○"}</span>
                <span data-satisfied={isLengthValid ? "true" : "false"}>
                  Be at least 8 characters
                </span>
              </li>
              <li
                className="d-flex align-items-center gap-2 mb-1"
                data-satisfied={isCaseValid ? "true" : "false"}
                style={{ color: isCaseValid ? "#059669" : "#52665D" }}
              >
                <span>{isCaseValid ? "✓" : "○"}</span>
                <span data-satisfied={isCaseValid ? "true" : "false"}>
                  Include upper and lower case letters
                </span>
              </li>
              <li
                className="d-flex align-items-center gap-2"
                data-satisfied={isNumSpecialValid ? "true" : "false"}
                style={{ color: isNumSpecialValid ? "#059669" : "#52665D" }}
              >
                <span>{isNumSpecialValid ? "✓" : "○"}</span>
                <span data-satisfied={isNumSpecialValid ? "true" : "false"}>
                  Include a number and a special character
                </span>
              </li>
            </ul>
          </div>

          {/* Action Button */}
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
                <span>Updating Password…</span>
              </>
            ) : (
              <span>Continue</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
