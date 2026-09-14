import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

describe("Lab 3 Auth API Tests (API-01 through API-07)", () => {
  const activeRequesterEmail = "jennifer.anderson@kmutt.ac.th";
  const standardPassword = "Password123!";
  const inactiveUserEmail = "alex.inactive@kmutt.ac.th";
  const firstLoginUserEmail = "firstlogin.requester@toktickit.com";
  const initialPassword = "InitialPass123!";

  beforeEach(async () => {
    const prisma = getPrisma();
    await prisma.user.updateMany({
      where: { email: firstLoginUserEmail },
      data: {
        passwordHash: bcrypt.hashSync(initialPassword, 10),
        mustChangePassword: true,
      },
    });
  });

  /**
   * API-01: Valid user authentication
   * AC-01, BR-01
   */
  it("API-01: logs in successfully with valid credentials, returns 200, JWT token, and safe user profile (AC-01, BR-01)", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({
        email: activeRequesterEmail,
        password: standardPassword,
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("token");
    expect(typeof res.body.token).toBe("string");
    expect(res.body.token.split(".").length).toBe(3); // Valid JWT structure

    expect(res.body).toHaveProperty("user");
    expect(res.body.user).toEqual({
      id: expect.any(Number),
      email: activeRequesterEmail,
      name: "Jennifer Anderson",
      role: "REQUESTER",
      isActive: true,
      mustChangePassword: false,
    });

    // Verify passwordHash is never exposed in response
    expect(res.body.user).not.toHaveProperty("passwordHash");
    expect(res.body.user).not.toHaveProperty("password");
  });

  /**
   * API-02: Authentication with invalid password
   * AC-05, BR-01
   */
  it("API-02: rejects login with invalid password with HTTP 401 and safe message (AC-05, BR-01)", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({
        email: activeRequesterEmail,
        password: "WrongPassword999!",
      });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({
      error: "Invalid email or password. Please try again.",
    });
    expect(res.body).not.toHaveProperty("token");
  });

  /**
   * API-03: Authentication attempt on deactivated account
   * AC-04, BR-01
   */
  it("API-03: rejects login for deactivated account with HTTP 403 and safe message (AC-04, BR-01)", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({
        email: inactiveUserEmail,
        password: standardPassword,
      });

    expect(res.status).toBe(403);
    expect(res.body).toEqual({
      error: "Account is inactive. Please contact your system administrator.",
    });
    expect(res.body).not.toHaveProperty("token");
  });

  /**
   * API-04: Login response flags mustChangePassword = true for initial password
   * AC-02, BR-02
   */
  it("API-04: flags mustChangePassword = true in response and token claims for initial password account (AC-02, BR-02)", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({
        email: firstLoginUserEmail,
        password: initialPassword,
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("token");
    expect(res.body.user.mustChangePassword).toBe(true);

    // Verify token claims contain mustChangePassword: true
    const tokenParts = res.body.token.split(".");
    const payload = JSON.parse(Buffer.from(tokenParts[1], "base64").toString("utf-8"));
    expect(payload.mustChangePassword).toBe(true);
    expect(payload.role).toBe("REQUESTER");
  });

  /**
   * API-05: Password change with weak password
   * AC-03, BR-07
   */
  it("API-05: rejects password change with weak password with HTTP 422 and complexity details (AC-03, BR-07)", async () => {
    // Login as firstLogin user to obtain token
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({
        email: firstLoginUserEmail,
        password: initialPassword,
      });

    const token = loginRes.body.token;

    // Attempt change with weak password (< 8 chars, missing special char)
    const res = await request(app)
      .post("/api/auth/change-password")
      .set("Authorization", `Bearer ${token}`)
      .send({
        currentPassword: initialPassword,
        newPassword: "weak",
        confirmPassword: "weak",
      });

    expect(res.status).toBe(422);
    expect(res.body).toHaveProperty("error");
    expect(res.body.error).toBe("Password does not meet complexity requirements");
    expect(res.body).toHaveProperty("details");
    expect(Array.isArray(res.body.details)).toBe(true);
    expect(res.body.details.length).toBeGreaterThan(0);
  });

  /**
   * API-06: Password change with compliant password
   * AC-03, BR-07
   */
  it("API-06: changes password successfully with compliant password, clears mustChangePassword (AC-03, BR-07)", async () => {
    // Login to obtain token
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({
        email: firstLoginUserEmail,
        password: initialPassword,
      });

    const token = loginRes.body.token;
    const newCompliantPassword = "NewSecurePassword456!";

    // Change password
    const changeRes = await request(app)
      .post("/api/auth/change-password")
      .set("Authorization", `Bearer ${token}`)
      .send({
        currentPassword: initialPassword,
        newPassword: newCompliantPassword,
        confirmPassword: newCompliantPassword,
      });

    expect(changeRes.status).toBe(200);
    expect(changeRes.body).toEqual({
      message: "Password changed successfully",
    });

    // Verify user can now log in with the new password
    const newLoginRes = await request(app)
      .post("/api/auth/login")
      .send({
        email: firstLoginUserEmail,
        password: newCompliantPassword,
      });

    expect(newLoginRes.status).toBe(200);
    expect(newLoginRes.body.user.mustChangePassword).toBe(false);

    // Old password should now be rejected
    const oldLoginRes = await request(app)
      .post("/api/auth/login")
      .send({
        email: firstLoginUserEmail,
        password: initialPassword,
      });

    expect(oldLoginRes.status).toBe(401);
  });

  /**
   * API-07: User logout revokes session
   * AC-06, BR-08
   */
  it("API-07: terminates session on logout, revoking token from subsequent requests (AC-06, BR-08)", async () => {
    // Login
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({
        email: activeRequesterEmail,
        password: standardPassword,
      });

    const token = loginRes.body.token;

    // Verify token works for /api/auth/me
    const meRes = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`);
    expect(meRes.status).toBe(200);

    // Logout
    const logoutRes = await request(app)
      .post("/api/auth/logout")
      .set("Authorization", `Bearer ${token}`);

    expect(logoutRes.status).toBe(200);
    expect(logoutRes.body).toEqual({
      message: "Logged out successfully",
    });

    // Subsequent call with the same token must be rejected with 401
    const postLogoutRes = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(postLogoutRes.status).toBe(401);
  });
});
