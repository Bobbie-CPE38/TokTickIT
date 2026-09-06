import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";

/**
 * API-05: GET /api/requesters/active lists active users only
 * Requirements: AC-05, BR-05
 */
describe("API-05: GET /api/requesters/active", () => {
  it("returns HTTP 200 with only active development requesters in id order", async () => {
    const res = await request(app).get("/api/requesters/active");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(4);

    // Verify all returned requesters have required fields
    for (const requester of res.body) {
      expect(requester).toHaveProperty("id");
      expect(requester).toHaveProperty("name");
      expect(requester).toHaveProperty("email");
      expect(requester).toHaveProperty("department");
      // Inactive flag should not be exposed or must be strictly true
      if ("isActive" in requester) {
        expect(requester.isActive).toBe(true);
      }
    }

    // Verify known active requesters are present
    const names = res.body.map((r: { name: string }) => r.name);
    expect(names).toContain("Jennifer Anderson");
    expect(names).toContain("David Lee");
    expect(names).toContain("Sarah Johnson");
    expect(names).toContain("Michael Brown");

    // BR-05 / AC-05: Inactive requester (Alex Inactive) must NOT be present
    expect(names).not.toContain("Alex Inactive");

    // Verify ordering by id ascending
    const ids = res.body.map((r: { id: number }) => r.id);
    const sortedIds = [...ids].sort((a, b) => a - b);
    expect(ids).toEqual(sortedIds);
  });
});
