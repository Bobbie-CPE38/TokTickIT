import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

describe("Lab 4 Ticket Status Workflow & Concurrency API Tests (API-11 through API-16, API-22)", () => {
  const prisma = getPrisma();
  let jenniferToken: string;
  let staffToken: string;
  let adminToken: string;
  let categoryId: number;
  let relatedSystemId: number;

  beforeAll(async () => {
    // 1. Authenticate Jennifer (Requester)
    const loginReq = await request(app)
      .post("/api/auth/login")
      .send({
        email: "jennifer.anderson@kmutt.ac.th",
        password: "Password123!",
      });
    expect(loginReq.status).toBe(200);
    jenniferToken = loginReq.body.token;

    // 2. Authenticate Michael (IT Staff)
    const loginStaff = await request(app)
      .post("/api/auth/login")
      .send({
        email: "staff.michael@toktickit.com",
        password: "Password123!",
      });
    expect(loginStaff.status).toBe(200);
    staffToken = loginStaff.body.token;

    // 3. Authenticate Admin
    const loginAdmin = await request(app)
      .post("/api/auth/login")
      .send({
        email: "admin@toktickit.com",
        password: "AdminPass123!",
      });
    expect(loginAdmin.status).toBe(200);
    adminToken = loginAdmin.body.token;

    const cat = await prisma.category.findFirst({ where: { isActive: true } });
    const sys = await prisma.relatedSystem.findFirst({ where: { isActive: true } });
    categoryId = cat!.id;
    relatedSystemId = sys!.id;
  });

  /**
   * Helper to create a fresh ticket as Jennifer
   */
  async function createTestTicket(summary = "Workflow test ticket"): Promise<number> {
    const res = await request(app)
      .post("/api/tickets")
      .set("Authorization", `Bearer ${jenniferToken}`)
      .send({
        categoryId,
        relatedSystemId,
        requestedPriority: "MEDIUM",
        summary,
        description: "Testing status lifecycle and concurrency.",
      });
    expect(res.status).toBe(201);
    return res.body.id;
  }

  /**
   * API-11: Attempt transitioning ticket to RESOLVED with 0 Actions Taken
   * AC-08, BR-09
   */
  it("API-11: rejects transition to RESOLVED with 0 Actions Taken with HTTP 422 (AC-08, BR-09)", async () => {
    const ticketId = await createTestTicket("Resolution gate 0 actions test");

    // Move to IN_PROGRESS
    const moveRes = await request(app)
      .patch(`/api/staff/tickets/${ticketId}/status`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({ status: "IN_PROGRESS" });
    expect(moveRes.status).toBe(200);

    // Attempt to RESOLVE without any ActionTaken
    const res = await request(app)
      .patch(`/api/staff/tickets/${ticketId}/status`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({
        status: "RESOLVED",
        resolutionSummary: "Replaced hardware and verified operation.",
      });

    expect(res.status).toBe(422);
    expect(res.body.error).toMatch(/at least one action taken must be recorded before resolution/i);
  });

  /**
   * API-12: Attempt transitioning ticket to RESOLVED with Actions Taken present but empty resolutionSummary
   * AC-09, BR-09
   */
  it("API-12: rejects transition to RESOLVED with Actions Taken but invalid resolutionSummary (< 5 chars) with HTTP 422 (AC-09, BR-09)", async () => {
    const ticketId = await createTestTicket("Resolution gate summary test");

    await request(app)
      .patch(`/api/staff/tickets/${ticketId}/status`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({ status: "IN_PROGRESS" });

    // Record an ActionTaken
    const actionRes = await request(app)
      .post(`/api/tickets/${ticketId}/actions-taken`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({
        description: "Diagnostic scan performed.",
        result: "Found memory parity error.",
        isFollowUpRequired: false,
      });
    expect(actionRes.status).toBe(201);

    // Missing resolutionSummary
    const resMissing = await request(app)
      .patch(`/api/staff/tickets/${ticketId}/status`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({ status: "RESOLVED" });
    expect(resMissing.status).toBe(422);
    expect(resMissing.body.error).toMatch(/resolutionSummary is required/i);

    // Empty / whitespace
    const resWhitespace = await request(app)
      .patch(`/api/staff/tickets/${ticketId}/status`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({ status: "RESOLVED", resolutionSummary: "   " });
    expect(resWhitespace.status).toBe(422);

    // Less than 5 chars
    const resShort = await request(app)
      .patch(`/api/staff/tickets/${ticketId}/status`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({ status: "RESOLVED", resolutionSummary: "Done" });
    expect(resShort.status).toBe(422);
  });

  /**
   * API-13: Transition ticket to RESOLVED with Actions Taken AND valid resolutionSummary
   * AC-08, AC-09
   */
  it("API-13: transitions ticket to RESOLVED with Actions Taken and valid resolutionSummary (AC-08, AC-09)", async () => {
    const ticketId = await createTestTicket("Valid resolution test");

    await request(app)
      .patch(`/api/staff/tickets/${ticketId}/status`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({ status: "IN_PROGRESS" });

    // Record ActionTaken
    await request(app)
      .post(`/api/tickets/${ticketId}/actions-taken`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({
        description: "Replaced degraded memory module in slot 2.",
        result: "Memory diagnostics completed 0 errors across 4 passes.",
        isFollowUpRequired: false,
      });

    const res = await request(app)
      .patch(`/api/staff/tickets/${ticketId}/status`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({
        status: "RESOLVED",
        resolutionSummary: "Faulty RAM module replaced with 16GB ECC DDR4 module. System rebooted cleanly.",
      });

    expect(res.status).toBe(200);
    expect(res.body.currentStatus).toBe("RESOLVED");
    expect(res.body.resolutionSummary).toBe(
      "Faulty RAM module replaced with 16GB ECC DDR4 module. System rebooted cleanly."
    );
  });

  /**
   * API-14: Requester signals "Problem Appears Resolved"
   * AC-10, BR-10
   */
  it("API-14: sets isRequesterResolved = true without modifying currentStatus when requester signals problem resolved (AC-10, BR-10)", async () => {
    const ticketId = await createTestTicket("Advisory resolution indication test");

    const patchRes = await request(app)
      .patch(`/api/tickets/${ticketId}/resolve-indication`)
      .set("Authorization", `Bearer ${jenniferToken}`);

    expect(patchRes.status).toBe(200);
    expect(patchRes.body.isRequesterResolved).toBe(true);

    // Verify ticket status in DB is still NEW
    const dbTicket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    expect(dbTicket!.currentStatus).toBe("NEW");
    expect(dbTicket!.isRequesterResolved).toBe(true);
  });

  /**
   * API-15: Optimistic Concurrency Check: status update with stale expectedUpdatedAt
   * AC-11, BR-12
   */
  it("API-15: aborts status update with HTTP 409 Conflict when expectedUpdatedAt is stale (AC-11, BR-12)", async () => {
    const ticketId = await createTestTicket("Concurrency conflict status test");

    // Fetch authoritative ticket detail
    const detailRes = await request(app)
      .get(`/api/staff/tickets/${ticketId}`)
      .set("Authorization", `Bearer ${staffToken}`);
    expect(detailRes.status).toBe(200);
    const initialUpdatedAt = detailRes.body.updatedAt;

    // Simulate an interim modification by another user (e.g. Priority change)
    await request(app)
      .patch(`/api/staff/tickets/${ticketId}/priority`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ itPriority: "URGENT" });

    // Now Michael attempts to change status using the stale initialUpdatedAt
    const staleRes = await request(app)
      .patch(`/api/staff/tickets/${ticketId}/status`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({
        status: "IN_PROGRESS",
        expectedUpdatedAt: initialUpdatedAt,
      });

    expect(staleRes.status).toBe(409);
    expect(staleRes.body.error).toMatch(/modified by another user|conflict/i);
    expect(staleRes.body.currentUpdatedAt).toBeDefined();

    // Verify assignment also rejects stale expectedUpdatedAt
    const staleAssignRes = await request(app)
      .patch(`/api/staff/tickets/${ticketId}/assignment`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({
        ticketOwnerId: null,
        expectedUpdatedAt: initialUpdatedAt,
      });
    expect(staleAssignRes.status).toBe(409);

    // Verify priority also rejects stale expectedUpdatedAt
    const stalePriorityRes = await request(app)
      .patch(`/api/staff/tickets/${ticketId}/priority`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({
        itPriority: "LOW",
        expectedUpdatedAt: initialUpdatedAt,
      });
    expect(stalePriorityRes.status).toBe(409);
  });

  /**
   * API-16: Complete 8-status state machine validation
   * AC-14, BR-11
   */
  it("API-16: strictly enforces permitted transitions and rejects illegal jumps with HTTP 422 (AC-14, BR-11)", async () => {
    const ticketId = await createTestTicket("Lifecycle state machine test");

    // NEW -> CLOSED (illegal jump)
    const illegalJump1 = await request(app)
      .patch(`/api/staff/tickets/${ticketId}/status`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({ status: "CLOSED" });
    expect(illegalJump1.status).toBe(422);

    // NEW -> OPEN (permitted)
    const toOpen = await request(app)
      .patch(`/api/staff/tickets/${ticketId}/status`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({ status: "OPEN" });
    expect(toOpen.status).toBe(200);
    expect(toOpen.body.currentStatus).toBe("OPEN");

    // OPEN -> WAITING_FOR_REQUESTER (permitted)
    const toWaiting = await request(app)
      .patch(`/api/staff/tickets/${ticketId}/status`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({ status: "WAITING_FOR_REQUESTER" });
    expect(toWaiting.status).toBe(200);
    expect(toWaiting.body.currentStatus).toBe("WAITING_FOR_REQUESTER");

    // WAITING_FOR_REQUESTER -> IN_PROGRESS (permitted)
    const toInProgress = await request(app)
      .patch(`/api/staff/tickets/${ticketId}/status`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({ status: "IN_PROGRESS" });
    expect(toInProgress.status).toBe(200);
    expect(toInProgress.body.currentStatus).toBe("IN_PROGRESS");

    // Record ActionTaken for Resolution Gate
    await request(app)
      .post(`/api/tickets/${ticketId}/actions-taken`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({
        description: "Updated software packages and cleared cache.",
        result: "Service restored to normal operational state.",
      });

    // IN_PROGRESS -> RESOLVED (permitted)
    const toResolved = await request(app)
      .patch(`/api/staff/tickets/${ticketId}/status`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({
        status: "RESOLVED",
        resolutionSummary: "Software packages patched and cache cleared successfully.",
      });
    expect(toResolved.status).toBe(200);
    expect(toResolved.body.currentStatus).toBe("RESOLVED");

    // RESOLVED -> IN_PROGRESS (illegal jump)
    const illegalJump2 = await request(app)
      .patch(`/api/staff/tickets/${ticketId}/status`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({ status: "IN_PROGRESS" });
    expect(illegalJump2.status).toBe(422);

    // RESOLVED -> CLOSED (permitted, retains resolutionSummary)
    const toClosed = await request(app)
      .patch(`/api/staff/tickets/${ticketId}/status`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({ status: "CLOSED" });
    expect(toClosed.status).toBe(200);
    expect(toClosed.body.currentStatus).toBe("CLOSED");
    expect(toClosed.body.resolutionSummary).toBe(
      "Software packages patched and cache cleared successfully."
    );

    // CLOSED -> RESOLVED (illegal jump)
    const illegalJump3 = await request(app)
      .patch(`/api/staff/tickets/${ticketId}/status`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({ status: "RESOLVED", resolutionSummary: "Another summary" });
    expect(illegalJump3.status).toBe(422);

    // CLOSED -> REOPENED (permitted)
    const toReopened = await request(app)
      .patch(`/api/staff/tickets/${ticketId}/status`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({ status: "REOPENED" });
    expect(toReopened.status).toBe(200);
    expect(toReopened.body.currentStatus).toBe("REOPENED");

    // REOPENED -> CANCELLED (permitted)
    const toCancelled = await request(app)
      .patch(`/api/staff/tickets/${ticketId}/status`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({ status: "CANCELLED" });
    expect(toCancelled.status).toBe(200);
    expect(toCancelled.body.currentStatus).toBe("CANCELLED");

    // CANCELLED is terminal: CANCELLED -> REOPENED must fail with 422
    const illegalFromCancelled = await request(app)
      .patch(`/api/staff/tickets/${ticketId}/status`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({ status: "REOPENED" });
    expect(illegalFromCancelled.status).toBe(422);
  });

  /**
   * API-22: Legacy ticket compatibility: tickets with 0 Actions Taken handled gracefully
   * AC-15, BR-16
   */
  it("API-22: legacy tickets with 0 Actions Taken return empty array and remain operable (AC-15, BR-16)", async () => {
    const ticketId = await createTestTicket("Legacy compatibility test");

    // Fetch detail
    const detailRes = await request(app)
      .get(`/api/staff/tickets/${ticketId}`)
      .set("Authorization", `Bearer ${staffToken}`);

    expect(detailRes.status).toBe(200);
    expect(Array.isArray(detailRes.body.actionsTaken)).toBe(true);
    expect(detailRes.body.actionsTaken).toHaveLength(0);

    // Ticket remains fully operable: update priority
    const priorityRes = await request(app)
      .patch(`/api/staff/tickets/${ticketId}/priority`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({ itPriority: "HIGH" });
    expect(priorityRes.status).toBe(200);
    expect(priorityRes.body.itPriority).toBe("HIGH");

    // Ticket remains operable: advance status to OPEN
    const statusRes = await request(app)
      .patch(`/api/staff/tickets/${ticketId}/status`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({ status: "OPEN" });
    expect(statusRes.status).toBe(200);
    expect(statusRes.body.currentStatus).toBe("OPEN");
  });
});
