import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

describe("Lab 3 Administrator User Management API Tests (API-25 through API-31)", () => {
  const prisma = getPrisma();
  let adminToken: string;
  let adminId: number;
  let createdUserId: number;

  beforeAll(async () => {
    // Authenticate Administrator (John Smith)
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({
        email: "admin@toktickit.com",
        password: "AdminPass123!",
      });

    expect(loginRes.status).toBe(200);
    adminToken = loginRes.body.token;
    adminId = loginRes.body.user.id;
  });

  afterAll(async () => {
    // Clean up created user if exists
    if (createdUserId) {
      await prisma.user.deleteMany({
        where: { id: createdUserId },
      });
    }
    // Clean up any test users created during test runs
    await prisma.user.deleteMany({
      where: { email: { in: ["alex.thompson@toktickit.com", "duplicate.test@toktickit.com", "second.admin@toktickit.com"] } },
    });
  });

  /**
   * API-25: Admin retrieves user list with search and role filter
   * AC-17, FR-22
   */
  it("API-25: retrieves user list with search and role filter without exposing password hashes (AC-17, FR-22)", async () => {
    // 1. Fetch all users
    const allRes = await request(app)
      .get("/api/admin/users")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(allRes.status).toBe(200);
    expect(Array.isArray(allRes.body)).toBe(true);
    expect(allRes.body.length).toBeGreaterThanOrEqual(1);

    // Ensure passwordHash is strictly omitted
    for (const u of allRes.body) {
      expect(u).not.toHaveProperty("passwordHash");
      expect(u).toHaveProperty("id");
      expect(u).toHaveProperty("name");
      expect(u).toHaveProperty("email");
      expect(u).toHaveProperty("role");
      expect(u).toHaveProperty("isActive");
      expect(u).toHaveProperty("mustChangePassword");
    }

    // 2. Search by substring ("Jennifer")
    const searchRes = await request(app)
      .get("/api/admin/users?search=Jennifer")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(searchRes.status).toBe(200);
    expect(searchRes.body.length).toBeGreaterThanOrEqual(1);
    expect(searchRes.body.every((u: any) => u.name.includes("Jennifer") || u.email.includes("Jennifer"))).toBe(true);

    // 3. Filter by role ("IT_STAFF")
    const roleRes = await request(app)
      .get("/api/admin/users?role=IT_STAFF")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(roleRes.status).toBe(200);
    expect(roleRes.body.length).toBeGreaterThanOrEqual(1);
    expect(roleRes.body.every((u: any) => u.role === "IT_STAFF")).toBe(true);
  });

  /**
   * API-26: Admin creates new user with initial password
   * AC-17, BR-19
   */
  it("API-26: creates new user with initial password and mustChangePassword = true (AC-17, BR-19)", async () => {
    const payload = {
      name: "Alex Thompson",
      email: "alex.thompson@toktickit.com",
      role: "IT_STAFF",
      isActive: true,
      initialPassword: "TempPassword123!",
    };

    const res = await request(app)
      .post("/api/admin/users")
      .set("Authorization", `Bearer ${adminToken}`)
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    expect(res.body.name).toBe(payload.name);
    expect(res.body.email).toBe(payload.email);
    expect(res.body.role).toBe("IT_STAFF");
    expect(res.body.isActive).toBe(true);
    expect(res.body.mustChangePassword).toBe(true);
    expect(res.body).not.toHaveProperty("passwordHash");

    createdUserId = res.body.id;

    // Verify in database: password is properly hashed and matches initial password
    const savedUser = await prisma.user.findUnique({
      where: { id: createdUserId },
    });
    expect(savedUser).not.toBeNull();
    expect(savedUser!.passwordHash).not.toBe("TempPassword123!");
    const isPasswordCorrect = await bcrypt.compare("TempPassword123!", savedUser!.passwordHash);
    expect(isPasswordCorrect).toBe(true);
    expect(savedUser!.mustChangePassword).toBe(true);
  });

  /**
   * API-27: Admin creates user with duplicate email
   * AC-18, BR-09
   */
  it("API-27: rejects user creation with duplicate email with HTTP 409 Conflict (AC-18, BR-09)", async () => {
    const payload = {
      name: "Duplicate User",
      email: "admin@toktickit.com", // existing email
      role: "REQUESTER",
      isActive: true,
      initialPassword: "TempPassword123!",
    };

    const res = await request(app)
      .post("/api/admin/users")
      .set("Authorization", `Bearer ${adminToken}`)
      .send(payload);

    expect(res.status).toBe(409);
    expect(res.body.error).toContain("already exists");
  });

  /**
   * API-28: Admin attempts to deactivate own account
   * AC-19, BR-16
   */
  it("API-28: blocks administrator from deactivating their own account with HTTP 422 Unprocessable Entity (AC-19, BR-16)", async () => {
    const res = await request(app)
      .patch(`/api/admin/users/${adminId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        isActive: false,
      });

    expect(res.status).toBe(422);
    expect(res.body.error).toMatch(/cannot deactivate your own account/i);

    // Also verify changing own role away from ADMINISTRATOR is blocked
    const roleChangeRes = await request(app)
      .patch(`/api/admin/users/${adminId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        role: "IT_STAFF",
      });

    expect(roleChangeRes.status).toBe(422);
  });

  /**
   * API-29: Admin attempts to deactivate the last remaining active Administrator
   * AC-20, BR-17
   */
  it("API-29: blocks deactivation or role change of the last remaining active Administrator with HTTP 422 (AC-20, BR-17)", async () => {
    // Currently, admin@toktickit.com is the only active administrator.
    // Create a temporary second administrator
    const secondAdmin = await prisma.user.create({
      data: {
        name: "Second Admin",
        email: "second.admin@toktickit.com",
        passwordHash: await bcrypt.hash("AdminPass123!", 10),
        role: "ADMINISTRATOR",
        isActive: true,
        mustChangePassword: false,
      },
    });

    try {
      // With two admins, deactivating secondAdmin should succeed
      const deactivateSecond = await request(app)
        .patch(`/api/admin/users/${secondAdmin.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ isActive: false });

      expect(deactivateSecond.status).toBe(200);
      expect(deactivateSecond.body.isActive).toBe(false);

      // Now only 1 active administrator remains (adminId).
      // Reactivate secondAdmin to test target deactivation when sole admin
      await prisma.user.update({
        where: { id: secondAdmin.id },
        data: { isActive: true },
      });
      await prisma.user.update({
        where: { id: adminId },
        data: { role: "IT_STAFF" }, // adminId is no longer admin, so secondAdmin is the sole active admin
      });

      const secondAdminLogin = await request(app)
        .post("/api/auth/login")
        .send({
          email: "second.admin@toktickit.com",
          password: "AdminPass123!",
        });
      const secondAdminToken = secondAdminLogin.body.token;

      // When secondAdmin attempts to change their role or deactivate when they are the last active admin
      const attemptRes = await request(app)
        .patch(`/api/admin/users/${secondAdmin.id}`)
        .set("Authorization", `Bearer ${secondAdminToken}`)
        .send({ role: "REQUESTER" });

      expect(attemptRes.status).toBe(422);
      expect(attemptRes.body.error).toBeDefined();
    } finally {
      // Restore adminId to ADMINISTRATOR and active
      await prisma.user.update({
        where: { id: adminId },
        data: { role: "ADMINISTRATOR", isActive: true },
      });
      // Clean up secondAdmin
      await prisma.user.deleteMany({
        where: { id: secondAdmin.id },
      });
    }
  });

  /**
   * API-30: Admin resets user initial password
   * AC-23, FR-26
   */
  it("API-30: resets user initial password and flags mustChangePassword = true (AC-23, FR-26)", async () => {
    // Reset password for createdUserId
    const res = await request(app)
      .post(`/api/admin/users/${createdUserId}/reset-password`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        initialPassword: "NewResetPass456!",
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("mustChangePassword", true);

    // Verify user password hash in DB updated and mustChangePassword is true
    const updatedUser = await prisma.user.findUnique({
      where: { id: createdUserId },
    });
    expect(updatedUser!.mustChangePassword).toBe(true);
    const isNewPassValid = await bcrypt.compare("NewResetPass456!", updatedUser!.passwordHash);
    expect(isNewPassValid).toBe(true);
  });

  /**
   * API-31: Valid user editing
   * AC-22, FR-25
   */
  it("API-31: updates user name, email, role, and active status successfully (AC-22, FR-25)", async () => {
    const updatePayload = {
      name: "Alex Thompson Renamed",
      email: "alex.thompson.renamed@toktickit.com",
      role: "REQUESTER",
      isActive: false,
    };

    const res = await request(app)
      .patch(`/api/admin/users/${createdUserId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send(updatePayload);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(createdUserId);
    expect(res.body.name).toBe(updatePayload.name);
    expect(res.body.email).toBe(updatePayload.email);
    expect(res.body.role).toBe("REQUESTER");
    expect(res.body.isActive).toBe(false);
    expect(res.body).not.toHaveProperty("passwordHash");

    // Clean up renamed email
    await prisma.user.deleteMany({
      where: { email: updatePayload.email },
    });
  });
});
