import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

describe("Lab 2 Ticket Detail API Tests (API-10)", () => {
  const prisma = getPrisma();

  /**
   * API-10: GET /api/tickets/:id for ticket detail inspection and ownership isolation
   * Requirements: AC-03, BR-04, FR-13, FR-14
   */
  describe("GET /api/tickets/:id", () => {
    it("API-10: returns HTTP 200 with full ticket metadata and attachments for owned ticket (FR-13, AC-01)", async () => {
      // Find Jennifer Anderson (Requester A)
      const jennifer = await prisma.developmentRequester.findFirst({
        where: { email: "jennifer.anderson@kmutt.ac.th", isActive: true },
      });
      expect(jennifer).not.toBeNull();

      // Find Jennifer's ticket TKT-2026-000101
      const ticket = await prisma.ticket.findFirst({
        where: { ticketNumber: "TKT-2026-000101", requesterId: jennifer!.id },
      });
      expect(ticket).not.toBeNull();

      const res = await request(app)
        .get(`/api/tickets/${ticket!.id}`)
        .set("X-Requester-Id", jennifer!.id.toString());

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("id", ticket!.id);
      expect(res.body).toHaveProperty("ticketNumber", ticket!.ticketNumber);
      expect(res.body).toHaveProperty("summary", ticket!.summary);
      expect(res.body).toHaveProperty("description", ticket!.description);
      expect(res.body).toHaveProperty("requestedPriority");
      expect(res.body).toHaveProperty("itPriority");
      expect(res.body).toHaveProperty("currentStatus");
      expect(res.body).toHaveProperty("ticketOwner");
      expect(res.body).toHaveProperty("resolutionSummary");
      expect(res.body).toHaveProperty("requesterId", jennifer!.id);
      expect(res.body).toHaveProperty("requester");
      expect(res.body.requester).toEqual({
        id: jennifer!.id,
        name: jennifer!.name,
        email: jennifer!.email,
        department: jennifer!.department,
      });
      expect(res.body).toHaveProperty("categoryId");
      expect(res.body).toHaveProperty("category");
      expect(res.body.category).toHaveProperty("name");
      expect(res.body).toHaveProperty("relatedSystemId");
      expect(res.body).toHaveProperty("relatedSystem");
      expect(res.body.relatedSystem).toHaveProperty("name");
      expect(res.body).toHaveProperty("attachments");
      expect(Array.isArray(res.body.attachments)).toBe(true);
      expect(res.body).toHaveProperty("createdAt");
      expect(res.body).toHaveProperty("updatedAt");
    });

    it("API-10: returns HTTP 403 Forbidden / 404 Not Found when Requester B accesses Requester A's ticket (AC-03, BR-04)", async () => {
      // Find Jennifer Anderson (Requester A) and David Lee (Requester B)
      const jennifer = await prisma.developmentRequester.findFirst({
        where: { email: "jennifer.anderson@kmutt.ac.th" },
      });
      const david = await prisma.developmentRequester.findFirst({
        where: { email: "david.lee@kmutt.ac.th" },
      });
      expect(jennifer).not.toBeNull();
      expect(david).not.toBeNull();

      // Find Jennifer's ticket
      const jenniferTicket = await prisma.ticket.findFirst({
        where: { requesterId: jennifer!.id },
      });
      expect(jenniferTicket).not.toBeNull();

      // David tries to access Jennifer's ticket
      const res = await request(app)
        .get(`/api/tickets/${jenniferTicket!.id}`)
        .set("X-Requester-Id", david!.id.toString());

      expect([403, 404]).toContain(res.status);
      expect(res.body).toHaveProperty("error");
      // Verify zero sensitive ticket data leaked
      expect(res.body).not.toHaveProperty("ticketNumber");
      expect(res.body).not.toHaveProperty("summary");
      expect(res.body).not.toHaveProperty("description");
    });

    it("returns HTTP 401 Unauthorized when X-Requester-Id is missing", async () => {
      const ticket = await prisma.ticket.findFirst();
      expect(ticket).not.toBeNull();

      const res = await request(app).get(`/api/tickets/${ticket!.id}`);

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty("error");
    });

    it("returns HTTP 403 Forbidden when requester is inactive", async () => {
      const inactive = await prisma.developmentRequester.findFirst({
        where: { email: "alex.inactive@kmutt.ac.th" },
      });
      const ticket = await prisma.ticket.findFirst();
      expect(inactive).not.toBeNull();
      expect(ticket).not.toBeNull();

      const res = await request(app)
        .get(`/api/tickets/${ticket!.id}`)
        .set("X-Requester-Id", inactive!.id.toString());

      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty("error");
    });

    it("returns HTTP 404 Not Found when ticket does not exist", async () => {
      const jennifer = await prisma.developmentRequester.findFirst({
        where: { email: "jennifer.anderson@kmutt.ac.th" },
      });
      expect(jennifer).not.toBeNull();

      const res = await request(app)
        .get("/api/tickets/999999")
        .set("X-Requester-Id", jennifer!.id.toString());

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty("error");
    });

    it("returns HTTP 400 Bad Request or 404 when ticket ID is not a valid integer", async () => {
      const jennifer = await prisma.developmentRequester.findFirst({
        where: { email: "jennifer.anderson@kmutt.ac.th" },
      });

      const res = await request(app)
        .get("/api/tickets/invalid-id")
        .set("X-Requester-Id", jennifer!.id.toString());

      expect([400, 404]).toContain(res.status);
    });
  });
});
