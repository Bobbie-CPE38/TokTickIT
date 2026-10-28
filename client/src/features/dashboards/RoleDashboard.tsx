import React from "react";
import { useAuth } from "../../context/AuthContext.js";
import { RequesterDashboard } from "./RequesterDashboard.js";
import { StaffDashboard } from "./StaffDashboard.js";
import { AdminDashboard } from "./AdminDashboard.js";

/**
 * Mounts the dashboard matching the authenticated user's role (Decision 1).
 */
export const RoleDashboard: React.FC = () => {
  const { user } = useAuth();
  if (user?.role === "ADMINISTRATOR") return <AdminDashboard />;
  if (user?.role === "IT_STAFF") return <StaffDashboard />;
  return <RequesterDashboard />;
};

export default RoleDashboard;
