import React from "react";

export const StaffDetailScreen: React.FC<{ ticketId?: number }> = ({ ticketId }) => {
  return (
    <div className="container py-4">
      <div className="card p-4 text-center">
        <h1 className="h5 fw-bold mb-2">IT Staff Ticket Detail {ticketId ? `#${ticketId}` : ""}</h1>
        <p className="text-muted mb-0">Coming in Lab 3 Sprint 3 (Issue #30).</p>
      </div>
    </div>
  );
};

export default StaffDetailScreen;
