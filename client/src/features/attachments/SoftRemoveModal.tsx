import React from "react";
import { Attachment } from "../../api.js";

export interface SoftRemoveModalProps {
  attachment: Attachment;
  removalReason: string;
  removalError: string | null;
  isRemoving: boolean;
  onReasonChange: (reason: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}

export const SoftRemoveModal: React.FC<SoftRemoveModalProps> = ({
  attachment,
  removalReason,
  removalError,
  isRemoving,
  onReasonChange,
  onConfirm,
  onClose,
}) => {
  return (
    <div
      className="modal d-block"
      tabIndex={-1}
      role="dialog"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.5)", zIndex: 1060 }}
    >
      <div className="modal-dialog modal-dialog-centered" role="document">
        <div
          className="modal-content shadow-lg border-0"
          style={{ borderRadius: "8px", overflow: "hidden" }}
        >
          {/* Modal Header */}
          <div className="modal-header border-bottom py-3 px-4" style={{ backgroundColor: "#F8FAFC" }}>
            <h5 className="modal-title h6 fw-bold mb-0" style={{ color: "#1C2D27" }}>
              Remove Attachment
            </h5>
            <button
              type="button"
              className="btn-close"
              onClick={onClose}
              disabled={isRemoving}
              aria-label="Close"
            />
          </div>

          {/* Modal Body */}
          <div className="modal-body p-4">
            <p className="text-muted mb-3" style={{ fontSize: "0.925rem" }}>
              Are you sure you want to remove{" "}
              <strong className="text-dark">{attachment.originalFileName}</strong>?
              This file will no longer be downloadable.
            </p>

            <div className="mb-3">
              <label
                htmlFor="removalReason"
                className="form-label fw-medium small mb-1"
                style={{ color: "#1C2D27" }}
              >
                Reason for removal <span className="text-danger">*</span>
              </label>
              <textarea
                id="removalReason"
                rows={3}
                className={`form-control ${removalError ? "is-invalid" : ""}`}
                placeholder="e.g. Contains sensitive personal data / uploaded wrong file"
                value={removalReason}
                onChange={(e) => onReasonChange(e.target.value)}
                disabled={isRemoving}
                maxLength={255}
                style={{
                  borderColor: removalError ? "#EF4444" : "#D1D5DB",
                  boxShadow: removalError ? "0 0 0 3px rgba(239, 68, 68, 0.15)" : undefined,
                }}
              />
              {removalError && (
                <div className="text-danger small mt-1" style={{ color: "#991B1B" }}>
                  {removalError}
                </div>
              )}
              <div className="d-flex justify-content-end text-muted small mt-1">
                {removalReason.length}/255
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="modal-footer border-top py-2.5 px-4 bg-light d-flex justify-content-end gap-2">
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary fw-medium px-3"
              onClick={onClose}
              disabled={isRemoving}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-sm fw-medium px-3 text-white d-inline-flex align-items-center justify-content-center gap-2"
              style={{ backgroundColor: "#DC2626", borderColor: "#DC2626", minHeight: "36px" }}
              onClick={onConfirm}
              disabled={isRemoving}
            >
              {isRemoving ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" />
                  <span>Removing…</span>
                </>
              ) : (
                <span>Confirm Soft Removal</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
