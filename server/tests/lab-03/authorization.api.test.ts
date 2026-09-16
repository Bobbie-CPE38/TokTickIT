import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

describe("Lab 3 Authorization & Requester Session Isolation API Tests (API-09, API-10, API-35)", () => {
  const prisma = getPrisma();
  let jenniferToken: string;
  let davidToken: string;
  let jenniferId: number;
  let davidId: number;
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
    davidId = loginResB.body.user.id;

    // Fetch valid active Category and RelatedSystem
    const category = await prisma.category.findFirst({ where: { isActive: true } });
    const relatedSystem = await prisma.relatedSystem.findFirst({ where: { isActive: true } });
    categoryId = category!.id;
    relatedSystemId = relatedSystem!.id;
  });

  /**
   * API-09: Requester ticket creation resolves requesterId from session
   * AC-07, BR-03
   */
  it("API-09: resolves requesterId strictly from JWT token session, ignoring spoofed requesterId in payload (AC-07, BR-03)", async () => {
    const payload = {
      categoryId,
      relatedSystemId,
      requestedPriority: "HIGH",
      summary: "Session Binding Test Summary",
      description: "Verifying that requesterId is resolved from token session rather than body.",
      requesterId: davidId, // Spoofed requester ID attempted in body
    };

    const res = await request(app)
      .post("/api/tickets")
      .set("Authorization", `Bearer ${jenniferToken}`)
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    // Strictly Jennifer's ID, ignoring spoofed David ID
    expect(res.body.requesterId).toBe(jenniferId);

    // Verify in database
    const savedTicket = await prisma.ticket.findUnique({
      where: { id: res.body.id },
    });
    expect(savedTicket).not.toBeNull();
    expect(savedTicket!.requesterId).toBe(jenniferId);
  });

  /**
   * API-10: Requester ticket isolation & anti-leakage protection
   * AC-08, BR-03
   */
  it("API-10: returns HTTP 404 Not Found without leaking ticket data when Requester B queries Requester A's ticket (AC-08, BR-03)", async () => {
    // Create a ticket owned by Jennifer
    const createRes = await request(app)
      .post("/api/tickets")
      .set("Authorization", `Bearer ${jenniferToken}`)
      .send({
        categoryId,
        relatedSystemId,
        requestedPriority: "MEDIUM",
        summary: "Jennifer Private Ticket",
        description: "Confidential ticket details owned by Jennifer Anderson.",
      });
    expect(createRes.status).toBe(201);
    const jenniferTicketId = createRes.body.id;

    // David Lee attempts to fetch Jennifer's ticket
    const res = await request(app)
      .get(`/api/tickets/${jenniferTicketId}`)
      .set("Authorization", `Bearer ${davidToken}`);

    // Anti-leakage privacy requirement: HTTP 404 Not Found (never 403)
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty("error");
    expect(res.body).not.toHaveProperty("ticketNumber");
    expect(res.body).not.toHaveProperty("summary");
    expect(res.body).not.toHaveProperty("description");
  });

  /**
   * API-11: Requester attempts to access IT Staff queue (GET /api/staff/tickets)
   * AC-21, FR-09
   */
  it("API-11: strictly forbids Requesters from accessing IT Staff queue with HTTP 403 Forbidden (AC-21, FR-09)", async () => {
    const res = await request(app)
      .get("/api/staff/tickets")
      .set("Authorization", `Bearer ${jenniferToken}`);

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty("error");
  });

  /**
   * API-35: Lab 2 Regression & Database Evolution Compatibility
   * BR-22, FR-12
   */
  it("API-35: ensures preserved @kmutt.ac.th accounts and tickets continue functioning under authenticated session (BR-22, FR-12)", async () => {
    const res = await request(app)
      .get("/api/tickets")
      .set("Authorization", `Bearer ${jenniferToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("data");
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body).toHaveProperty("pagination");
    expect(res.body.pagination).toHaveProperty("total");
    expect(res.body.pagination).toHaveProperty("page", 1);
  });
});

