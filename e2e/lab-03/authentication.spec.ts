import { test, expect } from "@playwright/test";

test.describe("Authentication and Session Lifecycle (E2E-01)", () => {
  test.beforeEach(async ({ page }) => {
    // Start fresh by clearing storage
    await page.goto("/login");
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload();
  });

  test("AC-01 & BR-01: Valid Requester login, token storage, and redirection to My Tickets", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("h1")).toContainText("Sign in to your account");

    await page.locator("#email").fill("jennifer.anderson@kmutt.ac.th");
    await page.locator("#password").fill("Password123!");
    await page.locator('button[type="submit"]:has-text("Sign In")').click();

    // Verify redirected to /tickets
    await expect(page).toHaveURL(/\/tickets/);
    await expect(page.locator("header")).toContainText("Jennifer Anderson");
    await expect(page.locator("header")).toContainText("Requester");

    // Verify localStorage has auth token and user
    const token = await page.evaluate(() => localStorage.getItem("toktickit_auth_token"));
    const userStr = await page.evaluate(() => localStorage.getItem("toktickit_auth_user"));
    expect(token).toBeTruthy();
    expect(userStr).toBeTruthy();
    const user = JSON.parse(userStr!);
    expect(user.email).toBe("jennifer.anderson@kmutt.ac.th");
    expect(user.role).toBe("REQUESTER");
  });

  test("AC-01 & BR-01: Valid IT Staff login redirects directly to Staff Queue (/queue)", async ({ page }) => {
    await page.goto("/login");
    await page.locator("#email").fill("staff.michael@toktickit.com");
    await page.locator("#password").fill("Password123!");
    await page.locator('button[type="submit"]:has-text("Sign In")').click();

    // Verify redirected to /queue
    await expect(page).toHaveURL(/\/queue/);
    await expect(page.locator("header")).toContainText("Michael Brown");
    await expect(page.locator("header")).toContainText("IT Staff");
  });

  test("AC-05 & BR-01: Invalid credentials displays safe error banner and remains on login", async ({ page }) => {
    await page.goto("/login");
    await page.locator("#email").fill("jennifer.anderson@kmutt.ac.th");
    await page.locator("#password").fill("WrongPass123!");
    await page.locator('button[type="submit"]:has-text("Sign In")').click();

    // Alert feedback banner
    const alert = page.locator('div[role="alert"]');
    await expect(alert).toBeVisible();
    await expect(alert).toContainText("Invalid email or password. Please try again.");
    await expect(page).toHaveURL(/\/login/);
  });

  test("AC-04 & BR-01: Deactivated user account is blocked with specific inactive notice", async ({ page }) => {
    await page.goto("/login");
    await page.locator("#email").fill("alex.inactive@kmutt.ac.th");
    await page.locator("#password").fill("Password123!");
    await page.locator('button[type="submit"]:has-text("Sign In")').click();

    const alert = page.locator('div[role="alert"]');
    await expect(alert).toBeVisible();
    await expect(alert).toContainText("Account is inactive. Please contact your system administrator.");
    await expect(page).toHaveURL(/\/login/);
  });

  test("Session persistence survives browser refresh without re-prompting login", async ({ page }) => {
    await page.goto("/login");
    await page.locator("#email").fill("staff.michael@toktickit.com");
    await page.locator("#password").fill("Password123!");
    await page.locator('button[type="submit"]:has-text("Sign In")').click();

    await expect(page).toHaveURL(/\/queue/);
    await expect(page.locator("header")).toContainText("Michael Brown");

    // Refresh page
    await page.reload();
    await expect(page).toHaveURL(/\/queue/);
    await expect(page.locator("header")).toContainText("Michael Brown");
  });

  test("AC-06 & BR-08: Logout terminates session and protects guarded routes", async ({ page }) => {
    await page.goto("/login");
    await page.locator("#email").fill("staff.michael@toktickit.com");
    await page.locator("#password").fill("Password123!");
    await page.locator('button[type="submit"]:has-text("Sign In")').click();
    await expect(page).toHaveURL(/\/queue/);

    // Open Profile dropdown
    await page.locator('button[aria-label="Profile"]').click();
    await page.locator('button:has-text("Sign Out")').click();

    // Verify redirected to /login
    await expect(page).toHaveURL(/\/login/);

    // Verify storage cleared
    const token = await page.evaluate(() => localStorage.getItem("toktickit_auth_token"));
    expect(token).toBeNull();

    // Attempt direct navigation to guarded route
    await page.goto("/queue");
    await expect(page).toHaveURL(/\/login/);

    await page.goto("/tickets");
    await expect(page).toHaveURL(/\/login/);
  });
});
