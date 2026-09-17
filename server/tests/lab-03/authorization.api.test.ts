import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

describe("Lab 3 Authorization & Requester Session Isolation API Tests (API-09, API-10, API-35)", () => {
  const prisma = getPrisma();
  let jenniferToken: string;
  let davidToken: string;
  let staffToken: string;
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

    // Authenticate Michael Brown (IT Staff)
    const loginStaff = await request(app)
      .post("/api/auth/login")
      .send({
        email: "staff.michael@toktickit.com",
        password: "Password123!",
      });
    expect(loginStaff.status).toBe(200);
    staffToken = loginStaff.body.token;

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

  /**
   * API-33: IT Staff and Admin can upload attachments to queue tickets under Option B
   * AC-25, FR-12, BR-23
   */
  it("API-33: permits IT Staff to upload attachments to any ticket under Option B (BR-23, AC-25)", async () => {
    // 1. Create a ticket as Jennifer
    const createRes = await request(app)
      .post("/api/tickets")
      .set("Authorization", `Bearer ${jenniferToken}`)
      .send({
        categoryId,
        relatedSystemId,
        requestedPriority: "LOW",
        summary: "Option B Attachment Test Ticket",
        description: "Checking staff attachment upload.",
      });
    expect(createRes.status).toBe(201);
    const ticketId = createRes.body.id;

    // 2. Michael Brown (IT Staff) uploads an attachment to Jennifer's ticket
    const fileBuffer = Buffer.from("fake-png-image-content-bytes");
    const uploadRes = await request(app)
      .post(`/api/tickets/${ticketId}/attachments`)
      .set("Authorization", `Bearer ${staffToken}`)
      .attach("file", fileBuffer, {
        filename: "diagnostic.png",
        contentType: "image/png",
      });

    expect(uploadRes.status).toBe(201);
    expect(uploadRes.body).toHaveProperty("id");
    expect(uploadRes.body).toHaveProperty("originalFileName", "diagnostic.png");
    const attachmentId = uploadRes.body.id;

    // 3. Staff can download the attachment
    const downloadRes = await request(app)
      .get(`/api/attachments/${attachmentId}/download`)
      .set("Authorization", `Bearer ${staffToken}`);
    expect(downloadRes.status).toBe(200);

    // 4. Staff can soft-remove the attachment
    const removeRes = await request(app)
      .patch(`/api/attachments/${attachmentId}/soft-remove`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({ removalReason: "Superseded by updated diagnostics report." });
    expect(removeRes.status).toBe(200);
    expect(removeRes.body.isRemoved).toBe(true);

    // 5. Cross-requester: David cannot download Jennifer's ticket attachment (returns 404)
    const davidDownloadRes = await request(app)
      .get(`/api/attachments/${attachmentId}/download`)
      .set("Authorization", `Bearer ${davidToken}`);
    expect(davidDownloadRes.status).toBe(404);
  });
});

