import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

describe("Lab 3 Comments API Tests (API-21, API-24)", () => {
  const prisma = getPrisma();
  let jenniferToken: string;
  let davidToken: string;
  let staffToken: string;
  let categoryId: number;
  let relatedSystemId: number;
  let jenniferTicketId: number;

  beforeAll(async () => {
    // Authenticate Jennifer Anderson (Requester A)
    const loginA = await request(app)
      .post("/api/auth/login")
      .send({
        email: "jennifer.anderson@kmutt.ac.th",
        password: "Password123!",
      });
    expect(loginA.status).toBe(200);
    jenniferToken = loginA.body.token;

    // Authenticate David Lee (Requester B)
    const loginB = await request(app)
      .post("/api/auth/login")
      .send({
        email: "david.lee@kmutt.ac.th",
        password: "Password123!",
      });
    expect(loginB.status).toBe(200);
    davidToken = loginB.body.token;

    // Authenticate Michael Brown (IT Staff)
    const loginStaff = await request(app)
      .post("/api/auth/login")
      .send({
        email: "staff.michael@toktickit.com",
        password: "Password123!",
      });
    expect(loginStaff.status).toBe(200);
    staffToken = loginStaff.body.token;

    const category = await prisma.category.findFirst({ where: { isActive: true } });
    const relatedSystem = await prisma.relatedSystem.findFirst({ where: { isActive: true } });
    categoryId = category!.id;
    relatedSystemId = relatedSystem!.id;

    // Create a ticket for Jennifer
    const ticketRes = await request(app)
      .post("/api/tickets")
      .set("Authorization", `Bearer ${jenniferToken}`)
      .send({
        categoryId,
        relatedSystemId,
        requestedPriority: "MEDIUM",
        summary: "Comments test ticket",
        description: "Ticket for verifying public comments flow.",
      });
    expect(ticketRes.status).toBe(201);
    jenniferTicketId = ticketRes.body.id;
  });

  /**
   * API-21: Public comments posting and retrieval
   * AC-14, BR-12
   */
  it("API-21: allows Requester and IT Staff to post Public Comments, and retrieves them in chronological order (AC-14, BR-12)", async () => {
    // 1. Requester posts a comment
    const commentRes1 = await request(app)
      .post(`/api/tickets/${jenniferTicketId}/comments`)
      .set("Authorization", `Bearer ${jenniferToken}`)
      .send({
        content: "Hello, my laptop is still heating up. Any updates?",
      });

    expect(commentRes1.status).toBe(201);
    expect(commentRes1.body).toHaveProperty("id");
    expect(commentRes1.body).toHaveProperty("ticketId", jenniferTicketId);
    expect(commentRes1.body.content).toBe("Hello, my laptop is still heating up. Any updates?");
    expect(commentRes1.body).toHaveProperty("createdAt");
    expect(commentRes1.body).toHaveProperty("author");
    expect(commentRes1.body.author).toEqual({
      id: expect.any(Number),
      name: "Jennifer Anderson",
      role: "REQUESTER",
    });

    // 2. IT Staff posts a response comment on the same ticket
    const commentRes2 = await request(app)
      .post(`/api/tickets/${jenniferTicketId}/comments`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({
        content: "We have reviewed the diagnostics. A technician will replace the thermal paste today.",
      });

    expect(commentRes2.status).toBe(201);
    expect(commentRes2.body.author.role).toBe("IT_STAFF");
    expect(commentRes2.body.author.name).toBe("Michael Brown");

    // 3. Requester retrieves comments
    const getRes = await request(app)
      .get(`/api/tickets/${jenniferTicketId}/comments`)
      .set("Authorization", `Bearer ${jenniferToken}`);

    expect(getRes.status).toBe(200);
    expect(Array.isArray(getRes.body)).toBe(true);
    expect(getRes.body.length).toBeGreaterThanOrEqual(2);
    expect(getRes.body[0].content).toBe("Hello, my laptop is still heating up. Any updates?");
    expect(getRes.body[1].content).toBe("We have reviewed the diagnostics. A technician will replace the thermal paste today.");
  });

  it("API-21: returns HTTP 404 Not Found when Requester B attempts to view or post comments on Requester A's ticket", async () => {
    // David attempts to read comments on Jennifer's ticket
    const getRes = await request(app)
      .get(`/api/tickets/${jenniferTicketId}/comments`)
      .set("Authorization", `Bearer ${davidToken}`);

    expect(getRes.status).toBe(404);
    expect(getRes.body).toHaveProperty("error");

    // David attempts to post comment on Jennifer's ticket
    const postRes = await request(app)
      .post(`/api/tickets/${jenniferTicketId}/comments`)
      .set("Authorization", `Bearer ${davidToken}`)
      .send({
        content: "Trying to comment on another requester's ticket",
      });

    expect(postRes.status).toBe(404);
    expect(postRes.body).toHaveProperty("error");
  });

  /**
   * API-24: Comment and Note content validation rejection with 422
   * BR-13
   */
  it("API-24: rejects empty or whitespace-only comment submissions with HTTP 422 Unprocessable Entity (BR-13)", async () => {
    // Empty content
    const resEmpty = await request(app)
      .post(`/api/tickets/${jenniferTicketId}/comments`)
      .set("Authorization", `Bearer ${jenniferToken}`)
      .send({ content: "" });

    expect(resEmpty.status).toBe(422);
    expect(resEmpty.body).toHaveProperty("error");

    // Whitespace only
    const resWhitespace = await request(app)
      .post(`/api/tickets/${jenniferTicketId}/comments`)
      .set("Authorization", `Bearer ${jenniferToken}`)
      .send({ content: "    \n\t  " });

    expect(resWhitespace.status).toBe(422);
    expect(resWhitespace.body).toHaveProperty("error");

    // Exceeding 2000 chars
    const resTooLong = await request(app)
      .post(`/api/tickets/${jenniferTicketId}/comments`)
      .set("Authorization", `Bearer ${jenniferToken}`)
      .send({ content: "A".repeat(2001) });

    expect(resTooLong.status).toBe(422);
    expect(resTooLong.body).toHaveProperty("error");

    // Missing content field
    const resMissing = await request(app)
      .post(`/api/tickets/${jenniferTicketId}/comments`)
      .set("Authorization", `Bearer ${jenniferToken}`)
      .send({});

    expect(resMissing.status).toBe(422);
    expect(resMissing.body).toHaveProperty("error");
  });

  /**
   * API-08 & API-22: Requester forbidden from accessing or posting Internal Notes
   * AC-09, BR-04
   */
  it("API-08 & API-22: strictly forbids Requesters from reading or creating Internal Notes with HTTP 403 (AC-09, BR-04)", async () => {
    // Requester attempts to GET internal notes
    const getRes = await request(app)
      .get(`/api/tickets/${jenniferTicketId}/notes`)
      .set("Authorization", `Bearer ${jenniferToken}`);

    expect(getRes.status).toBe(403);
    expect(getRes.body).toHaveProperty("error");

    // Requester attempts to POST internal note
    const postRes = await request(app)
      .post(`/api/tickets/${jenniferTicketId}/notes`)
      .set("Authorization", `Bearer ${jenniferToken}`)
      .send({ content: "Requester trying to write internal note" });

    expect(postRes.status).toBe(403);
    expect(postRes.body).toHaveProperty("error");
  });

  /**
   * API-23: IT Staff creates and reads Internal Notes
   * AC-15, BR-04
   */
  it("API-23: allows IT Staff to create and retrieve private Internal Notes in chronological order (AC-15, BR-04)", async () => {
    // 1. Staff posts internal note 1
    const postRes1 = await request(app)
      .post(`/api/tickets/${jenniferTicketId}/notes`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({
        content: "Root cause is thermal paste degradation on CPU heatsink.",
      });

    expect(postRes1.status).toBe(201);
    expect(postRes1.body).toHaveProperty("id");
    expect(postRes1.body).toHaveProperty("ticketId", jenniferTicketId);
    expect(postRes1.body.content).toBe("Root cause is thermal paste degradation on CPU heatsink.");
    expect(postRes1.body).toHaveProperty("createdAt");
    expect(postRes1.body).toHaveProperty("author");
    expect(postRes1.body.author).toEqual({
      id: expect.any(Number),
      name: "Michael Brown",
      role: "IT_STAFF",
    });

    // 2. Staff posts internal note 2
    const postRes2 = await request(app)
      .post(`/api/tickets/${jenniferTicketId}/notes`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({
        content: "Ordered Arctic Silver 5 thermal compound from IT inventory.",
      });

    expect(postRes2.status).toBe(201);

    // 3. Staff fetches internal notes
    const getRes = await request(app)
      .get(`/api/tickets/${jenniferTicketId}/notes`)
      .set("Authorization", `Bearer ${staffToken}`);

    expect(getRes.status).toBe(200);
    expect(Array.isArray(getRes.body)).toBe(true);
    expect(getRes.body.length).toBeGreaterThanOrEqual(2);
    expect(getRes.body[0].content).toBe("Root cause is thermal paste degradation on CPU heatsink.");
    expect(getRes.body[1].content).toBe("Ordered Arctic Silver 5 thermal compound from IT inventory.");
  });

  /**
   * API-24: Internal Note content validation rejection with 422
   * BR-13
   */
  it("API-24: rejects empty, whitespace-only, or overly long internal notes with HTTP 422 (BR-13)", async () => {
    // Empty content
    const resEmpty = await request(app)
      .post(`/api/tickets/${jenniferTicketId}/notes`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({ content: "" });
    expect(resEmpty.status).toBe(422);

    // Whitespace only
    const resWhitespace = await request(app)
      .post(`/api/tickets/${jenniferTicketId}/notes`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({ content: "   \t\n   " });
    expect(resWhitespace.status).toBe(422);

    // Exceeding 2000 chars
    const resTooLong = await request(app)
      .post(`/api/tickets/${jenniferTicketId}/notes`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({ content: "N".repeat(2001) });
    expect(resTooLong.status).toBe(422);
  });
});
