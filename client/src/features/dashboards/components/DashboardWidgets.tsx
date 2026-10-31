import React, { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { Priority, TicketStatus } from "../../../api.js";
import { StatusBadge } from "../../../components/common/StatusBadge.js";
import { PriorityBadge } from "../../../components/common/PriorityBadge.js";
import { useRouter } from "../../../core/router/RouterContext.js";
import { formatShortDateTime } from "../../../core/utils/formatters.js";

const CARD_STYLE: React.CSSProperties = {
  backgroundColor: "#FFFFFF",
  border: "1px solid #E2E8F0",
  borderRadius: "8px",
  boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.08), 0 1px 2px -1px rgba(0, 0, 0, 0.05)",
};

/**
 * Loads dashboard data with loading, refreshing (busy lock, BR-18), and safe-failure states.
 */
export function useDashboardData<T>(loader: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const load = useCallback(
    async (isRefresh: boolean) => {
      const requestId = ++requestIdRef.current;
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const result = await loader();
        if (requestId === requestIdRef.current) setData(result);
      } catch (err) {
        if (requestId === requestIdRef.current) {
          setError(err instanceof Error ? err.message : "Unable to load dashboard.");
        }
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [loader]
  );

  useEffect(() => {
    load(false);
  }, [load]);

  return { data, loading, refreshing, error, reload: () => load(data !== null) };
}

/**
 * Anchor that performs client-side navigation while keeping a real href for accessibility.
 */
export const DashboardLink: React.FC<{
  to: string;
  className?: string;
  style?: React.CSSProperties;
  ariaLabel?: string;
  children: ReactNode;
}> = ({ to, className, style, ariaLabel, children }) => {
  const { navigateTo } = useRouter();
  return (
    <a
      href={to}
      className={className}
      style={style}
      aria-label={ariaLabel}
      onClick={(e) => {
        e.preventDefault();
        navigateTo(to);
      }}
    >
      {children}
    </a>
  );
};

export const DashboardHeader: React.FC<{
  title: string;
  subtitle: string;
  onRefresh?: () => void;
  refreshing?: boolean;
  children?: ReactNode;
}> = ({ title, subtitle, onRefresh, refreshing = false, children }) => (
  <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
    <div className="min-w-0">
      <h1 className="mb-1 fw-semibold" style={{ fontSize: "1.5rem", color: "#1C2D27" }}>
        {title}
      </h1>
      <p className="mb-0" style={{ fontSize: "0.875rem", color: "#52665D" }}>
        {subtitle}
      </p>
      {children}
    </div>
    {onRefresh && (
      <button
        type="button"
        className="btn d-inline-flex align-items-center gap-2 fw-medium"
        style={{
          backgroundColor: "#FFFFFF",
          color: "#006B3C",
          border: "1px solid #006B3C",
          borderRadius: "6px",
          minHeight: "44px",
        }}
        onClick={onRefresh}
        disabled={refreshing}
        aria-busy={refreshing}
      >
        {refreshing ? (
          <span className="spinner-border spinner-border-sm" aria-hidden="true" />
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
        )}
        {refreshing ? "Refreshing…" : "Refresh"}
      </button>
    )}
  </div>
);

/**
 * Day-over-day trend pill (ui-spec 2.2): green for growth, gray for reduction or no change.
 */
export const TrendBadge: React.FC<{ delta: number }> = ({ delta }) => {
  const positive = delta > 0;
  const text = delta === 0 ? "No change from yesterday" : `${positive ? "+" : ""}${delta} from yesterday`;
  return (
    <span
      className="badge rounded-pill fw-medium"
      data-testid="trend-badge"
      style={{
        backgroundColor: positive ? "#D1FAE5" : "#F3F4F6",
        color: positive ? "#065F46" : "#4B5563",
        fontSize: "0.75rem",
        whiteSpace: "normal",
        textAlign: "left",
      }}
    >
      <span aria-hidden="true">{positive ? "▲ " : delta < 0 ? "▼ " : ""}</span>
      {text}
    </span>
  );
};

/**
 * KPI card: the whole card is a drill-down link (FR-17, FR-20).
 */
export const MetricCard: React.FC<{
  label: string;
  value: number;
  to: string;
  linkLabel: string;
  trend?: number;
  footer?: ReactNode;
}> = ({ label, value, to, linkLabel, trend, footer }) => (
  <DashboardLink
    to={to}
    ariaLabel={`${label}: ${value}. ${linkLabel}`}
    className="dashboard-metric-card d-flex flex-column h-100 p-3 text-decoration-none"
    style={{ ...CARD_STYLE, color: "#1C2D27", minHeight: "128px" }}
  >
    <span className="fw-medium" style={{ fontSize: "0.875rem", color: "#52665D" }}>
      {label}
    </span>
    <span className="fw-bold my-2" style={{ fontSize: "2rem", lineHeight: 1.15 }} data-testid="metric-value">
      {value}
    </span>
    <span className="mt-auto">
      {trend !== undefined ? (
        <TrendBadge delta={trend} />
      ) : (
        footer ?? (
          <span className="fw-medium" style={{ fontSize: "0.8rem", color: "#0B7A46" }}>
            View all
          </span>
        )
      )}
    </span>
  </DashboardLink>
);

export interface DashboardTicketItem {
  id: number;
  ticketNumber: string;
  summary: string;
  status: TicketStatus;
  priority?: Priority;
  attentionRequired?: boolean;
  updatedAt: string;
  to: string;
}

export const DashboardTicketList: React.FC<{
  title: string;
  viewAllTo: string;
  items: DashboardTicketItem[];
  emptyText: string;
}> = ({ title, viewAllTo, items, emptyText }) => (
  <section className="h-100 p-3" style={CARD_STYLE} aria-labelledby="dashboard-recent-heading">
    <div className="d-flex justify-content-between align-items-center mb-2">
      <h2 id="dashboard-recent-heading" className="mb-0 fw-semibold" style={{ fontSize: "1rem", color: "#1C2D27" }}>
        {title}
      </h2>
      <DashboardLink
        to={viewAllTo}
        ariaLabel={`View all tickets for ${title}`}
        className="fw-medium text-decoration-none d-inline-flex align-items-center px-2"
        style={{ fontSize: "0.875rem", color: "#0B7A46", minHeight: "44px" }}
      >
        View all
      </DashboardLink>
    </div>

    {items.length === 0 ? (
      <div className="text-center py-4" style={{ color: "#52665D" }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
        <p className="mb-0 mt-2" style={{ fontSize: "0.875rem" }}>
          {emptyText}
        </p>
      </div>
    ) : (
      <ul className="list-unstyled mb-0">
        {items.map((t) => (
          <li
            key={t.id}
            className="dashboard-ticket-row position-relative py-2 px-2"
            style={{ borderTop: "1px solid #E2E8F0" }}
            data-testid="dashboard-ticket-row"
          >
            <div className="d-flex flex-wrap justify-content-between align-items-start gap-2">
              <div className="min-w-0" style={{ flex: "1 1 220px" }}>
                <DashboardLink
                  to={t.to}
                  className="fw-semibold text-decoration-none d-inline-flex align-items-center stretched-link"
                  style={{ color: "#0B7A46", fontSize: "0.875rem", minHeight: "32px" }}
                >
                  {t.ticketNumber}
                </DashboardLink>
                <div className="text-truncate" style={{ fontSize: "0.875rem", color: "#1C2D27" }} title={t.summary}>
                  {t.summary}
                </div>
              </div>
              <div className="d-flex flex-wrap align-items-center gap-2 justify-content-end">
                {t.attentionRequired && (
                  <span
                    className="badge rounded-pill fw-semibold"
                    style={{
                      backgroundColor: "#FEF3C7",
                      color: "#B45309",
                      border: "1px solid #FDE68A",
                      fontSize: "0.75rem",
                    }}
                  >
                    <span aria-hidden="true">⚠ </span>Attention Required
                  </span>
                )}
                {t.priority && <PriorityBadge priority={t.priority} size="sm" />}
                <StatusBadge status={t.status} size="sm" />
                <span style={{ fontSize: "0.75rem", color: "#52665D", whiteSpace: "nowrap" }}>
                  {formatShortDateTime(t.updatedAt)}
                </span>
              </div>
            </div>
          </li>
        ))}
      </ul>
    )}
  </section>
);

export interface QuickAction {
  icon: string;
  label: string;
  description: string;
  to: string;
}

export const QuickActions: React.FC<{ actions: QuickAction[] }> = ({ actions }) => (
  <section className="h-100 p-3" style={CARD_STYLE} aria-labelledby="dashboard-quick-actions-heading">
    <h2 id="dashboard-quick-actions-heading" className="mb-3 fw-semibold" style={{ fontSize: "1rem", color: "#1C2D27" }}>
      Quick Actions
    </h2>
    <div className="d-flex flex-column gap-2">
      {actions.map((a) => (
        <DashboardLink
          key={a.label}
          to={a.to}
          className="dashboard-quick-action d-flex align-items-center gap-3 p-2 text-decoration-none"
          style={{ border: "1px solid #E2E8F0", borderRadius: "6px", color: "#1C2D27", minHeight: "56px" }}
        >
          <span
            aria-hidden="true"
            className="d-inline-flex align-items-center justify-content-center flex-shrink-0 fw-bold"
            style={{ width: "36px", height: "36px", borderRadius: "6px", backgroundColor: "#EAF6EF", color: "#006B3C" }}
          >
            {a.icon}
          </span>
          <span className="min-w-0">
            <span className="d-block fw-semibold" style={{ fontSize: "0.875rem", color: "#006B3C" }}>
              {a.label}
            </span>
            <span className="d-block" style={{ fontSize: "0.75rem", color: "#52665D" }}>
              {a.description}
            </span>
          </span>
        </DashboardLink>
      ))}
    </div>
  </section>
);

export const DashboardLoading: React.FC = () => (
  <div className="d-flex justify-content-center align-items-center py-5">
    <div className="spinner-border" style={{ color: "#006B3C" }} role="status">
      <span className="visually-hidden">Loading dashboard...</span>
    </div>
  </div>
);

export const DashboardError: React.FC<{ message: string; onRetry: () => void }> = ({ message, onRetry }) => (
  <div
    className="d-flex flex-wrap justify-content-between align-items-center gap-2 p-3 mb-3"
    role="alert"
    style={{ backgroundColor: "#FEE2E2", border: "1px solid #EF4444", borderRadius: "6px", color: "#991B1B" }}
  >
    <span style={{ fontSize: "0.875rem" }}>{message}</span>
    <button
      type="button"
      className="btn btn-sm fw-medium"
      style={{ backgroundColor: "#FFFFFF", color: "#991B1B", border: "1px solid #EF4444", minHeight: "36px" }}
      onClick={onRetry}
    >
      Retry
    </button>
  </div>
);

/**
 * Page container shared by all role dashboards (zero horizontal overflow, ui-spec 9.3).
 */
export const DashboardPage: React.FC<{ children: ReactNode; testId: string }> = ({ children, testId }) => (
  <div className="container-lg py-4 px-3" style={{ overflowX: "hidden" }} data-testid={testId}>
    <style>{`
      .dashboard-metric-card, .dashboard-quick-action { transition: box-shadow 0.15s ease, border-color 0.15s ease; }
      .dashboard-metric-card:hover, .dashboard-quick-action:hover {
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.06) !important;
        border-color: #0B7A46 !important;
      }
      [data-testid="${testId}"] a:focus-visible, [data-testid="${testId}"] button:focus-visible {
        outline: none;
        box-shadow: 0 0 0 3px rgba(11, 122, 70, 0.2) !important;
        border-color: #0B7A46 !important;
      }
      [data-testid="${testId}"] .min-w-0 { min-width: 0; }
    `}</style>
    {children}
  </div>
);
