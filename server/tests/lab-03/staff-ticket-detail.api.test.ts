import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

describe("Lab 3 Staff Ticket Detail & Resolution Indication API Tests (API-20)", () => {
  const prisma = getPrisma();
  let jenniferToken: string;
  let davidToken: string;
  let jenniferId: number;
  let categoryId: number;
  let relatedSystemId: number;

  beforeAll(async () => {
    // Authenticate Jennifer Anderson (Requester A)
    const loginResA = await request(app)
      .post("/api/auth/login")
      .send({
        email: "jennifer.anderson@kmutt.ac.th",
        password: "Password123!",
      });
    expect(loginResA.status).toBe(200);
    jenniferToken = loginResA.body.token;
    jenniferId = loginResA.body.user.id;

    // Authenticate David Lee (Requester B)
    const loginResB = await request(app)
      .post("/api/auth/login")
      .send({
        email: "david.lee@kmutt.ac.th",
        password: "Password123!",
      });
    expect(loginResB.status).toBe(200);
    davidToken = loginResB.body.token;

    // Fetch category and system
    const category = await prisma.category.findFirst({ where: { isActive: true } });
    const relatedSystem = await prisma.relatedSystem.findFirst({ where: { isActive: true } });
    categoryId = category!.id;
    relatedSystemId = relatedSystem!.id;
  });

  /**
   * API-20: Requester indicates problem appears resolved
   * AC-16, BR-05
   */
  it("API-20: allows ticket owner to indicate problem appears resolved, updating isRequesterResolved to true without modifying status (AC-16, BR-05)", async () => {
    // 1. Create a ticket as Jennifer
    const createRes = await request(app)
      .post("/api/tickets")
      .set("Authorization", `Bearer ${jenniferToken}`)
      .send({
        categoryId,
        relatedSystemId,
        requestedPriority: "MEDIUM",
        summary: "Battery draining issue to resolve",
        description: "Problem that will appear resolved soon.",
      });
    expect(createRes.status).toBe(201);
    const ticketId = createRes.body.id;
    expect(createRes.body.currentStatus).toBe("NEW");
    expect(createRes.body.isRequesterResolved).toBe(false);

    // 2. Jennifer indicates problem appears resolved
    const resolveRes = await request(app)
      .patch(`/api/tickets/${ticketId}/resolve-indication`)
      .set("Authorization", `Bearer ${jenniferToken}`);

    expect(resolveRes.status).toBe(200);
    expect(resolveRes.body).toHaveProperty("id", ticketId);
    expect(resolveRes.body).toHaveProperty("ticketNumber", createRes.body.ticketNumber);
    expect(resolveRes.body).toHaveProperty("isRequesterResolved", true);
    expect(resolveRes.body).toHaveProperty("updatedAt");

    // 3. Verify in database that isRequesterResolved is true while currentStatus remains NEW
    const dbTicket = await prisma.ticket.findUnique({
      where: { id: ticketId },
    });
    expect(dbTicket).not.toBeNull();
    expect(dbTicket!.isRequesterResolved).toBe(true);
    expect(dbTicket!.currentStatus).toBe("NEW"); // Status is NOT altered to RESOLVED or CLOSED per BR-05
  });

  it("API-20: rejects resolve indication with 404 when requested by another requester (anti-leakage rule)", async () => {
    // Create ticket as Jennifer
    const createRes = await request(app)
      .post("/api/tickets")
      .set("Authorization", `Bearer ${jenniferToken}`)
      .send({
        categoryId,
        relatedSystemId,
        requestedPriority: "LOW",
        summary: "Jennifer ticket for David resolve test",
        description: "Testing cross-requester protection on resolve indication.",
      });
    expect(createRes.status).toBe(201);
    const ticketId = createRes.body.id;

    // David attempts to mark Jennifer's ticket as resolved
    const resolveRes = await request(app)
      .patch(`/api/tickets/${ticketId}/resolve-indication`)
      .set("Authorization", `Bearer ${davidToken}`);

    expect(resolveRes.status).toBe(404);
    expect(resolveRes.body).toHaveProperty("error");

    // Verify DB flag did NOT change
    const dbTicket = await prisma.ticket.findUnique({
      where: { id: ticketId },
    });
    expect(dbTicket!.isRequesterResolved).toBe(false);
  });

  it("API-20: rejects unauthenticated resolve indication request with HTTP 401", async () => {
    const res = await request(app).patch("/api/tickets/1/resolve-indication");
    expect(res.status).toBe(401);
  });
});
