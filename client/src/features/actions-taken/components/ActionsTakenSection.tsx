import React, { useState, useEffect, useCallback } from "react";
import { ActionTaken } from "../types.js";
import { fetchActionsTaken } from "../api.js";
import { ActionTakenCard } from "./ActionTakenCard.js";
import { ActionTakenForm } from "./ActionTakenForm.js";

export interface ActionsTakenSectionProps {
  ticketId: number;
  readOnly?: boolean;
  initialActions?: ActionTaken[];
  onActionsChange?: (actions: ActionTaken[]) => void;
  embedded?: boolean;
}

export const ActionsTakenSection: React.FC<ActionsTakenSectionProps> = ({
  ticketId,
  readOnly = false,
  initialActions,
  onActionsChange,
  embedded = false,
}) => {
  const [actions, setActions] = useState<ActionTaken[]>(initialActions || []);
  const [loading, setLoading] = useState<boolean>(!initialActions);
  const [error, setError] = useState<string | null>(null);

  const [isCreateMode, setIsCreateMode] = useState<boolean>(false);
  const [editingActionId, setEditingActionId] = useState<number | null>(null);

  const loadActions = useCallback(async () => {
    if (!ticketId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchActionsTaken(ticketId);
      // Ensure stable chronological ordering by actionDateTime / createdAt ascending (BR-08)
      const sorted = [...data].sort(
        (a, b) =>
          new Date(a.actionDateTime || a.createdAt).getTime() -
          new Date(b.actionDateTime || b.createdAt).getTime()
      );
      setActions(sorted);
      if (onActionsChange) {
        onActionsChange(sorted);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load actions taken.");
    } finally {
      setLoading(false);
    }
  }, [ticketId, onActionsChange]);

  useEffect(() => {
    loadActions();
  }, [loadActions]);

  const handleCreateSuccess = (newAction: ActionTaken) => {
    setActions((prev) => {
      const updated = [...prev, newAction].sort(
        (a, b) =>
          new Date(a.actionDateTime || a.createdAt).getTime() -
          new Date(b.actionDateTime || b.createdAt).getTime()
      );
      if (onActionsChange) onActionsChange(updated);
      return updated;
    });
    setIsCreateMode(false);
  };

  const handleUpdateSuccess = (updatedAction: ActionTaken) => {
    setActions((prev) => {
      const updated = prev
        .map((a) => (a.id === updatedAction.id ? updatedAction : a))
        .sort(
          (a, b) =>
            new Date(a.actionDateTime || a.createdAt).getTime() -
            new Date(b.actionDateTime || b.createdAt).getTime()
        );
      if (onActionsChange) onActionsChange(updated);
      return updated;
    });
    setEditingActionId(null);
  };

  const content = (
    <>
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3 pb-2 border-bottom">
        <h4 className="mb-0 fw-semibold" style={{ color: "#1C2D27", fontSize: "1.1rem" }}>
          Actions Taken ({actions.length})
        </h4>

        {!readOnly && !isCreateMode && (
          <button
            type="button"
            className="btn btn-sm px-3 fw-semibold text-white d-inline-flex align-items-center"
            style={{
              backgroundColor: "#006B3C",
              borderColor: "#006B3C",
              borderRadius: "6px",
              minHeight: "38px",
            }}
            onClick={() => {
              setIsCreateMode(true);
              setEditingActionId(null);
            }}
          >
            + Record Action Taken
          </button>
        )}
      </div>

      {error && (
        <div
          className="alert alert-danger py-2 px-3 small mb-3"
          role="alert"
          style={{ backgroundColor: "#FEE2E2", borderColor: "#EF4444", color: "#991B1B" }}
        >
          {error}
        </div>
      )}

      {/* Create Mode Form */}
      {isCreateMode && (
        <ActionTakenForm
          ticketId={ticketId}
          onSuccess={handleCreateSuccess}
          onCancel={() => setIsCreateMode(false)}
        />
      )}

      {/* Loading state */}
      {loading && actions.length === 0 ? (
        <div className="text-center py-4 text-muted">
          <span className="spinner-border spinner-border-sm me-2" role="status" />
          Loading actions taken...
        </div>
      ) : actions.length === 0 && !isCreateMode ? (
        /* Empty State */
        <div
          className="text-center py-4 px-3 rounded border border-dashed"
          style={{
            borderColor: "#CBD5E1",
            backgroundColor: "#F8FAF9",
            color: "#52665D",
          }}
        >
          <p className="mb-0 small fw-medium">
            No actions have been recorded for this ticket yet.
          </p>
        </div>
      ) : (
        /* List Mode */
        <div className="actions-taken-list">
          {actions.map((action) => {
            if (editingActionId === action.id) {
              return (
                <ActionTakenForm
                  key={action.id}
                  ticketId={ticketId}
                  action={action}
                  onSuccess={handleUpdateSuccess}
                  onCancel={() => setEditingActionId(null)}
                />
              );
            }

            return (
              <ActionTakenCard
                key={action.id}
                action={action}
                readOnly={readOnly}
                onEdit={() => {
                  setEditingActionId(action.id);
                  setIsCreateMode(false);
                }}
              />
            );
          })}
        </div>
      )}
    </>
  );

  if (embedded) {
    return <div className="actions-taken-section">{content}</div>;
  }

  return (
    <div
      className="card shadow-sm border-0 mb-4"
      style={{ borderRadius: "8px", backgroundColor: "#FFFFFF" }}
    >
      <div className="card-body p-3 p-md-4">
        {content}
      </div>
    </div>
  );
};
