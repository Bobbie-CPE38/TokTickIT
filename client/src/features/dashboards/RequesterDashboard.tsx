import React from "react";
import { useAuth } from "../../context/AuthContext.js";
import { fetchRequesterDashboard } from "./api.js";
import {
  DashboardError,
  DashboardHeader,
  DashboardLoading,
  DashboardPage,
  DashboardTicketList,
  MetricCard,
  QuickActions,
  useDashboardData,
} from "./components/DashboardWidgets.js";

const REQUESTER_QUICK_ACTIONS = [
  { icon: "+", label: "Create Ticket", description: "Submit a new request", to: "/tickets/new" },
  { icon: "📄", label: "View My Tickets", description: "Track existing requests", to: "/tickets" },
];

/**
 * Requester Dashboard (FR-15 to FR-17, ui-spec 6). Data is owner-scoped by the backend (BR-13).
 */
export const RequesterDashboard: React.FC = () => {
  const { user } = useAuth();
  const { data, loading, error, reload } = useDashboardData(fetchRequesterDashboard);
  const firstName = user?.name?.split(" ")[0] ?? "there";

  const cards = data
    ? [
        { label: "My Open Tickets", value: data.metrics.myOpenTickets, to: "/tickets?filter=open" },
        { label: "In Progress", value: data.metrics.inProgress, to: "/tickets?status=IN_PROGRESS" },
        { label: "Resolved", value: data.metrics.resolved, to: "/tickets?status=RESOLVED" },
        { label: "Closed", value: data.metrics.closed, to: "/tickets?status=CLOSED" },
      ]
    : [];

  return (
    <DashboardPage testId="requester-dashboard">
      <DashboardHeader title={`Welcome, ${firstName}!`} subtitle="Here's the latest on your requests." />

      {error && <DashboardError message={error} onRetry={reload} />}
      {loading && !data && <DashboardLoading />}

      {data && (
        <>
          {data.metrics.waitingForRequester > 0 && (
            <div
              className="d-flex align-items-center gap-2 p-2 px-3 mb-3"
              role="status"
              style={{
                backgroundColor: "#FEF3C7",
                border: "1px solid #FDE68A",
                borderRadius: "6px",
                color: "#B45309",
                fontSize: "0.875rem",
              }}
            >
              <span aria-hidden="true">⚠</span>
              <span>
                {data.metrics.waitingForRequester === 1
                  ? "1 ticket is waiting for your response."
                  : `${data.metrics.waitingForRequester} tickets are waiting for your response.`}
              </span>
            </div>
          )}

          <div className="row g-3 mb-3">
            {cards.map((c) => (
              <div key={c.label} className="col-6 col-lg-3">
                <MetricCard label={c.label} value={c.value} to={c.to} linkLabel="View all" />
              </div>
            ))}
          </div>

          <div className="row g-3">
            <div className="col-12 col-lg-8">
              <DashboardTicketList
                title="My Recent Tickets"
                viewAllTo="/tickets"
                emptyText="You have not submitted any tickets yet."
                items={data.recentTickets.map((t) => ({
                  id: t.id,
                  ticketNumber: t.ticketNumber,
                  summary: t.summary,
                  status: t.currentStatus,
                  attentionRequired: t.currentStatus === "WAITING_FOR_REQUESTER",
                  updatedAt: t.updatedAt,
                  to: `/tickets/${t.id}`,
                }))}
              />
            </div>
            <div className="col-12 col-lg-4">
              <QuickActions actions={REQUESTER_QUICK_ACTIONS} />
            </div>
          </div>
        </>
      )}
    </DashboardPage>
  );
};

export default RequesterDashboard;
