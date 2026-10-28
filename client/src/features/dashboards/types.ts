import { Priority, TicketStatus } from "../../api.js";

export interface RequesterDashboardTicket {
  id: number;
  ticketNumber: string;
  summary: string;
  currentStatus: TicketStatus;
  requestedPriority: Priority;
  category: { name: string };
  updatedAt: string;
}

export interface RequesterDashboardData {
  metrics: {
    myOpenTickets: number;
    waitingForRequester: number;
    inProgress: number;
    resolved: number;
    closed: number;
  };
  recentTickets: RequesterDashboardTicket[];
}

export interface StaffDashboardTicket {
  id: number;
  ticketNumber: string;
  summary: string;
  currentStatus: TicketStatus;
  itPriority: Priority;
  ticketOwner: { id: number; name: string } | null;
  updatedAt: string;
}

export interface OperationalMetrics {
  new: number;
  open: number;
  inProgress: number;
  waitingForRequester: number;
  myAssigned: number;
  unassigned: number;
  myActionsCount: number;
}

export interface OperationalTrends {
  newDelta: number;
  openDelta: number;
  inProgressDelta: number;
  waitingForRequesterDelta: number;
  myAssignedDelta: number;
}

export interface StaffDashboardData {
  metrics: OperationalMetrics;
  trends: OperationalTrends;
  urgentTickets: StaffDashboardTicket[];
  recentTickets: StaffDashboardTicket[];
}

export interface UserStats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  requesterCount: number;
  staffCount: number;
  adminCount: number;
}

export interface AdminDashboardData {
  operationalMetrics: OperationalMetrics;
  trends: OperationalTrends;
  urgentTickets: StaffDashboardTicket[];
  recentTickets: StaffDashboardTicket[];
  userStats: UserStats;
}
