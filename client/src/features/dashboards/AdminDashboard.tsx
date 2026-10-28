import React from "react";
import { useAuth } from "../../context/AuthContext.js";
import { fetchAdminDashboard } from "./api.js";
import { UserStats } from "./types.js";
import {
  DashboardError,
  DashboardHeader,
  DashboardLink,
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

// Administrators cannot create tickets (POST /api/tickets is 403), so no Create Ticket shortcut
const ADMIN_QUICK_ACTIONS = [
  { icon: "🔍", label: "Search Tickets", description: "Find tickets in queue", to: "/queue?focus=search" },
  { icon: "📋", label: "Ticket Queue", description: "Review all IT tickets", to: "/queue" },
  { icon: "👥", label: "Manage Users", description: "Accounts, roles, and access", to: "/admin/users" },
];

const UserGovernanceCard: React.FC<{ stats: UserStats }> = ({ stats }) => {
  const rows: Array<[string, number]> = [
    ["Total Users", stats.totalUsers],
    ["Active", stats.activeUsers],
    ["Inactive", stats.inactiveUsers],
    ["Requesters", stats.requesterCount],
    ["IT Staff", stats.staffCount],
    ["Administrators", stats.adminCount],
  ];

  return (
    <section
      className="p-3 mb-3"
      aria-labelledby="user-governance-heading"
      style={{ backgroundColor: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "8px" }}
    >
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h2 id="user-governance-heading" className="mb-0 fw-semibold" style={{ fontSize: "1rem", color: "#1C2D27" }}>
          User Governance
        </h2>
        <DashboardLink
          to="/admin/users"
          className="fw-medium text-decoration-none d-inline-flex align-items-center px-2"
          style={{ fontSize: "0.875rem", color: "#0B7A46", minHeight: "44px" }}
        >
          Manage users
        </DashboardLink>
      </div>
      <dl className="row g-2 mb-0">
        {rows.map(([label, value]) => (
          <div key={label} className="col-6 col-md-4 col-lg-2">
            <div className="p-2 h-100" style={{ backgroundColor: "#F5F7F6", borderRadius: "6px" }}>
              <dt className="fw-medium" style={{ fontSize: "0.75rem", color: "#52665D" }}>
                {label}
              </dt>
              <dd className="mb-0 fw-bold" style={{ fontSize: "1.25rem", color: "#1C2D27" }}>
                {value}
              </dd>
            </div>
          </div>
        ))}
      </dl>
    </section>
  );
};

/**
 * Administrator Dashboard (FR-21, AC-13): operational queue metrics plus user governance summary.
 */
export const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const { data, loading, refreshing, error, reload } = useDashboardData(fetchAdminDashboard);
  const firstName = user?.name?.split(" ")[0] ?? "there";

  return (
    <DashboardPage testId="admin-dashboard">
      <DashboardHeader
        title={`Welcome back, ${firstName}!`}
        subtitle="Here's an overview of the service desk and user accounts."
        onRefresh={reload}
        refreshing={refreshing}
      >
        {data && <QueueStatsBar metrics={data.operationalMetrics} />}
      </DashboardHeader>

      {error && <DashboardError message={error} onRetry={reload} />}
      {loading && !data && <DashboardLoading />}

      {data && (
        <>
          <OperationalMetricCards metrics={data.operationalMetrics} trends={data.trends} />
          <UserGovernanceCard stats={data.userStats} />
          <div className="row g-3">
            <div className="col-12 col-lg-8">
              <RecentAndUrgentTickets urgent={data.urgentTickets} recent={data.recentTickets} />
            </div>
            <div className="col-12 col-lg-4">
              <QuickActions actions={ADMIN_QUICK_ACTIONS} />
            </div>
          </div>
        </>
      )}
    </DashboardPage>
  );
};

export default AdminDashboard;
