import { TicketStatus } from "@prisma/client";
import { getPrisma } from "../../prisma.js";
import { AuthUser } from "../../core/tokens.js";
import { OPEN_TICKET_STATUSES } from "../tickets/tickets.validation.js";

const RECENT_LIMIT = 5;
const INACTIVE_STATUSES: TicketStatus[] = ["CLOSED", "CANCELLED"];

type StatusGroup = { currentStatus: TicketStatus; _count: { _all: number } };

function countInGroups(groups: StatusGroup[], status: TicketStatus): number {
  return groups.find((g) => g.currentStatus === status)?._count._all ?? 0;
}

/**
 * Trend baseline boundary (BR-15): 00:00:00 UTC (07:00:00 ICT) of the current UTC calendar day.
 */
export function getUtcDayStart(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/**
 * Day-over-day delta (±N) between the live count and the baseline count.
 */
export function calculateTrendDelta(liveCount: number, baselineCount: number): number {
  return liveCount - baselineCount;
}

/**
 * Requester dashboard (FR-15, FR-16). Every query is scoped to requesterId = user.id (BR-13).
 */
export async function getRequesterDashboard(user: AuthUser) {
  const prisma = getPrisma();
  const owned = { requesterId: user.id };

  const [statusGroups, recentTickets] = await Promise.all([
    prisma.ticket.groupBy({
      by: ["currentStatus"],
      where: owned,
      _count: { _all: true },
    }),
    prisma.ticket.findMany({
      where: owned,
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      take: RECENT_LIMIT,
      select: {
        id: true,
        ticketNumber: true,
        summary: true,
        currentStatus: true,
        requestedPriority: true,
        category: { select: { name: true } },
        updatedAt: true,
      },
    }),
  ]);

  const countOf = (status: TicketStatus) => countInGroups(statusGroups, status);

  return {
    metrics: {
      myOpenTickets: OPEN_TICKET_STATUSES.reduce((sum, s) => sum + countOf(s), 0),
      waitingForRequester: countOf("WAITING_FOR_REQUESTER"),
      inProgress: countOf("IN_PROGRESS"),
      resolved: countOf("RESOLVED"),
      closed: countOf("CLOSED"),
    },
    recentTickets,
  };
}

const staffTicketSelect = {
  id: true,
  ticketNumber: true,
  summary: true,
  currentStatus: true,
  itPriority: true,
  ticketOwner: { select: { id: true, name: true } },
  updatedAt: true,
} as const;

/**
 * IT Staff operational dashboard (FR-18, FR-19). All counts and trends are computed in
 * PostgreSQL (BR-14); trend baselines are records last updated before midnight UTC (BR-15).
 */
export async function getStaffDashboard(user: AuthUser) {
  const prisma = getPrisma();
  const dayStart = getUtcDayStart();
  const beforeToday = { updatedAt: { lt: dayStart } };
  const myActive = { ticketOwnerId: user.id, currentStatus: { notIn: INACTIVE_STATUSES } };

  const [
    liveGroups,
    baselineGroups,
    myAssigned,
    myAssignedBaseline,
    unassigned,
    myActionsCount,
    urgentTickets,
    recentTickets,
  ] = await Promise.all([
    prisma.ticket.groupBy({ by: ["currentStatus"], _count: { _all: true } }),
    prisma.ticket.groupBy({ by: ["currentStatus"], where: beforeToday, _count: { _all: true } }),
    prisma.ticket.count({ where: myActive }),
    prisma.ticket.count({ where: { ...myActive, ...beforeToday } }),
    prisma.ticket.count({
      where: { ticketOwnerId: null, currentStatus: { notIn: INACTIVE_STATUSES } },
    }),
    prisma.actionTaken.count({ where: { performedByUserId: user.id } }),
    prisma.ticket.findMany({
      where: { itPriority: "URGENT", currentStatus: { notIn: INACTIVE_STATUSES } },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      take: RECENT_LIMIT,
      select: staffTicketSelect,
    }),
    prisma.ticket.findMany({
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      take: RECENT_LIMIT,
      select: staffTicketSelect,
    }),
  ]);

  const deltaFor = (status: TicketStatus) =>
    calculateTrendDelta(countInGroups(liveGroups, status), countInGroups(baselineGroups, status));

  return {
    metrics: {
      new: countInGroups(liveGroups, "NEW"),
      open: countInGroups(liveGroups, "OPEN"),
      inProgress: countInGroups(liveGroups, "IN_PROGRESS"),
      waitingForRequester: countInGroups(liveGroups, "WAITING_FOR_REQUESTER"),
      myAssigned,
      unassigned,
      myActionsCount,
    },
    trends: {
      newDelta: deltaFor("NEW"),
      openDelta: deltaFor("OPEN"),
      inProgressDelta: deltaFor("IN_PROGRESS"),
      waitingForRequesterDelta: deltaFor("WAITING_FOR_REQUESTER"),
      myAssignedDelta: calculateTrendDelta(myAssigned, myAssignedBaseline),
    },
    urgentTickets,
    recentTickets,
  };
}

/**
 * Administrator dashboard (FR-21): staff operational metrics plus user-governance counts.
 */
export async function getAdminDashboard(user: AuthUser) {
  const prisma = getPrisma();

  const [staffDashboard, roleGroups, activeUsers] = await Promise.all([
    getStaffDashboard(user),
    prisma.user.groupBy({ by: ["role"], _count: { _all: true } }),
    prisma.user.count({ where: { isActive: true } }),
  ]);

  const roleCount = (role: string) => roleGroups.find((g) => g.role === role)?._count._all ?? 0;
  const totalUsers = roleGroups.reduce((sum, g) => sum + g._count._all, 0);

  return {
    operationalMetrics: staffDashboard.metrics,
    trends: staffDashboard.trends,
    urgentTickets: staffDashboard.urgentTickets,
    userStats: {
      totalUsers,
      activeUsers,
      inactiveUsers: totalUsers - activeUsers,
      requesterCount: roleCount("REQUESTER"),
      staffCount: roleCount("IT_STAFF"),
      adminCount: roleCount("ADMINISTRATOR"),
    },
    recentTickets: staffDashboard.recentTickets,
  };
}
