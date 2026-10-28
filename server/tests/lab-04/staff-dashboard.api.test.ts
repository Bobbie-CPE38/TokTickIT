import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import {
  getUtcDayStart,
  calculateTrendDelta,
} from "../../src/features/dashboards/dashboards.service.js";

const ACTIVE_EXCLUDED = ["CLOSED", "CANCELLED"] as any[];

describe("Lab 4 IT Staff & Administrator Dashboard API Tests (API-19, API-20, API-21, API-24, UNIT-01)", () => {
  const prisma = getPrisma();
  let staffId: number;
  let staffToken: string;
  let jenniferToken: string;
  let adminToken: string;
  let seededStaffToken: string;
  let categoryId: number;
  let relatedSystemId: number;

  async function login(email: string, password: string): Promise<string> {
    const res = await request(app).post("/api/auth/login").send({ email, password });
    expect(res.status).toBe(200);
    return res.body.token;
  }

  beforeAll(async () => {
    // Fresh IT Staff user so myAssigned / myActionsCount are exactly known
    const email = `dashboard.staff.${Date.now()}@toktickit.com`;
    const user = await prisma.user.create({
      data: {
        email,
        name: "Dashboard Staff",
        role: "IT_STAFF",
        passwordHash: bcrypt.hashSync("Password123!", 10),
        isActive: true,
        mustChangePassword: false,
      },
    });
    staffId = user.id;
    staffToken = await login(email, "Password123!");
    jenniferToken = await login("jennifer.anderson@kmutt.ac.th", "Password123!");
    seededStaffToken = await login("staff.michael@toktickit.com", "Password123!");
    adminToken = await login("admin@toktickit.com", "AdminPass123!");

    const cat = await prisma.category.findFirst({ where: { isActive: true } });
    const sys = await prisma.relatedSystem.findFirst({ where: { isActive: true } });
    categoryId = cat!.id;
    relatedSystemId = sys!.id;
  });

  async function createTicket(summary: string): Promise<number> {
    const res = await request(app)
      .post("/api/tickets")
      .set("Authorization", `Bearer ${jenniferToken}`)
      .send({
        categoryId,
        relatedSystemId,
        requestedPriority: "MEDIUM",
        summary,
        description: "Staff dashboard calculation test ticket.",
      });
    expect(res.status).toBe(201);
    return res.body.id;
  }

  async function getStaffDashboard(token = staffToken) {
    const res = await request(app)
      .get("/api/dashboards/staff")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    return res.body;
  }

  /**
   * UNIT-01: Trend helpers (BR-15)
   */
  describe("UNIT-01: day-over-day trend helpers (BR-15)", () => {
    it("anchors the baseline at 00:00:00 UTC (07:00:00 ICT) of the current UTC day", () => {
      // 08:00 ICT on May 12 = 01:00 UTC May 12 -> baseline is May 12 00:00 UTC
      expect(getUtcDayStart(new Date("2026-05-12T08:00:00+07:00")).toISOString()).toBe(
        "2026-05-12T00:00:00.000Z"
      );
      // 03:00 ICT on May 12 = 20:00 UTC May 11 -> baseline is still May 11 00:00 UTC
      expect(getUtcDayStart(new Date("2026-05-12T03:00:00+07:00")).toISOString()).toBe(
        "2026-05-11T00:00:00.000Z"
      );
      // Exactly midnight UTC is its own baseline
      expect(getUtcDayStart(new Date("2026-05-12T00:00:00.000Z")).toISOString()).toBe(
        "2026-05-12T00:00:00.000Z"
      );
    });

    it("computes signed deltas between live and baseline counts", () => {
      expect(calculateTrendDelta(14, 11)).toBe(3);
      expect(calculateTrendDelta(5, 7)).toBe(-2);
      expect(calculateTrendDelta(4, 4)).toBe(0);
      expect(calculateTrendDelta(0, 0)).toBe(0);
    });
  });

  it("API-19: enforces role authorization on staff and admin dashboards", async () => {
    expect((await request(app).get("/api/dashboards/staff")).status).toBe(401);

    const requesterStaff = await request(app)
      .get("/api/dashboards/staff")
      .set("Authorization", `Bearer ${jenniferToken}`);
    expect(requesterStaff.status).toBe(403);

    const adminStaff = await request(app)
      .get("/api/dashboards/staff")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(adminStaff.status).toBe(200);

    const requesterAdmin = await request(app)
      .get("/api/dashboards/admin")
      .set("Authorization", `Bearer ${jenniferToken}`);
    expect(requesterAdmin.status).toBe(403);

    const staffAdmin = await request(app)
      .get("/api/dashboards/admin")
      .set("Authorization", `Bearer ${staffToken}`);
    expect(staffAdmin.status).toBe(403);
  });

  it("API-19: returns zero personal metrics for a staff member with no assignments or actions", async () => {
    const body = await getStaffDashboard();
    expect(body.metrics.myAssigned).toBe(0);
    expect(body.metrics.myActionsCount).toBe(0);
    expect(body.trends.myAssignedDelta).toBe(0);
  });

  it("API-19: returns authoritative queue counts, myAssigned, unassigned, myActionsCount, and urgent tickets (AC-12, FR-18, BR-14)", async () => {
    // Personal workload: 3 active owned tickets + 1 closed (excluded from myAssigned)
    const ownedActive: number[] = [];
    for (const status of ["OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER"]) {
      const id = await createTicket(`Staff dashboard owned ${status}`);
      await prisma.ticket.update({
        where: { id },
        data: { currentStatus: status as any, ticketOwnerId: staffId },
      });
      ownedActive.push(id);
    }
    const closedId = await createTicket("Staff dashboard owned CLOSED");
    await prisma.ticket.update({
      where: { id: closedId },
      data: { currentStatus: "CLOSED", ticketOwnerId: staffId },
    });

    // Two actions performed by this staff member on a ticket owned by someone else (BR-02)
    const foreignOwned = await createTicket("Staff dashboard foreign-owned ticket");
    for (const n of [1, 2]) {
      const res = await request(app)
        .post(`/api/tickets/${foreignOwned}/actions-taken`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({
          description: `Dashboard diagnostic step ${n}.`,
          result: "Recorded for dashboard metric test.",
          isFollowUpRequired: false,
        });
      expect(res.status).toBe(201);
    }

    // An active urgent ticket must appear in urgentTickets
    const urgentId = await createTicket("Staff dashboard urgent outage");
    await prisma.ticket.update({
      where: { id: urgentId },
      data: { itPriority: "URGENT", currentStatus: "IN_PROGRESS" },
    });

    const body = await getStaffDashboard();

    const [newCount, openCount, inProgressCount, waitingCount, unassignedCount] = await Promise.all([
      prisma.ticket.count({ where: { currentStatus: "NEW" } }),
      prisma.ticket.count({ where: { currentStatus: "OPEN" } }),
      prisma.ticket.count({ where: { currentStatus: "IN_PROGRESS" } }),
      prisma.ticket.count({ where: { currentStatus: "WAITING_FOR_REQUESTER" } }),
      prisma.ticket.count({
        where: { ticketOwnerId: null, currentStatus: { notIn: ACTIVE_EXCLUDED } },
      }),
    ]);

    expect(body.metrics).toEqual({
      new: newCount,
      open: openCount,
      inProgress: inProgressCount,
      waitingForRequester: waitingCount,
      myAssigned: 3,
      unassigned: unassignedCount,
      myActionsCount: 2,
    });

    // urgentTickets: active URGENT only, max 5, most recently updated first
    expect(body.urgentTickets.length).toBeLessThanOrEqual(5);
    expect(body.urgentTickets.map((t: any) => t.id)).toContain(urgentId);
    for (const t of body.urgentTickets) {
      expect(t.itPriority).toBe("URGENT");
      expect(ACTIVE_EXCLUDED).not.toContain(t.currentStatus);
    }
    expect(body.urgentTickets[0]).toEqual(
      expect.objectContaining({
        id: expect.any(Number),
        ticketNumber: expect.stringMatching(/^TKT-/),
        summary: expect.any(String),
        currentStatus: expect.any(String),
        itPriority: "URGENT",
        updatedAt: expect.any(String),
      })
    );
    expect(body.urgentTickets[0]).toHaveProperty("ticketOwner");

    // recentTickets: max 5 accessible tickets ordered by updatedAt DESC
    expect(body.recentTickets.length).toBeLessThanOrEqual(5);
    const recentTimes = body.recentTickets.map((t: any) => new Date(t.updatedAt).getTime());
    expect([...recentTimes].sort((a, b) => b - a)).toEqual(recentTimes);
    const latest = await prisma.ticket.findFirst({ orderBy: [{ updatedAt: "desc" }, { id: "desc" }] });
    expect(body.recentTickets[0].id).toBe(latest!.id);
  });

  it("API-20: computes day-over-day deltas against the 00:00:00 UTC baseline (BR-15)", async () => {
    const dayStart = getUtcDayStart(new Date());

    async function expectedDelta(where: any) {
      const [live, baseline] = await Promise.all([
        prisma.ticket.count({ where }),
        prisma.ticket.count({ where: { ...where, updatedAt: { lt: dayStart } } }),
      ]);
      return live - baseline;
    }

    const before = await getStaffDashboard(seededStaffToken);
    const staffMichael = await prisma.user.findUnique({ where: { email: "staff.michael@toktickit.com" } });

    expect(before.trends).toEqual({
      newDelta: await expectedDelta({ currentStatus: "NEW" }),
      openDelta: await expectedDelta({ currentStatus: "OPEN" }),
      inProgressDelta: await expectedDelta({ currentStatus: "IN_PROGRESS" }),
      waitingForRequesterDelta: await expectedDelta({ currentStatus: "WAITING_FOR_REQUESTER" }),
      myAssignedDelta: await expectedDelta({
        ticketOwnerId: staffMichael!.id,
        currentStatus: { notIn: ACTIVE_EXCLUDED },
      }),
    });

    // A ticket entering NEW today raises both the live count and the delta
    const id = await createTicket("Trend delta probe ticket");
    const afterCreate = await getStaffDashboard(seededStaffToken);
    expect(afterCreate.metrics.new).toBe(before.metrics.new + 1);
    expect(afterCreate.trends.newDelta).toBe(before.trends.newDelta + 1);

    // The same ticket last touched before midnight UTC belongs to the baseline: count stays, delta drops back
    const yesterday = new Date(dayStart.getTime() - 60 * 60 * 1000);
    await prisma.$executeRaw`UPDATE tickets SET "updatedAt" = ${yesterday} WHERE id = ${id}`;
    const afterBackdate = await getStaffDashboard(seededStaffToken);
    expect(afterBackdate.metrics.new).toBe(before.metrics.new + 1);
    expect(afterBackdate.trends.newDelta).toBe(before.trends.newDelta);
  });

  it("API-21: Administrator dashboard returns operational metrics plus user governance summary (AC-13, FR-21)", async () => {
    const res = await request(app)
      .get("/api/dashboards/admin")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);

    const staffView = await getStaffDashboard(adminToken);
    expect(res.body.operationalMetrics).toEqual(staffView.metrics);
    expect(res.body.trends).toEqual(staffView.trends);
    expect(Array.isArray(res.body.urgentTickets)).toBe(true);
    expect(Array.isArray(res.body.recentTickets)).toBe(true);

    const [totalUsers, activeUsers, requesterCount, staffCount, adminCount] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.user.count({ where: { role: "REQUESTER" } }),
      prisma.user.count({ where: { role: "IT_STAFF" } }),
      prisma.user.count({ where: { role: "ADMINISTRATOR" } }),
    ]);

    expect(res.body.userStats).toEqual({
      totalUsers,
      activeUsers,
      inactiveUsers: totalUsers - activeUsers,
      requesterCount,
      staffCount,
      adminCount,
    });
    expect(res.body.userStats.inactiveUsers).toBeGreaterThan(0); // seed includes a deactivated account
  });

  it("API-24: dashboard endpoints respond within the 200ms performance budget (DoD-05)", async () => {
    // Warm-up request so connection pool setup is excluded from the measurement
    await getStaffDashboard();

    const targets: Array<[string, string]> = [
      ["/api/dashboards/staff", staffToken],
      ["/api/dashboards/admin", adminToken],
      ["/api/dashboards/requester", jenniferToken],
    ];
    for (const [path, token] of targets) {
      const started = performance.now();
      const res = await request(app).get(path).set("Authorization", `Bearer ${token}`);
      const elapsed = performance.now() - started;
      expect(res.status).toBe(200);
      expect(elapsed).toBeLessThan(200);
    }
  });
});
