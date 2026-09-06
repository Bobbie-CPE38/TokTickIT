import { describe, it, expect, beforeEach, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

describe("Lab 2 My Tickets API Tests (API-06, API-07, API-08, API-09)", () => {
  const prisma = getPrisma();

  let requesterA: { id: number; name: string };
  let requesterB: { id: number; name: string };
  let inactiveRequester: { id: number };
  let categoryHardware: { id: number; name: string };
  let categorySoftware: { id: number; name: string };
  let systemLaptop: { id: number; name: string };
  let systemEmail: { id: number; name: string };

  beforeEach(async () => {
    // Ensure requesters exist
    const reqA = await prisma.developmentRequester.findFirst({
      where: { email: "jennifer.anderson@kmutt.ac.th", isActive: true },
    });
    const reqB = await prisma.developmentRequester.findFirst({
      where: { email: "david.lee@kmutt.ac.th", isActive: true },
    });
    const reqInactive = await prisma.developmentRequester.findFirst({
      where: { email: "alex.inactive@kmutt.ac.th" },
    });

    requesterA = reqA!;
    requesterB = reqB!;
    inactiveRequester = reqInactive!;

    const catHw = await prisma.category.findFirst({ where: { name: "Hardware" } });
    const catSw = await prisma.category.findFirst({ where: { name: "Software" } });
    categoryHardware = catHw!;
    categorySoftware = catSw!;

    const sysLaptop = await prisma.relatedSystem.findFirst({ where: { name: "Corporate Laptop" } });
    const sysEmail = await prisma.relatedSystem.findFirst({ where: { name: "Email" } });
    systemLaptop = sysLaptop!;
    systemEmail = sysEmail!;

    // Clean existing test tickets for these requesters to have deterministic tests
    await prisma.attachment.deleteMany({
      where: {
        ticket: {
          requesterId: { in: [requesterA.id, requesterB.id] },
        },
      },
    });
    await prisma.ticket.deleteMany({
      where: { requesterId: { in: [requesterA.id, requesterB.id] } },
    });

    // Seed 5 tickets for Requester A
    const ticketA1 = await prisma.ticket.create({
      data: {
        ticketNumber: "TKT-2026-000101",
        summary: "Laptop battery drains quickly after update",
        description: "Battery life degraded noticeably after recent OS patch.",
        requestedPriority: "HIGH",
        itPriority: "HIGH",
        currentStatus: "NEW",
        requesterId: requesterA.id,
        categoryId: categoryHardware.id,
        relatedSystemId: systemLaptop.id,
        createdAt: new Date("2026-08-20T10:00:00.000Z"),
      },
    });

    // Add 1 active and 1 removed attachment to ticketA1
    await prisma.attachment.create({
      data: {
        ticketId: ticketA1.id,
        originalFileName: "battery_stats.png",
        storageKey: "key-battery-stats-123",
        fileSize: 102400,
        mimeType: "image/png",
        uploadedByRequesterId: requesterA.id,
        isRemoved: false,
      },
    });
    await prisma.attachment.create({
      data: {
        ticketId: ticketA1.id,
        originalFileName: "old_log.txt",
        storageKey: "key-old-log-123",
        fileSize: 2048,
        mimeType: "text/plain",
        uploadedByRequesterId: requesterA.id,
        isRemoved: true,
        removedAt: new Date(),
        removalReason: "Obsolete log",
      },
    });

    await prisma.ticket.create({
      data: {
        ticketNumber: "TKT-2026-000102",
        summary: "Cannot access corporate email from mobile client",
        description: "ActiveSync returns error 503 when authenticating.",
        requestedPriority: "MEDIUM",
        itPriority: "MEDIUM",
        currentStatus: "IN_PROGRESS",
        ticketOwner: "Sarah Staff",
        requesterId: requesterA.id,
        categoryId: categorySoftware.id,
        relatedSystemId: systemEmail.id,
        createdAt: new Date("2026-08-21T10:00:00.000Z"),
      },
    });

    await prisma.ticket.create({
      data: {
        ticketNumber: "TKT-2026-000103",
        summary: "Screen flickering on docking station",
        description: "External monitors flicker every few minutes when docked.",
        requestedPriority: "LOW",
        itPriority: "LOW",
        currentStatus: "OPEN",
        requesterId: requesterA.id,
        categoryId: categoryHardware.id,
        relatedSystemId: systemLaptop.id,
        createdAt: new Date("2026-08-22T10:00:00.000Z"),
      },
    });

    await prisma.ticket.create({
      data: {
        ticketNumber: "TKT-2026-000104",
        summary: "Outlook search index corrupted",
        description: "Search results in Outlook desktop client are incomplete.",
        requestedPriority: "MEDIUM",
        itPriority: "LOW",
        currentStatus: "PENDING",
        requesterId: requesterA.id,
        categoryId: categorySoftware.id,
        relatedSystemId: systemEmail.id,
        createdAt: new Date("2026-08-23T10:00:00.000Z"),
      },
    });

    await prisma.ticket.create({
      data: {
        ticketNumber: "TKT-2026-000105",
        summary: "Laptop keyboard replacement completed",
        description: "Keyboard keys were replaced by IT support.",
        requestedPriority: "HIGH",
        itPriority: "HIGH",
        currentStatus: "RESOLVED",
        ticketOwner: "David Staff",
        resolutionSummary: "Replaced keyboard top case.",
        requesterId: requesterA.id,
        categoryId: categoryHardware.id,
        relatedSystemId: systemLaptop.id,
        createdAt: new Date("2026-08-24T10:00:00.000Z"),
      },
    });

    // Seed 2 tickets for Requester B
    await prisma.ticket.create({
      data: {
        ticketNumber: "TKT-2026-000201",
        summary: "Requester B email quota exceeded",
        description: "Mailbox reached 99% storage capacity.",
        requestedPriority: "MEDIUM",
        itPriority: "MEDIUM",
        currentStatus: "OPEN",
        requesterId: requesterB.id,
        categoryId: categorySoftware.id,
        relatedSystemId: systemEmail.id,
        createdAt: new Date("2026-08-25T10:00:00.000Z"),
      },
    });

    await prisma.ticket.create({
      data: {
        ticketNumber: "TKT-2026-000202",
        summary: "Requester B laptop charger broken",
        description: "USB-C power adapter cable frayed.",
        requestedPriority: "URGENT",
        itPriority: "URGENT",
        currentStatus: "NEW",
        requesterId: requesterB.id,
        categoryId: categoryHardware.id,
        relatedSystemId: systemLaptop.id,
        createdAt: new Date("2026-08-26T10:00:00.000Z"),
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("Authentication & Header Guards", () => {
    it("returns HTTP 401 Unauthorized when X-Requester-Id header is missing", async () => {
      const res = await request(app).get("/api/tickets");
      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty("error");
    });

    it("returns HTTP 403 Forbidden when X-Requester-Id references an inactive requester", async () => {
      const res = await request(app)
        .get("/api/tickets")
        .set("X-Requester-Id", inactiveRequester.id.toString());
      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty("error");
    });

    it("returns HTTP 403 Forbidden when X-Requester-Id references a non-existent requester", async () => {
      const res = await request(app)
        .get("/api/tickets")
        .set("X-Requester-Id", "999999");
      expect(res.status).toBe(403);
    });
  });

  describe("API-06: Strict Requester Data Isolation (AC-04, BR-04)", () => {
    it("API-06: retrieves only tickets owned by active Requester A", async () => {
      const res = await request(app)
        .get("/api/tickets")
        .set("X-Requester-Id", requesterA.id.toString());

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("data");
      expect(res.body).toHaveProperty("pagination");
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(5);
      expect(res.body.pagination.total).toBe(5);

      // Verify all tickets belong to Requester A (no ticket from Requester B)
      for (const t of res.body.data) {
        expect(t.ticketNumber).toMatch(/^TKT-2026-00010/);
        expect(t).toHaveProperty("id");
        expect(t).toHaveProperty("ticketNumber");
        expect(t).toHaveProperty("summary");
        expect(t).toHaveProperty("requestedPriority");
        expect(t).toHaveProperty("itPriority");
        expect(t).toHaveProperty("currentStatus");
        expect(t).toHaveProperty("categoryId");
        expect(t).toHaveProperty("categoryName");
        expect(t).toHaveProperty("relatedSystemId");
        expect(t).toHaveProperty("relatedSystemName");
        expect(t).toHaveProperty("attachmentCount");
        expect(t).toHaveProperty("createdAt");
        expect(t).toHaveProperty("updatedAt");
      }

      // Check active attachment count on TKT-2026-000101 (1 active, 1 removed -> count should be 1)
      const ticket1 = res.body.data.find(
        (t: { ticketNumber: string }) => t.ticketNumber === "TKT-2026-000101"
      );
      expect(ticket1).toBeDefined();
      expect(ticket1.attachmentCount).toBe(1);
    });

    it("retrieves only tickets owned by active Requester B when switching requester", async () => {
      const res = await request(app)
        .get("/api/tickets")
        .set("X-Requester-Id", requesterB.id.toString());

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(2);
      expect(res.body.pagination.total).toBe(2);

      for (const t of res.body.data) {
        expect(t.ticketNumber).toMatch(/^TKT-2026-00020/);
      }
    });
  });

  describe("API-07: Keyword Search (AC-09, FR-10)", () => {
    it("API-07: searches by keyword in summary (case-insensitive)", async () => {
      const res = await request(app)
        .get("/api/tickets?search=BaTtErY")
        .set("X-Requester-Id", requesterA.id.toString());

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].ticketNumber).toBe("TKT-2026-000101");
      expect(res.body.pagination.total).toBe(1);
    });

    it("searches by ticket number substring", async () => {
      const res = await request(app)
        .get("/api/tickets?search=000103")
        .set("X-Requester-Id", requesterA.id.toString());

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].ticketNumber).toBe("TKT-2026-000103");
    });

    it("returns empty list when search term has no match", async () => {
      const res = await request(app)
        .get("/api/tickets?search=nonexistentterm123")
        .set("X-Requester-Id", requesterA.id.toString());

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(0);
      expect(res.body.pagination.total).toBe(0);
      expect(res.body.pagination.totalPages).toBe(0);
    });
  });

  describe("API-08: Filtering by Category, Priority, and Status (AC-09, FR-11)", () => {
    it("API-08: filters tickets by categoryId and requestedPriority", async () => {
      const res = await request(app)
        .get(`/api/tickets?categoryId=${categoryHardware.id}&requestedPriority=HIGH`)
        .set("X-Requester-Id", requesterA.id.toString());

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(2); // 000101 and 000105
      for (const t of res.body.data) {
        expect(t.categoryId).toBe(categoryHardware.id);
        expect(t.requestedPriority).toBe("HIGH");
      }
    });

    it("filters tickets by status and itPriority", async () => {
      const res = await request(app)
        .get("/api/tickets?status=IN_PROGRESS&itPriority=MEDIUM")
        .set("X-Requester-Id", requesterA.id.toString());

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].ticketNumber).toBe("TKT-2026-000102");
    });

    it("returns 400 Bad Request when filter parameters contain invalid values", async () => {
      const res = await request(app)
        .get("/api/tickets?requestedPriority=INVALID_PRIORITY")
        .set("X-Requester-Id", requesterA.id.toString());

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("error");
    });
  });

  describe("API-09: Pagination & Sorting (FR-12)", () => {
    it("API-09: paginates ticket list with page and pageSize", async () => {
      // Page 1 with pageSize 2 (default sort: createdAt desc)
      const resPage1 = await request(app)
        .get("/api/tickets?page=1&pageSize=2")
        .set("X-Requester-Id", requesterA.id.toString());

      expect(resPage1.status).toBe(200);
      expect(resPage1.body.data.length).toBe(2);
      expect(resPage1.body.pagination).toEqual({
        total: 5,
        page: 1,
        pageSize: 2,
        totalPages: 3,
      });
      expect(resPage1.body.data[0].ticketNumber).toBe("TKT-2026-000105"); // Latest
      expect(resPage1.body.data[1].ticketNumber).toBe("TKT-2026-000104");

      // Page 2 with pageSize 2
      const resPage2 = await request(app)
        .get("/api/tickets?page=2&pageSize=2")
        .set("X-Requester-Id", requesterA.id.toString());

      expect(resPage2.status).toBe(200);
      expect(resPage2.body.data.length).toBe(2);
      expect(resPage2.body.pagination).toEqual({
        total: 5,
        page: 2,
        pageSize: 2,
        totalPages: 3,
      });
      expect(resPage2.body.data[0].ticketNumber).toBe("TKT-2026-000103");
      expect(resPage2.body.data[1].ticketNumber).toBe("TKT-2026-000102");

      // Page 3 with pageSize 2
      const resPage3 = await request(app)
        .get("/api/tickets?page=3&pageSize=2")
        .set("X-Requester-Id", requesterA.id.toString());

      expect(resPage3.status).toBe(200);
      expect(resPage3.body.data.length).toBe(1);
      expect(resPage3.body.data[0].ticketNumber).toBe("TKT-2026-000101");
    });

    it("sorts by createdAt ascending when requested", async () => {
      const res = await request(app)
        .get("/api/tickets?sortBy=createdAt&sortOrder=asc")
        .set("X-Requester-Id", requesterA.id.toString());

      expect(res.status).toBe(200);
      expect(res.body.data[0].ticketNumber).toBe("TKT-2026-000101");
      expect(res.body.data[4].ticketNumber).toBe("TKT-2026-000105");
    });

    it("sorts by ticketNumber descending when requested", async () => {
      const res = await request(app)
        .get("/api/tickets?sortBy=ticketNumber&sortOrder=desc")
        .set("X-Requester-Id", requesterA.id.toString());

      expect(res.status).toBe(200);
      expect(res.body.data[0].ticketNumber).toBe("TKT-2026-000105");
    });

    it("returns 400 Bad Request on invalid page number or negative pageSize", async () => {
      const res = await request(app)
        .get("/api/tickets?page=0")
        .set("X-Requester-Id", requesterA.id.toString());
      expect(res.status).toBe(400);

      const res2 = await request(app)
        .get("/api/tickets?pageSize=100") // max is 50
        .set("X-Requester-Id", requesterA.id.toString());
      expect(res2.status).toBe(400);
    });
  });
});
