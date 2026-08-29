import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

describe("Lab 2 Ticket Creation API Tests", () => {
  const prisma = getPrisma();

  describe("GET /api/related-systems", () => {
    it("returns HTTP 200 with all active related systems ordered by name", async () => {
      const res = await request(app).get("/api/related-systems");

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(7);

      for (const sys of res.body) {
        expect(sys).toHaveProperty("id");
        expect(sys).toHaveProperty("name");
      }

      // Verify alphabetical order by name
      const names = res.body.map((s: { name: string }) => s.name);
      const sortedNames = [...names].sort((a, b) => a.localeCompare(b));
      expect(names).toEqual(sortedNames);
    });
  });

  describe("POST /api/tickets", () => {
    /**
     * API-01: Create valid ticket with all required fields
     * Requirements: AC-01, BR-01, BR-02
     */
    it("API-01: creates a valid ticket with status NEW and unique TKT-YYYY-NNNNNN number (AC-01, BR-01, BR-02)", async () => {
      // Find active requester Jennifer Anderson
      const requester = await prisma.developmentRequester.findFirst({
        where: { email: "jennifer.anderson@kmutt.ac.th", isActive: true },
      });
      expect(requester).not.toBeNull();

      // Find active Category and RelatedSystem
      const category = await prisma.category.findFirst({
        where: { name: "Hardware", isActive: true },
      });
      const relatedSystem = await prisma.relatedSystem.findFirst({
        where: { name: "Corporate Laptop", isActive: true },
      });
      expect(category).not.toBeNull();
      expect(relatedSystem).not.toBeNull();

      const ticketPayload = {
        categoryId: category!.id,
        relatedSystemId: relatedSystem!.id,
        requestedPriority: "HIGH",
        summary: "Laptop keyboard keys sticking intermittently",
        description: "The spacebar and enter keys get stuck when typing for more than 10 minutes. Cleaned externally but issue persists.",
      };

      const res = await request(app)
        .post("/api/tickets")
        .set("X-Requester-Id", requester!.id.toString())
        .send(ticketPayload);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("id");
      expect(res.body).toHaveProperty("ticketNumber");

      // Verify ticketNumber format: TKT-YYYY-NNNNNN
      const currentYear = new Date().getFullYear();
      const ticketRegex = new RegExp(`^TKT-${currentYear}-\\d{6}$`);
      expect(res.body.ticketNumber).toMatch(ticketRegex);

      // Verify fields and defaults
      expect(res.body.summary).toBe(ticketPayload.summary);
      expect(res.body.description).toBe(ticketPayload.description);
      expect(res.body.requestedPriority).toBe("HIGH");
      expect(res.body.itPriority).toBe("MEDIUM");
      expect(res.body.currentStatus).toBe("NEW");
      expect(res.body.ticketOwner).toBeNull();
      expect(res.body.resolutionSummary).toBeNull();
      expect(res.body.requesterId).toBe(requester!.id);
      expect(res.body.categoryId).toBe(category!.id);
      expect(res.body.relatedSystemId).toBe(relatedSystem!.id);
      expect(res.body.category).toHaveProperty("name", "Hardware");
      expect(res.body.relatedSystem).toHaveProperty("name", "Corporate Laptop");
      expect(res.body).toHaveProperty("createdAt");
      expect(res.body).toHaveProperty("updatedAt");

      // Verify record is actually saved in DB
      const dbTicket = await prisma.ticket.findUnique({
        where: { id: res.body.id },
      });
      expect(dbTicket).not.toBeNull();
      expect(dbTicket!.ticketNumber).toBe(res.body.ticketNumber);
      expect(dbTicket!.currentStatus).toBe("NEW");
    });

    /**
     * API-02: Create ticket with missing or short summary (< 5 chars)
     * Requirements: AC-06, BR-06
     */
    it("API-02: returns 400/422 when summary is missing or shorter than 5 characters (AC-06, BR-06)", async () => {
      const requester = await prisma.developmentRequester.findFirst({
        where: { isActive: true },
      });
      const category = await prisma.category.findFirst({ where: { isActive: true } });
      const relatedSystem = await prisma.relatedSystem.findFirst({ where: { isActive: true } });

      const initialCount = await prisma.ticket.count();

      // Case 1: Short summary (< 5 chars)
      const resShort = await request(app)
        .post("/api/tickets")
        .set("X-Requester-Id", requester!.id.toString())
        .send({
          categoryId: category!.id,
          relatedSystemId: relatedSystem!.id,
          requestedPriority: "MEDIUM",
          summary: "Help",
          description: "This is a detailed description of the problem exceeding ten characters.",
        });

      expect([400, 422]).toContain(resShort.status);
      expect(resShort.body).toHaveProperty("error");
      expect(resShort.body).toHaveProperty("details");

      // Case 2: Missing summary
      const resMissing = await request(app)
        .post("/api/tickets")
        .set("X-Requester-Id", requester!.id.toString())
        .send({
          categoryId: category!.id,
          relatedSystemId: relatedSystem!.id,
          requestedPriority: "MEDIUM",
          description: "This is a detailed description of the problem exceeding ten characters.",
        });

      expect([400, 422]).toContain(resMissing.status);

      // Verify DB count unchanged
      const finalCount = await prisma.ticket.count();
      expect(finalCount).toBe(initialCount);
    });

    /**
     * API-03: Create ticket with whitespace-only summary or description
     * Requirements: AC-06, BR-06
     */
    it("API-03: trims whitespace before validation and rejects whitespace-only fields (AC-06, BR-06)", async () => {
      const requester = await prisma.developmentRequester.findFirst({
        where: { isActive: true },
      });
      const category = await prisma.category.findFirst({ where: { isActive: true } });
      const relatedSystem = await prisma.relatedSystem.findFirst({ where: { isActive: true } });

      const initialCount = await prisma.ticket.count();

      // Whitespace summary
      const res = await request(app)
        .post("/api/tickets")
        .set("X-Requester-Id", requester!.id.toString())
        .send({
          categoryId: category!.id,
          relatedSystemId: relatedSystem!.id,
          requestedPriority: "LOW",
          summary: "     \t \n   ",
          description: "Valid description text that is long enough.",
        });

      expect([400, 422]).toContain(res.status);
      expect(res.body).toHaveProperty("error");

      // Short description after trimming (< 10 chars)
      const resDesc = await request(app)
        .post("/api/tickets")
        .set("X-Requester-Id", requester!.id.toString())
        .send({
          categoryId: category!.id,
          relatedSystemId: relatedSystem!.id,
          requestedPriority: "LOW",
          summary: "Valid summary here",
          description: "   short   ",
        });

      expect([400, 422]).toContain(resDesc.status);

      const finalCount = await prisma.ticket.count();
      expect(finalCount).toBe(initialCount);
    });

    /**
     * API-04: Request ticket API without X-Requester-Id header
     * Requirements: AC-02, BR-03
     */
    it("API-04: returns HTTP 401 Unauthorized when X-Requester-Id header is missing (AC-02, BR-03)", async () => {
      const category = await prisma.category.findFirst({ where: { isActive: true } });
      const relatedSystem = await prisma.relatedSystem.findFirst({ where: { isActive: true } });

      const res = await request(app)
        .post("/api/tickets")
        .send({
          categoryId: category!.id,
          relatedSystemId: relatedSystem!.id,
          requestedPriority: "MEDIUM",
          summary: "Valid ticket summary",
          description: "Valid description with sufficient length.",
        });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty("error");
    });

    it("returns HTTP 403 Forbidden when requester is inactive or does not exist (BR-04, BR-05)", async () => {
      const category = await prisma.category.findFirst({ where: { isActive: true } });
      const relatedSystem = await prisma.relatedSystem.findFirst({ where: { isActive: true } });

      // Inactive requester Alex Inactive
      const inactiveRequester = await prisma.developmentRequester.findFirst({
        where: { email: "alex.inactive@kmutt.ac.th" },
      });
      expect(inactiveRequester).not.toBeNull();

      const resInactive = await request(app)
        .post("/api/tickets")
        .set("X-Requester-Id", inactiveRequester!.id.toString())
        .send({
          categoryId: category!.id,
          relatedSystemId: relatedSystem!.id,
          requestedPriority: "MEDIUM",
          summary: "Valid ticket summary",
          description: "Valid description with sufficient length.",
        });

      expect(resInactive.status).toBe(403);
      expect(resInactive.body).toHaveProperty("error");

      // Non-existent requester
      const resNonExistent = await request(app)
        .post("/api/tickets")
        .set("X-Requester-Id", "999999")
        .send({
          categoryId: category!.id,
          relatedSystemId: relatedSystem!.id,
          requestedPriority: "MEDIUM",
          summary: "Valid ticket summary",
          description: "Valid description with sufficient length.",
        });

      expect(resNonExistent.status).toBe(403);
    });

    it("returns HTTP 400/422 when categoryId or relatedSystemId is invalid or inactive (BR-06)", async () => {
      const requester = await prisma.developmentRequester.findFirst({
        where: { isActive: true },
      });

      const res = await request(app)
        .post("/api/tickets")
        .set("X-Requester-Id", requester!.id.toString())
        .send({
          categoryId: 99999,
          relatedSystemId: 99999,
          requestedPriority: "MEDIUM",
          summary: "Valid ticket summary",
          description: "Valid description with sufficient length.",
        });

      expect([400, 422]).toContain(res.status);
      expect(res.body).toHaveProperty("error");
      expect(res.body).toHaveProperty("details");
    });

    it("returns HTTP 400/422 when requestedPriority is invalid", async () => {
      const requester = await prisma.developmentRequester.findFirst({
        where: { isActive: true },
      });
      const category = await prisma.category.findFirst({ where: { isActive: true } });
      const relatedSystem = await prisma.relatedSystem.findFirst({ where: { isActive: true } });

      const res = await request(app)
        .post("/api/tickets")
        .set("X-Requester-Id", requester!.id.toString())
        .send({
          categoryId: category!.id,
          relatedSystemId: relatedSystem!.id,
          requestedPriority: "SUPER_URGENT",
          summary: "Valid ticket summary",
          description: "Valid description with sufficient length.",
        });

      expect([400, 422]).toContain(res.status);
    });
  });
});
