import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

describe("Lab 3 Staff Ticket Detail & Operations API Tests (API-14 to API-20, API-32)", () => {
  const prisma = getPrisma();
  let jenniferToken: string;
  let davidToken: string;
  let staffToken: string;
  let adminToken: string;
  let jenniferId: number;
  let staffId: number;
  let inactiveStaffId: number;
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

    // Authenticate Michael Brown (IT Staff)
    const loginStaff = await request(app)
      .post("/api/auth/login")
      .send({
        email: "staff.michael@toktickit.com",
        password: "Password123!",
      });
    expect(loginStaff.status).toBe(200);
    staffToken = loginStaff.body.token;
    staffId = loginStaff.body.user.id;

    // Authenticate John Smith (Administrator)
    const loginAdmin = await request(app)
      .post("/api/auth/login")
      .send({
        email: "admin@toktickit.com",
        password: "AdminPass123!",
      });
    expect(loginAdmin.status).toBe(200);
    adminToken = loginAdmin.body.token;

    // Inactive staff user (Kevin Patel)
    const inactiveUser = await prisma.user.findFirst({
      where: { email: "kpatel@toktickit.com" },
    });
    inactiveStaffId = inactiveUser!.id;

    // Fetch category and system
    const category = await prisma.category.findFirst({ where: { isActive: true } });
    const relatedSystem = await prisma.relatedSystem.findFirst({ where: { isActive: true } });
    categoryId = category!.id;
    relatedSystemId = relatedSystem!.id;
  });

  /**
   * API-32: Single ticket detail retrieval for IT Staff
   * AC-24, FR-16
   */
  it("API-32: returns full ticket details with relations for IT Staff (AC-24, FR-16)", async () => {
    // 1. Create a ticket as Jennifer
    const createRes = await request(app)
      .post("/api/tickets")
      .set("Authorization", `Bearer ${jenniferToken}`)
      .send({
        categoryId,
        relatedSystemId,
        requestedPriority: "MEDIUM",
        summary: "API-32 Detail Test Ticket",
        description: "Full ticket detail check for IT Staff.",
      });
    expect(createRes.status).toBe(201);
    const ticketId = createRes.body.id;

    // 2. IT Staff retrieves ticket detail
    const detailRes = await request(app)
      .get(`/api/staff/tickets/${ticketId}`)
      .set("Authorization", `Bearer ${staffToken}`);

    expect(detailRes.status).toBe(200);
    expect(detailRes.body).toHaveProperty("id", ticketId);
    expect(detailRes.body).toHaveProperty("ticketNumber", createRes.body.ticketNumber);
    expect(detailRes.body).toHaveProperty("summary", "API-32 Detail Test Ticket");
    expect(detailRes.body).toHaveProperty("requester");
    expect(detailRes.body.requester).toHaveProperty("name", "Jennifer Anderson");
    expect(detailRes.body).toHaveProperty("category");
    expect(detailRes.body).toHaveProperty("relatedSystem");
    expect(detailRes.body).toHaveProperty("attachments");
    expect(Array.isArray(detailRes.body.attachments)).toBe(true);
    expect(detailRes.body).toHaveProperty("publicComments");
    expect(Array.isArray(detailRes.body.publicComments)).toBe(true);
    expect(detailRes.body).toHaveProperty("internalNotes");
    expect(Array.isArray(detailRes.body.internalNotes)).toBe(true);
  });

  it("API-32: returns 404 when ticket does not exist, and 403 for Requester", async () => {
    const notFoundRes = await request(app)
      .get("/api/staff/tickets/999999")
      .set("Authorization", `Bearer ${staffToken}`);
    expect(notFoundRes.status).toBe(404);

    const forbiddenRes = await request(app)
      .get("/api/staff/tickets/1")
      .set("Authorization", `Bearer ${jenniferToken}`);
    expect(forbiddenRes.status).toBe(403);
  });

  /**
   * API-14: IT Staff claims unassigned ticket
   * AC-11, BR-10
   */
  it("API-14: allows IT Staff to claim unassigned ticket and update ticketOwnerId (AC-11, BR-10)", async () => {
    // 1. Create unassigned ticket
    const createRes = await request(app)
      .post("/api/tickets")
      .set("Authorization", `Bearer ${jenniferToken}`)
      .send({
        categoryId,
        relatedSystemId,
        requestedPriority: "HIGH",
        summary: "Ticket for claiming",
        description: "Testing claim assignment.",
      });
    expect(createRes.status).toBe(201);
    const ticketId = createRes.body.id;

    // 2. Michael Brown claims the ticket
    const claimRes = await request(app)
      .patch(`/api/staff/tickets/${ticketId}/assignment`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({ ticketOwnerId: staffId });

    expect(claimRes.status).toBe(200);
    expect(claimRes.body).toHaveProperty("ticketOwnerId", staffId);
    expect(claimRes.body).toHaveProperty("ticketOwner");
    expect(claimRes.body.ticketOwner.id).toBe(staffId);

    // 3. Verify in database
    const dbTicket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    expect(dbTicket!.ticketOwnerId).toBe(staffId);
  });

  /**
   * API-15: Assign ticket validation guards (inactive user, non-staff user, unassigning)
   * AC-11, BR-10
   */
  it("API-15: rejects assigning to inactive user or non-staff user with 422, permits unassigning with null (AC-11, BR-10)", async () => {
    // 1. Create ticket
    const createRes = await request(app)
      .post("/api/tickets")
      .set("Authorization", `Bearer ${jenniferToken}`)
      .send({
        categoryId,
        relatedSystemId,
        requestedPriority: "LOW",
        summary: "Assignment validation ticket",
        description: "Testing rejection of invalid owners.",
      });
    const ticketId = createRes.body.id;

    // Attempt to assign to a REQUESTER (Jennifer)
    const resRequesterAssign = await request(app)
      .patch(`/api/staff/tickets/${ticketId}/assignment`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({ ticketOwnerId: jenniferId });
    expect(resRequesterAssign.status).toBe(422);

    // Attempt to assign to inactive IT staff (Kevin Patel)
    const resInactiveAssign = await request(app)
      .patch(`/api/staff/tickets/${ticketId}/assignment`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({ ticketOwnerId: inactiveStaffId });
    expect(resInactiveAssign.status).toBe(422);

    // Attempt to assign to non-existent user
    const resNonExistent = await request(app)
      .patch(`/api/staff/tickets/${ticketId}/assignment`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({ ticketOwnerId: 999999 });
    expect(resNonExistent.status).toBe(422);

    // First assign to Michael Brown
    await request(app)
      .patch(`/api/staff/tickets/${ticketId}/assignment`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({ ticketOwnerId: staffId });

    // Now unassign by sending ticketOwnerId: null
    const unassignRes = await request(app)
      .patch(`/api/staff/tickets/${ticketId}/assignment`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({ ticketOwnerId: null });

    expect(unassignRes.status).toBe(200);
    expect(unassignRes.body.ticketOwnerId).toBeNull();
    expect(unassignRes.body.ticketOwner).toBeNull();
  });

  /**
   * API-16: Update IT Priority independently from requestedPriority
   * AC-12, BR-11
   */
  it("API-16: updates itPriority independently without changing requestedPriority (AC-12, BR-11)", async () => {
    // 1. Create ticket with requestedPriority MEDIUM
    const createRes = await request(app)
      .post("/api/tickets")
      .set("Authorization", `Bearer ${jenniferToken}`)
      .send({
        categoryId,
        relatedSystemId,
        requestedPriority: "MEDIUM",
        summary: "Priority decoupling ticket",
        description: "Checking itPriority modification.",
      });
    const ticketId = createRes.body.id;
    expect(createRes.body.requestedPriority).toBe("MEDIUM");
    expect(createRes.body.itPriority).toBe("MEDIUM");

    // 2. Staff updates itPriority to URGENT
    const updateRes = await request(app)
      .patch(`/api/staff/tickets/${ticketId}/priority`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({ itPriority: "URGENT" });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.requestedPriority).toBe("MEDIUM");
    expect(updateRes.body.itPriority).toBe("URGENT");

    // 3. Verify in database
    const dbTicket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    expect(dbTicket!.requestedPriority).toBe("MEDIUM");
    expect(dbTicket!.itPriority).toBe("URGENT");
  });

  /**
   * API-17: Permitted status transitions
   * AC-13, BR-14
   */
  it("API-17: permits valid status transitions (NEW -> IN_PROGRESS, RESOLVED -> CLOSED, CLOSED -> REOPENED) (AC-13, BR-14)", async () => {
    // 1. Create ticket (status = NEW)
    const createRes = await request(app)
      .post("/api/tickets")
      .set("Authorization", `Bearer ${jenniferToken}`)
      .send({
        categoryId,
        relatedSystemId,
        requestedPriority: "HIGH",
        summary: "Lifecycle testing ticket",
        description: "Testing lifecycle progression.",
      });
    const ticketId = createRes.body.id;
    expect(createRes.body.currentStatus).toBe("NEW");

    // NEW -> IN_PROGRESS
    const inProgressRes = await request(app)
      .patch(`/api/staff/tickets/${ticketId}/status`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({ currentStatus: "IN_PROGRESS" });
    expect(inProgressRes.status).toBe(200);
    expect(inProgressRes.body.currentStatus).toBe("IN_PROGRESS");

    // IN_PROGRESS -> RESOLVED (with resolutionSummary)
    const resolvedRes = await request(app)
      .patch(`/api/staff/tickets/${ticketId}/status`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({
        currentStatus: "RESOLVED",
        resolutionSummary: "Replaced faulty switch port and verified uplink connectivity.",
      });
    expect(resolvedRes.status).toBe(200);
    expect(resolvedRes.body.currentStatus).toBe("RESOLVED");
    expect(resolvedRes.body.resolutionSummary).toBe("Replaced faulty switch port and verified uplink connectivity.");

    // RESOLVED -> CLOSED (preserving resolutionSummary)
    const closedRes = await request(app)
      .patch(`/api/staff/tickets/${ticketId}/status`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({ currentStatus: "CLOSED" });
    expect(closedRes.status).toBe(200);
    expect(closedRes.body.currentStatus).toBe("CLOSED");
    expect(closedRes.body.resolutionSummary).toBe("Replaced faulty switch port and verified uplink connectivity.");

    // CLOSED -> REOPENED
    const reopenedRes = await request(app)
      .patch(`/api/staff/tickets/${ticketId}/status`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({ currentStatus: "REOPENED" });
    expect(reopenedRes.status).toBe(200);
    expect(reopenedRes.body.currentStatus).toBe("REOPENED");
  });

  /**
   * API-18: Disallowed status transitions rejected with 422
   * AC-13, BR-14
   */
  it("API-18: rejects disallowed status transitions (e.g. NEW -> CLOSED, CANCELLED -> OPEN) with HTTP 422 (AC-13, BR-14)", async () => {
    // 1. Create ticket (status = NEW)
    const createRes = await request(app)
      .post("/api/tickets")
      .set("Authorization", `Bearer ${jenniferToken}`)
      .send({
        categoryId,
        relatedSystemId,
        requestedPriority: "LOW",
        summary: "Invalid jump ticket",
        description: "Checking rejection of illegal jumps.",
      });
    const ticketId = createRes.body.id;

    // Try NEW -> CLOSED directly
    const jumpRes = await request(app)
      .patch(`/api/staff/tickets/${ticketId}/status`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({ currentStatus: "CLOSED" });
    expect(jumpRes.status).toBe(422);

    // Cancel ticket (NEW -> CANCELLED is permitted)
    const cancelRes = await request(app)
      .patch(`/api/staff/tickets/${ticketId}/status`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({ currentStatus: "CANCELLED" });
    expect(cancelRes.status).toBe(200);

    // Try CANCELLED -> OPEN (CANCELLED is terminal)
    const fromCancelledRes = await request(app)
      .patch(`/api/staff/tickets/${ticketId}/status`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({ currentStatus: "OPEN" });
    expect(fromCancelledRes.status).toBe(422);
  });

  /**
   * API-19: Transitioning to RESOLVED requires resolutionSummary (min 5 chars)
   * AC-13, BR-15
   */
  it("API-19: rejects transition to RESOLVED without resolutionSummary (min 5 chars) with HTTP 422 (AC-13, BR-15)", async () => {
    // 1. Create ticket and transition to IN_PROGRESS
    const createRes = await request(app)
      .post("/api/tickets")
      .set("Authorization", `Bearer ${jenniferToken}`)
      .send({
        categoryId,
        relatedSystemId,
        requestedPriority: "MEDIUM",
        summary: "Resolution summary check ticket",
        description: "Checking mandatory summary on RESOLVED.",
      });
    const ticketId = createRes.body.id;

    await request(app)
      .patch(`/api/staff/tickets/${ticketId}/status`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({ currentStatus: "IN_PROGRESS" });

    // Missing resolutionSummary
    const resMissing = await request(app)
      .patch(`/api/staff/tickets/${ticketId}/status`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({ currentStatus: "RESOLVED" });
    expect(resMissing.status).toBe(422);

    // Empty / whitespace resolutionSummary
    const resWhitespace = await request(app)
      .patch(`/api/staff/tickets/${ticketId}/status`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({ currentStatus: "RESOLVED", resolutionSummary: "    " });
    expect(resWhitespace.status).toBe(422);

    // Too short (< 5 chars)
    const resShort = await request(app)
      .patch(`/api/staff/tickets/${ticketId}/status`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({ currentStatus: "RESOLVED", resolutionSummary: "Done" });
    expect(resShort.status).toBe(422);
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
