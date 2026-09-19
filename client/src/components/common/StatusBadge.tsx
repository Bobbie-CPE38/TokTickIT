import React from "react";
import { TicketStatus } from "../../api.js";

interface StatusConfig {
  label: string;
  bg: string;
  text: string;
  border: string;
}

const statusConfigMap: Record<TicketStatus, StatusConfig> = {
  NEW: { label: "New", bg: "#DBEAFE", text: "#1E40AF", border: "#93C5FD" },
  OPEN: { label: "Open", bg: "#CCFBF1", text: "#0D9488", border: "#5EEAD4" },
  IN_PROGRESS: { label: "In Progress", bg: "#EAF6EF", text: "#0B7A46", border: "#A7F3D0" },
  WAITING_FOR_REQUESTER: { label: "Waiting for Requester", bg: "#FEF3C7", text: "#D97706", border: "#FDE68A" },
  PENDING: { label: "Pending", bg: "#FEF3C7", text: "#D97706", border: "#FDE68A" },
  RESOLVED: { label: "Resolved", bg: "#D1FAE5", text: "#059669", border: "#6EE7B7" },
  CLOSED: { label: "Closed", bg: "#F3F4F6", text: "#4B5563", border: "#D1D5DB" },
  REOPENED: { label: "Reopened", bg: "#FAE8FF", text: "#C026D3", border: "#F5D0FE" },
  CANCELLED: { label: "Cancelled", bg: "#F3F4F6", text: "#6B7280", border: "#E5E7EB" },
};

export interface StatusBadgeProps {
  status: TicketStatus;
  size?: "sm" | "md";
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = "sm",
  className = "",
}) => {
  const c = statusConfigMap[status] || statusConfigMap.NEW;
  const isMd = size === "md";

  return (
    <span
      className={`badge rounded-pill fw-semibold ${isMd ? "px-3 py-1.5" : "px-2.5 py-1"} ${className}`}
      style={{
        backgroundColor: c.bg,
        color: c.text,
        border: `1px solid ${c.border}`,
        fontSize: isMd ? "0.8rem" : "0.75rem",
      }}
    >
      {c.label}
    </span>
  );
};

export default StatusBadge;
