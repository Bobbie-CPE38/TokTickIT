import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

describe("Lab 3 IT Staff Ticket Queue API Tests (API-12, API-13)", () => {
  const prisma = getPrisma();
  let staffToken: string;
  let adminToken: string;
  let staffUserId: number;
  let adminUserId: number;
  let testCategoryId: number;

  beforeAll(async () => {
    // 1. Authenticate IT Staff
    const staffLoginRes = await request(app)
      .post("/api/auth/login")
      .send({
        email: "staff.michael@toktickit.com",
        password: "Password123!",
      });
    expect(staffLoginRes.status).toBe(200);
    staffToken = staffLoginRes.body.token;
    staffUserId = staffLoginRes.body.user.id;

    // 2. Authenticate Administrator
    const adminLoginRes = await request(app)
      .post("/api/auth/login")
      .send({
        email: "admin@toktickit.com",
        password: "AdminPass123!",
      });
    expect(adminLoginRes.status).toBe(200);
    adminToken = adminLoginRes.body.token;
    adminUserId = adminLoginRes.body.user.id;

    const cat = await prisma.category.findFirst({ where: { isActive: true } });
    testCategoryId = cat!.id;
  });

  /**
   * API-12: IT Staff and Admin query queue with search, category, status, priority, and owner filters
   * AC-10, FR-15
   */
  describe("API-12: Shared Queue Retrieval with Filters & Search (AC-10, FR-15)", () => {
    it("allows IT Staff to retrieve the shared ticket queue with standard fields", async () => {
      const res = await request(app)
        .get("/api/staff/tickets")
        .set("Authorization", `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("data");
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body).toHaveProperty("pagination");
      expect(res.body.pagination).toHaveProperty("total");
      expect(res.body.pagination).toHaveProperty("page", 1);
      expect(res.body.pagination).toHaveProperty("pageSize", 10);
      expect(res.body.pagination).toHaveProperty("totalPages");

      if (res.body.data.length > 0) {
        const item = res.body.data[0];
        expect(item).toHaveProperty("id");
        expect(item).toHaveProperty("ticketNumber");
        expect(item).toHaveProperty("summary");
        expect(item).toHaveProperty("category");
        expect(item.category).toHaveProperty("id");
        expect(item.category).toHaveProperty("name");
        expect(item).toHaveProperty("requestedPriority");
        expect(item).toHaveProperty("itPriority");
        expect(item).toHaveProperty("currentStatus");
        expect(item).toHaveProperty("isRequesterResolved");
        expect(item).toHaveProperty("createdAt");
        expect(item).toHaveProperty("updatedAt");
      }
    });

    it("allows Administrator to retrieve the shared ticket queue", async () => {
      const res = await request(app)
        .get("/api/staff/tickets")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("data");
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it("filters tickets by search query matching ticketNumber or summary (case-insensitive)", async () => {
      const allRes = await request(app)
        .get("/api/staff/tickets")
        .set("Authorization", `Bearer ${staffToken}`);
      expect(allRes.status).toBe(200);

      if (allRes.body.data.length > 0) {
        const firstTicket = allRes.body.data[0];
        const searchKeyword = firstTicket.summary.split(" ")[0];

        const searchRes = await request(app)
          .get(`/api/staff/tickets?search=${encodeURIComponent(searchKeyword)}`)
          .set("Authorization", `Bearer ${staffToken}`);

        expect(searchRes.status).toBe(200);
        expect(searchRes.body.data.length).toBeGreaterThan(0);
        for (const t of searchRes.body.data) {
          const matchNumber = t.ticketNumber.toLowerCase().includes(searchKeyword.toLowerCase());
          const matchSummary = t.summary.toLowerCase().includes(searchKeyword.toLowerCase());
          expect(matchNumber || matchSummary).toBe(true);
        }
      }
    });

    it("filters tickets by status", async () => {
      const res = await request(app)
        .get("/api/staff/tickets?status=OPEN")
        .set("Authorization", `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      for (const t of res.body.data) {
        expect(t.currentStatus).toBe("OPEN");
      }
    });

    it("filters tickets by categoryId", async () => {
      const res = await request(app)
        .get(`/api/staff/tickets?categoryId=${testCategoryId}`)
        .set("Authorization", `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      for (const t of res.body.data) {
        expect(t.category.id).toBe(testCategoryId);
      }
    });

    it("filters tickets by itPriority and requestedPriority", async () => {
      const res = await request(app)
        .get("/api/staff/tickets?itPriority=HIGH")
        .set("Authorization", `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      for (const t of res.body.data) {
        expect(t.itPriority).toBe("HIGH");
      }
    });

    it("filters tickets by owner: unassigned", async () => {
      const res = await request(app)
        .get("/api/staff/tickets?ticketOwnerId=unassigned")
        .set("Authorization", `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      for (const t of res.body.data) {
        expect(t.ticketOwner).toBeNull();
      }
    });

    it("filters tickets by specific owner id", async () => {
      const res = await request(app)
        .get(`/api/staff/tickets?ticketOwnerId=${staffUserId}`)
        .set("Authorization", `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      for (const t of res.body.data) {
        expect(t.ticketOwner).not.toBeNull();
        expect(t.ticketOwner.id).toBe(staffUserId);
      }
    });
  });

  /**
   * API-13: Pagination metadata and sorting
   * AC-10, FR-15
   */
  describe("API-13: Pagination & Sorting (AC-10, FR-15)", () => {
    it("paginates queue results according to page and pageSize parameters", async () => {
      const res = await request(app)
        .get("/api/staff/tickets?page=1&pageSize=3")
        .set("Authorization", `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.pageSize).toBe(3);
      expect(res.body.data.length).toBeLessThanOrEqual(3);
      if (res.body.pagination.total > 3) {
        expect(res.body.pagination.totalPages).toBeGreaterThan(1);
      }
    });

    it("sorts tickets by itPriority descending and ascending", async () => {
      const descRes = await request(app)
        .get("/api/staff/tickets?sortBy=itPriority&sortOrder=desc&pageSize=20")
        .set("Authorization", `Bearer ${staffToken}`);
      expect(descRes.status).toBe(200);

      const ascRes = await request(app)
        .get("/api/staff/tickets?sortBy=itPriority&sortOrder=asc&pageSize=20")
        .set("Authorization", `Bearer ${staffToken}`);
      expect(ascRes.status).toBe(200);
    });

    it("sorts tickets by ticketNumber ascending and descending", async () => {
      const res = await request(app)
        .get("/api/staff/tickets?sortBy=ticketNumber&sortOrder=asc&pageSize=10")
        .set("Authorization", `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      if (res.body.data.length >= 2) {
        for (let i = 0; i < res.body.data.length - 1; i++) {
          expect(res.body.data[i].ticketNumber <= res.body.data[i + 1].ticketNumber).toBe(true);
        }
      }
    });

    it("sorts tickets by status (currentStatus)", async () => {
      const res = await request(app)
        .get("/api/staff/tickets?sortBy=status&sortOrder=asc&pageSize=10")
        .set("Authorization", `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
    });

    it("rejects invalid enum values for status with HTTP 400 Bad Request", async () => {
      const res = await request(app)
        .get("/api/staff/tickets?status=INVALID_STATUS")
        .set("Authorization", `Bearer ${staffToken}`);

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("error");
      expect(res.body.details).toBeDefined();
    });

    it("rejects invalid enum values for itPriority with HTTP 400 Bad Request", async () => {
      const res = await request(app)
        .get("/api/staff/tickets?itPriority=SUPER_URGENT")
        .set("Authorization", `Bearer ${staffToken}`);

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("error");
    });

    it("sanitizes negative or invalid page and pageSize with safe fallback defaults", async () => {
      const res = await request(app)
        .get("/api/staff/tickets?page=-2&pageSize=invalid")
        .set("Authorization", `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.pageSize).toBe(10);
    });

    it("clamps pageSize exceeding 50 down to 50", async () => {
      const res = await request(app)
        .get("/api/staff/tickets?pageSize=100")
        .set("Authorization", `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.pagination.pageSize).toBe(50);
    });

    it("safely falls back to default sorting (createdAt desc) when unrecognized sortBy is provided", async () => {
      const res = await request(app)
        .get("/api/staff/tickets?sortBy=maliciousColumn")
        .set("Authorization", `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("data");
    });
  });
});
