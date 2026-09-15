import React from "react";
import { Priority } from "../../api.js";

interface PriorityConfig {
  label: string;
  bg: string;
  text: string;
  border: string;
}

const priorityConfigMap: Record<Priority, PriorityConfig> = {
  LOW: { label: "Low", bg: "#D1FAE5", text: "#059669", border: "#A7F3D0" },
  MEDIUM: { label: "Medium", bg: "#FEF3C7", text: "#D97706", border: "#FDE68A" },
  HIGH: { label: "High", bg: "#FEE2E2", text: "#DC2626", border: "#FCA5A5" },
  URGENT: { label: "Urgent", bg: "#FCA5A5", text: "#991B1B", border: "#F87171" },
};

export interface PriorityBadgeProps {
  priority: Priority;
  size?: "sm" | "md";
  className?: string;
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({
  priority,
  size = "sm",
  className = "",
}) => {
  const c = priorityConfigMap[priority] || priorityConfigMap.MEDIUM;
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

export default PriorityBadge;
