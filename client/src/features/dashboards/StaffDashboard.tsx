import React from "react";
import { useAuth } from "../../context/AuthContext.js";
import { fetchStaffDashboard } from "./api.js";
import {
  DashboardError,
  DashboardHeader,
  DashboardLoading,
  DashboardPage,
  QuickActions,
  useDashboardData,
} from "./components/DashboardWidgets.js";
import {
  OperationalMetricCards,
  QueueStatsBar,
  RecentAndUrgentTickets,
} from "./components/OperationalOverview.js";

export const STAFF_QUICK_ACTIONS = [
  { icon: "+", label: "Create Ticket", description: "Submit a new request", to: "/tickets/new" },
  { icon: "🔍", label: "Search Tickets", description: "Find tickets in queue", to: "/queue?focus=search" },
  { icon: "📋", label: "My Queue", description: "View assigned tickets", to: "/queue?owner=me" },
];

/**
 * IT Staff Dashboard (FR-18 to FR-20, ui-spec 5).
 */
export const StaffDashboard: React.FC = () => {
  const { user } = useAuth();
  const { data, loading, refreshing, error, reload } = useDashboardData(fetchStaffDashboard);
  const firstName = user?.name?.split(" ")[0] ?? "there";

  return (
    <DashboardPage testId="staff-dashboard">
      <DashboardHeader
        title={`Welcome back, ${firstName}!`}
        subtitle="Here's what's happening with your queue today."
        onRefresh={reload}
        refreshing={refreshing}
      >
        {data && <QueueStatsBar metrics={data.metrics} />}
      </DashboardHeader>

      {error && <DashboardError message={error} onRetry={reload} />}
      {loading && !data && <DashboardLoading />}

      {data && (
        <>
          <OperationalMetricCards metrics={data.metrics} trends={data.trends} />
          <div className="row g-3">
            <div className="col-12 col-lg-8">
              <RecentAndUrgentTickets urgent={data.urgentTickets} recent={data.recentTickets} />
            </div>
            <div className="col-12 col-lg-4">
              <QuickActions actions={STAFF_QUICK_ACTIONS} />
            </div>
          </div>
        </>
      )}
    </DashboardPage>
  );
};

export default StaffDashboard;
