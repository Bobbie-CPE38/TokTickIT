import React from "react";
import { OperationalMetrics, OperationalTrends, StaffDashboardTicket } from "../types.js";
import { DashboardLink, DashboardTicketItem, DashboardTicketList, MetricCard } from "./DashboardWidgets.js";

/**
 * The 5 queue KPI cards (ui-spec 5.2). Responsive: 5-across desktop, 3+2 tablet, 2-column mobile.
 */
export const OperationalMetricCards: React.FC<{
  metrics: OperationalMetrics;
  trends: OperationalTrends;
}> = ({ metrics, trends }) => {
  const cards = [
    { label: "New", value: metrics.new, trend: trends.newDelta, to: "/queue?status=NEW" },
    { label: "Open", value: metrics.open, trend: trends.openDelta, to: "/queue?status=OPEN" },
    { label: "In Progress", value: metrics.inProgress, trend: trends.inProgressDelta, to: "/queue?status=IN_PROGRESS" },
    {
      label: "Waiting for Requester",
      value: metrics.waitingForRequester,
      trend: trends.waitingForRequesterDelta,
      to: "/queue?status=WAITING_FOR_REQUESTER",
    },
    { label: "My Assigned", value: metrics.myAssigned, trend: trends.myAssignedDelta, to: "/queue?owner=me" },
  ];

  return (
    <div className="row g-3 mb-3">
      {cards.map((c, i) => (
        <div key={c.label} className={i < 3 ? "col-6 col-md-4 col-lg" : i === 3 ? "col-6 col-md-6 col-lg" : "col-12 col-md-6 col-lg"}>
          <MetricCard label={c.label} value={c.value} trend={c.trend} to={c.to} linkLabel="Open filtered queue" />
        </div>
      ))}
    </div>
  );
};

/**
 * Secondary queue stats (ui-spec 5.2 item 6): unassigned drill-down and personal action volume.
 */
export const QueueStatsBar: React.FC<{ metrics: OperationalMetrics }> = ({ metrics }) => (
  <p className="mt-2 mb-0 d-flex flex-wrap align-items-center gap-2" style={{ fontSize: "0.875rem", color: "#52665D" }}>
    <DashboardLink
      to="/queue?owner=unassigned"
      ariaLabel={`Unassigned: ${metrics.unassigned}. Open unassigned queue`}
      className="fw-medium text-decoration-none d-inline-flex align-items-center"
      style={{ color: "#0B7A46", minHeight: "32px" }}
    >
      Unassigned: {metrics.unassigned}
    </DashboardLink>
    <span aria-hidden="true">|</span>
    <span>My Actions Recorded: {metrics.myActionsCount}</span>
  </p>
);

/**
 * Urgent tickets pinned first, then recently updated tickets, de-duplicated (ui-spec 5.3).
 */
export function toRecentAndUrgentItems(
  urgent: StaffDashboardTicket[],
  recent: StaffDashboardTicket[]
): DashboardTicketItem[] {
  const seen = new Set<number>();
  return [...urgent, ...recent]
    .filter((t) => (seen.has(t.id) ? false : (seen.add(t.id), true)))
    .map((t) => ({
      id: t.id,
      ticketNumber: t.ticketNumber,
      summary: t.summary,
      status: t.currentStatus,
      priority: t.itPriority === "HIGH" || t.itPriority === "URGENT" ? t.itPriority : undefined,
      updatedAt: t.updatedAt,
      to: `/queue/${t.id}`,
    }));
}

export const RecentAndUrgentTickets: React.FC<{
  urgent: StaffDashboardTicket[];
  recent: StaffDashboardTicket[];
}> = ({ urgent, recent }) => (
  <DashboardTicketList
    title="My Recent & Urgent Tickets"
    viewAllTo="/queue"
    items={toRecentAndUrgentItems(urgent, recent)}
    emptyText="No recent tickets to display."
  />
);
