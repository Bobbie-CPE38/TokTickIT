import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { generateToken, AuthUser } from "../../src/core/tokens.js";
import { validateFollowUpNote } from "../../src/features/actions-taken/actions-taken.validation.js";

describe("Lab 4 Actions Taken API & Unit Tests (API-01 to API-10, UNIT-02)", () => {
  const prisma = getPrisma();
  let jenniferToken: string;
  let davidToken: string;
  let staffMichaelToken: string;
  let staffSarahToken: string;
  let inactiveStaffToken: string;
  let jenniferId: number;
  let davidId: number;
  let staffMichaelId: number;
  let staffSarahId: number;
  let inactiveStaffId: number;
  let categoryId: number;
  let relatedSystemId: number;

  let testTicketMichaelId: number;
  let testTicketDavidId: number;

  beforeAll(async () => {
    // 1. Authenticate Jennifer Anderson (Requester A)
    const loginA = await request(app)
      .post("/api/auth/login")
      .send({
        email: "jennifer.anderson@kmutt.ac.th",
        password: "Password123!",
      });
    expect(loginA.status).toBe(200);
    jenniferToken = loginA.body.token;
    jenniferId = loginA.body.user.id;

    // 2. Authenticate David Lee (Requester B)
    const loginB = await request(app)
      .post("/api/auth/login")
      .send({
        email: "david.lee@kmutt.ac.th",
        password: "Password123!",
      });
    expect(loginB.status).toBe(200);
    davidToken = loginB.body.token;
    davidId = loginB.body.user.id;

    // 3. Authenticate Michael Brown (IT Staff 1)
    const loginMichael = await request(app)
      .post("/api/auth/login")
      .send({
        email: "staff.michael@toktickit.com",
        password: "Password123!",
      });
    expect(loginMichael.status).toBe(200);
    staffMichaelToken = loginMichael.body.token;
    staffMichaelId = loginMichael.body.user.id;

    // 4. Authenticate Sarah Johnson (IT Staff 2)
    const loginSarah = await request(app)
      .post("/api/auth/login")
      .send({
        email: "staff.sarah@toktickit.com",
        password: "Password123!",
      });
    expect(loginSarah.status).toBe(200);
    staffSarahToken = loginSarah.body.token;
    staffSarahId = loginSarah.body.user.id;

    // 5. Inactive Staff (Kevin Patel)
    const inactiveUser = await prisma.user.findFirst({
      where: { email: "kpatel@toktickit.com" },
    });
    inactiveStaffId = inactiveUser!.id;
    inactiveStaffToken = generateToken(inactiveUser as AuthUser);

    // Fetch reference data
    const category = await prisma.category.findFirst({ where: { isActive: true } });
    const relatedSystem = await prisma.relatedSystem.findFirst({ where: { isActive: true } });
    categoryId = category!.id;
    relatedSystemId = relatedSystem!.id;

    // Create a test ticket owned by Michael Brown for Jennifer
    const ticketMichaelRes = await request(app)
      .post("/api/tickets")
      .set("Authorization", `Bearer ${jenniferToken}`)
      .send({
        categoryId,
        relatedSystemId,
        requestedPriority: "HIGH",
        summary: "Battery drains rapidly during presentation",
        description: "Laptop dies in under 30 minutes on battery power.",
      });
    expect(ticketMichaelRes.status).toBe(201);
    testTicketMichaelId = ticketMichaelRes.body.id;

    // Assign ticket to Michael Brown
    await prisma.ticket.update({
      where: { id: testTicketMichaelId },
      data: { ticketOwnerId: staffMichaelId, currentStatus: "IN_PROGRESS" },
    });

    // Create a test ticket owned by David Lee
    const ticketDavidRes = await request(app)
      .post("/api/tickets")
      .set("Authorization", `Bearer ${davidToken}`)
      .send({
        categoryId,
        relatedSystemId,
        requestedPriority: "LOW",
        summary: "David's personal ticket",
        description: "Need help configuring local dev environment.",
      });
    expect(ticketDavidRes.status).toBe(201);
    testTicketDavidId = ticketDavidRes.body.id;
  });

  /**
   * API-01: IT Staff creates valid Action Taken on a ticket
   * AC-01, BR-01, BR-03
   */
  it("API-01: allows IT Staff to create valid Action Taken on a ticket (AC-01, BR-01, BR-03)", async () => {
    const payload = {
      description: "Ran hardware diagnostic on laptop battery cells.",
      result: "Cell #2 degraded below 40% capacity. Replacement ordered.",
      isFollowUpRequired: false,
      attachmentNotes: "Diagnostic report attached.",
    };

    const res = await request(app)
      .post(`/api/tickets/${testTicketMichaelId}/actions-taken`)
      .set("Authorization", `Bearer ${staffMichaelToken}`)
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    expect(res.body.ticketId).toBe(testTicketMichaelId);
    expect(res.body.description).toBe(payload.description);
    expect(res.body.result).toBe(payload.result);
    expect(res.body.isFollowUpRequired).toBe(false);
    expect(res.body.followUpNote).toBeNull();
    expect(res.body.attachmentNotes).toBe(payload.attachmentNotes);
    expect(res.body.performedByUserId).toBe(staffMichaelId);
    expect(res.body.performedBy).toEqual({
      id: staffMichaelId,
      name: "Michael Brown",
      email: "staff.michael@toktickit.com",
      role: "IT_STAFF",
    });
    expect(res.body).toHaveProperty("actionDateTime");
    expect(res.body).toHaveProperty("createdAt");
    expect(res.body).toHaveProperty("updatedAt");
  });

  /**
   * API-02: Action Taken performed by staff member different from ticket owner
   * AC-01, BR-02
   */
  it("API-02: allows staff member to record Action Taken on ticket owned by another staff member (AC-01, BR-02)", async () => {
    // Ticket is owned by Michael Brown; Sarah Johnson performs the action
    const payload = {
      description: "Inspected physical battery connector and cleaned terminals.",
      result: "Terminals cleaned. Voltage reads nominal 11.4V.",
      isFollowUpRequired: false,
    };

    const res = await request(app)
      .post(`/api/tickets/${testTicketMichaelId}/actions-taken`)
      .set("Authorization", `Bearer ${staffSarahToken}`)
      .send(payload);

    expect(res.status).toBe(201);
    // Performer is Sarah
    expect(res.body.performedByUserId).toBe(staffSarahId);
    expect(res.body.performedBy.name).toBe("Sarah Johnson");

    // Verify ticket owner remains Michael Brown in database
    const ticketInDb = await prisma.ticket.findUnique({
      where: { id: testTicketMichaelId },
    });
    expect(ticketInDb!.ticketOwnerId).toBe(staffMichaelId);
  });

  /**
   * API-03: Create valid Action Taken matching Handout example
   * AC-01, FR-01
   */
  it("API-03: creates valid Action Taken matching Handout example (AC-01, FR-01)", async () => {
    const payload = {
      actionDateTime: "2026-05-12T10:15:00.000Z",
      description: "Ran hardware diagnostic on laptop battery cells.",
      result: "Cell #2 degraded below 40% capacity. Ordered replacement battery.",
      isFollowUpRequired: true,
      followUpNote: "Install replacement battery pack upon delivery (ETA May 14).",
      attachmentNotes: "Battery_health_report.pdf attached in attachments section.",
    };

    const res = await request(app)
      .post(`/api/tickets/${testTicketMichaelId}/actions-taken`)
      .set("Authorization", `Bearer ${staffSarahToken}`)
      .send(payload);

    expect(res.status).toBe(201);
    expect(new Date(res.body.actionDateTime).toISOString()).toBe("2026-05-12T10:15:00.000Z");
    expect(res.body.description).toBe(payload.description);
    expect(res.body.result).toBe(payload.result);
    expect(res.body.isFollowUpRequired).toBe(true);
    expect(res.body.followUpNote).toBe(payload.followUpNote);
    expect(res.body.attachmentNotes).toBe(payload.attachmentNotes);
  });

  /**
   * API-04: Create Action Taken with isFollowUpRequired = true but empty followUpNote
   * AC-03, BR-05
   */
  it("API-04: rejects Action Taken with isFollowUpRequired = true and empty followUpNote with HTTP 422 (AC-03, BR-05)", async () => {
    const payload = {
      description: "Tested cooling fan assembly.",
      result: "Bearing friction detected.",
      isFollowUpRequired: true,
      followUpNote: "   ", // Empty after trimming
    };

    const res = await request(app)
      .post(`/api/tickets/${testTicketMichaelId}/actions-taken`)
      .set("Authorization", `Bearer ${staffMichaelToken}`)
      .send(payload);

    expect(res.status).toBe(422);
    expect(res.body).toHaveProperty("error");
    expect(res.body.error).toMatch(/follow-?up/i);
  });

  /**
   * API-05: Create Action Taken with isFollowUpRequired = true and valid followUpNote (>= 3 chars)
   * AC-03, BR-05
   */
  it("API-05: accepts Action Taken with isFollowUpRequired = true and valid followUpNote (>= 3 chars) (AC-03, BR-05)", async () => {
    const payload = {
      description: "Tested power adapter output.",
      result: "Fluctuating between 15V and 19V.",
      isFollowUpRequired: true,
      followUpNote: "Swap adapter with unit from inventory.",
    };

    const res = await request(app)
      .post(`/api/tickets/${testTicketMichaelId}/actions-taken`)
      .set("Authorization", `Bearer ${staffMichaelToken}`)
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body.isFollowUpRequired).toBe(true);
    expect(res.body.followUpNote).toBe("Swap adapter with unit from inventory.");
  });

  /**
   * API-06: Deactivated IT Staff user attempts to record Action Taken
   * AC-04, BR-04
   */
  it("API-06: rejects Action Taken creation by deactivated IT Staff user with HTTP 403 or 422 (AC-04, BR-04)", async () => {
    const payload = {
      description: "Unauthorized action attempt by deactivated staff.",
      result: "Should not be recorded.",
      isFollowUpRequired: false,
    };

    const res = await request(app)
      .post(`/api/tickets/${testTicketMichaelId}/actions-taken`)
      .set("Authorization", `Bearer ${inactiveStaffToken}`)
      .send(payload);

    expect([403, 422]).toContain(res.status);
    expect(res.body).toHaveProperty("error");
  });

  /**
   * API-07: Update existing Action Taken via PATCH /api/actions-taken/:actionId
   * AC-05, FR-03
   */
  it("API-07: updates existing Action Taken via PATCH /api/actions-taken/:actionId (AC-05, FR-03)", async () => {
    // 1. Create initial action
    const createRes = await request(app)
      .post(`/api/tickets/${testTicketMichaelId}/actions-taken`)
      .set("Authorization", `Bearer ${staffMichaelToken}`)
      .send({
        description: "Initial diagnostic scan.",
        result: "Scan incomplete due to reboot.",
        isFollowUpRequired: false,
      });
    expect(createRes.status).toBe(201);
    const actionId = createRes.body.id;
    const initialUpdatedAt = createRes.body.updatedAt;

    // Small delay to ensure timestamp difference
    await new Promise((r) => setTimeout(r, 20));

    // 2. Update the action
    const updateRes = await request(app)
      .patch(`/api/actions-taken/${actionId}`)
      .set("Authorization", `Bearer ${staffSarahToken}`)
      .send({
        description: "Diagnostic scan completed successfully.",
        result: "No sector errors found on SSD.",
        isFollowUpRequired: true,
        followUpNote: "Run stress test overnight.",
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.id).toBe(actionId);
    expect(updateRes.body.description).toBe("Diagnostic scan completed successfully.");
    expect(updateRes.body.result).toBe("No sector errors found on SSD.");
    expect(updateRes.body.isFollowUpRequired).toBe(true);
    expect(updateRes.body.followUpNote).toBe("Run stress test overnight.");
    expect(updateRes.body.performedByUserId).toBe(staffMichaelId); // Original creator preserved
    expect(new Date(updateRes.body.updatedAt).getTime()).toBeGreaterThanOrEqual(
      new Date(initialUpdatedAt).getTime()
    );
  });

  /**
   * API-08: Requester fetches Actions Taken for owned ticket
   * AC-06, BR-07, BR-08
   */
  it("API-08: allows Requester to fetch Actions Taken for owned ticket in chronological order (AC-06, BR-07, BR-08)", async () => {
    const res = await request(app)
      .get(`/api/tickets/${testTicketMichaelId}/actions-taken`)
      .set("Authorization", `Bearer ${jenniferToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);

    // Verify chronological ordering by actionDateTime ASC
    for (let i = 0; i < res.body.length - 1; i++) {
      const current = new Date(res.body[i].actionDateTime).getTime();
      const next = new Date(res.body[i + 1].actionDateTime).getTime();
      expect(current).toBeLessThanOrEqual(next);
    }

    // Verify action contains performer details
    const firstAction = res.body[0];
    expect(firstAction).toHaveProperty("id");
    expect(firstAction).toHaveProperty("description");
    expect(firstAction).toHaveProperty("result");
    expect(firstAction).toHaveProperty("performedBy");
    expect(firstAction.performedBy).toHaveProperty("name");
  });

  /**
   * API-09: Requester attempts to create Action Taken
   * AC-07, BR-07
   */
  it("API-09: rejects Requester attempt to create Action Taken with HTTP 403 Forbidden (AC-07, BR-07)", async () => {
    const payload = {
      description: "Requester attempting to log technical action.",
      result: "Forbidden.",
      isFollowUpRequired: false,
    };

    const res = await request(app)
      .post(`/api/tickets/${testTicketMichaelId}/actions-taken`)
      .set("Authorization", `Bearer ${jenniferToken}`)
      .send(payload);

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty("error");
  });

  /**
   * API-10: Requester queries Actions Taken on another user's ticket
   * AC-06, BR-07, BR-13
   */
  it("API-10: returns HTTP 404 Not Found without leaking data when Requester queries another user's ticket (AC-06, BR-07, BR-13)", async () => {
    // Jennifer queries David's ticket
    const res = await request(app)
      .get(`/api/tickets/${testTicketDavidId}/actions-taken`)
      .set("Authorization", `Bearer ${jenniferToken}`);

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty("error");
  });

  /**
   * Append-Only Audit Trail (BR-08): No DELETE endpoint registered
   */
  it("BR-08: rejects DELETE /api/actions-taken/:actionId to protect append-only audit trail", async () => {
    const res = await request(app)
      .delete(`/api/actions-taken/1`)
      .set("Authorization", `Bearer ${staffMichaelToken}`);

    expect([404, 405]).toContain(res.status);
  });

  /**
   * UNIT-02: Conditional follow-up note validation and sanitization helper unit tests
   * AC-03, BR-05
   */
  describe("UNIT-02: validateFollowUpNote unit test (AC-03, BR-05)", () => {
    it("coerces note to null when isFollowUpRequired is false", () => {
      expect(validateFollowUpNote(false, "Some note")).toBeNull();
      expect(validateFollowUpNote(false, null)).toBeNull();
      expect(validateFollowUpNote(false, undefined)).toBeNull();
      expect(validateFollowUpNote(false, "")).toBeNull();
    });

    it("accepts valid followUpNote (3 to 1000 characters) when isFollowUpRequired is true", () => {
      const validNote = "Order parts immediately";
      expect(validateFollowUpNote(true, validNote)).toBe(validNote);

      const trimmedNote = "   Replace thermal paste   ";
      expect(validateFollowUpNote(true, trimmedNote)).toBe("Replace thermal paste");
    });

    it("throws UnprocessableEntityError when isFollowUpRequired is true and note is missing, empty, or too short", () => {
      expect(() => validateFollowUpNote(true, "")).toThrow();
      expect(() => validateFollowUpNote(true, "   ")).toThrow();
      expect(() => validateFollowUpNote(true, null)).toThrow();
      expect(() => validateFollowUpNote(true, undefined)).toThrow();
      expect(() => validateFollowUpNote(true, "ab")).toThrow(); // 2 chars < 3
    });

    it("throws UnprocessableEntityError when followUpNote exceeds 1000 characters", () => {
      const longNote = "a".repeat(1001);
      expect(() => validateFollowUpNote(true, longNote)).toThrow();
    });
  });
});
