import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

describe("Lab 4 Requester Dashboard API Tests (API-17, API-18)", () => {
  const prisma = getPrisma();
  let requesterId: number;
  let requesterToken: string;
  let jenniferToken: string;
  let staffToken: string;
  let adminToken: string;
  let categoryId: number;
  let relatedSystemId: number;

  async function login(email: string, password: string): Promise<string> {
    const res = await request(app).post("/api/auth/login").send({ email, password });
    expect(res.status).toBe(200);
    return res.body.token;
  }

  beforeAll(async () => {
    // Fresh requester so every dashboard count is exactly known (seed data is shared across suites)
    const email = `dashboard.requester.${Date.now()}@kmutt.ac.th`;
    const user = await prisma.user.create({
      data: {
        email,
        name: "Dashboard Requester",
        role: "REQUESTER",
        passwordHash: bcrypt.hashSync("Password123!", 10),
        isActive: true,
        mustChangePassword: false,
      },
    });
    requesterId = user.id;
    requesterToken = await login(email, "Password123!");
    jenniferToken = await login("jennifer.anderson@kmutt.ac.th", "Password123!");
    staffToken = await login("staff.michael@toktickit.com", "Password123!");
    adminToken = await login("admin@toktickit.com", "AdminPass123!");

    const cat = await prisma.category.findFirst({ where: { isActive: true } });
    const sys = await prisma.relatedSystem.findFirst({ where: { isActive: true } });
    categoryId = cat!.id;
    relatedSystemId = sys!.id;
  });

  async function createTicket(token: string, summary: string): Promise<number> {
    const res = await request(app)
      .post("/api/tickets")
      .set("Authorization", `Bearer ${token}`)
      .send({
        categoryId,
        relatedSystemId,
        requestedPriority: "MEDIUM",
        summary,
        description: "Dashboard calculation test ticket.",
      });
    expect(res.status).toBe(201);
    return res.body.id;
  }

  async function setStatus(ticketId: number, currentStatus: any) {
    await prisma.ticket.update({ where: { id: ticketId }, data: { currentStatus } });
  }

  it("API-17: rejects unauthenticated, IT Staff, and Administrator callers (BR-13)", async () => {
    const anon = await request(app).get("/api/dashboards/requester");
    expect(anon.status).toBe(401);

    const staff = await request(app)
      .get("/api/dashboards/requester")
      .set("Authorization", `Bearer ${staffToken}`);
    expect(staff.status).toBe(403);

    const admin = await request(app)
      .get("/api/dashboards/requester")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(admin.status).toBe(403);
  });

  it("API-17: returns zero metrics and empty recent list for a requester without tickets", async () => {
    const res = await request(app)
      .get("/api/dashboards/requester")
      .set("Authorization", `Bearer ${requesterToken}`);

    expect(res.status).toBe(200);
    expect(res.body.metrics).toEqual({
      myOpenTickets: 0,
      waitingForRequester: 0,
      inProgress: 0,
      resolved: 0,
      closed: 0,
    });
    expect(res.body.recentTickets).toEqual([]);
  });

  it("API-17: returns accurate counts scoped strictly to the authenticated requester (AC-02, BR-13)", async () => {
    // Owned tickets: NEW, OPEN, IN_PROGRESS x2, WAITING_FOR_REQUESTER, REOPENED, RESOLVED, CLOSED x2, CANCELLED
    const plan: string[] = [
      "NEW",
      "OPEN",
      "IN_PROGRESS",
      "IN_PROGRESS",
      "WAITING_FOR_REQUESTER",
      "REOPENED",
      "RESOLVED",
      "CLOSED",
      "CLOSED",
      "CANCELLED",
    ];
    for (const status of plan) {
      const id = await createTicket(requesterToken, `Requester dashboard ${status}`);
      await setStatus(id, status);
    }

    // Another requester's tickets must never leak into these metrics
    const foreignId = await createTicket(jenniferToken, "Foreign ticket for isolation check");
    await setStatus(foreignId, "WAITING_FOR_REQUESTER");

    const res = await request(app)
      .get("/api/dashboards/requester")
      .set("Authorization", `Bearer ${requesterToken}`);

    expect(res.status).toBe(200);
    expect(res.body.metrics).toEqual({
      myOpenTickets: 6, // NEW, OPEN, IN_PROGRESS x2, WAITING_FOR_REQUESTER, REOPENED
      waitingForRequester: 1,
      inProgress: 2,
      resolved: 1,
      closed: 2,
    });

    const ownedIds = (
      await prisma.ticket.findMany({ where: { requesterId }, select: { id: true } })
    ).map((t: { id: number }) => t.id);
    for (const t of res.body.recentTickets) {
      expect(ownedIds).toContain(t.id);
    }
    expect(res.body.recentTickets.map((t: any) => t.id)).not.toContain(foreignId);
  });

  it("FR-17: GET /api/tickets?filter=open drill-down returns exactly the tickets counted as myOpenTickets", async () => {
    const dashboard = await request(app)
      .get("/api/dashboards/requester")
      .set("Authorization", `Bearer ${requesterToken}`);

    const res = await request(app)
      .get("/api/tickets?filter=open&pageSize=50")
      .set("Authorization", `Bearer ${requesterToken}`);

    expect(res.status).toBe(200);
    expect(res.body.pagination.total).toBe(dashboard.body.metrics.myOpenTickets);
    const openStatuses = ["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "REOPENED"];
    for (const t of res.body.data) {
      expect(openStatuses).toContain(t.currentStatus);
    }

    const invalid = await request(app)
      .get("/api/tickets?filter=bogus")
      .set("Authorization", `Bearer ${requesterToken}`);
    expect(invalid.status).toBe(400);
  });

  it("API-18: returns at most 5 owned tickets ordered by updatedAt DESC with documented shape (FR-16)", async () => {
    const owned = await prisma.ticket.findMany({
      where: { requesterId },
      select: { id: true },
      orderBy: { id: "asc" },
    });
    expect(owned.length).toBeGreaterThan(5);

    // Assign deterministic, distinct update timestamps: later id => more recent
    const base = Date.UTC(2026, 4, 1, 8, 0, 0);
    for (let i = 0; i < owned.length; i++) {
      await prisma.$executeRaw`UPDATE tickets SET "updatedAt" = ${new Date(base + i * 60_000)} WHERE id = ${owned[i].id}`;
    }

    const res = await request(app)
      .get("/api/dashboards/requester")
      .set("Authorization", `Bearer ${requesterToken}`);

    expect(res.status).toBe(200);
    expect(res.body.recentTickets).toHaveLength(5);

    const expectedIds = owned
      .map((t: { id: number }) => t.id)
      .reverse()
      .slice(0, 5);
    expect(res.body.recentTickets.map((t: any) => t.id)).toEqual(expectedIds);

    const first = res.body.recentTickets[0];
    expect(first).toEqual(
      expect.objectContaining({
        id: expect.any(Number),
        ticketNumber: expect.stringMatching(/^TKT-/),
        summary: expect.any(String),
        currentStatus: expect.any(String),
        requestedPriority: expect.any(String),
        category: expect.objectContaining({ name: expect.any(String) }),
        updatedAt: expect.any(String),
      })
    );
  });
});
