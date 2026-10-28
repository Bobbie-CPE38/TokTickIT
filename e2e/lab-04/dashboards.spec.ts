import { test, expect, Page } from "@playwright/test";
import { execSync } from "child_process";

const API_URL = process.env.E2E_API_URL ?? "http://localhost:3000";

async function login(page: Page, email: string, password: string, landing: RegExp) {
  await page.goto("/login");
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload();
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.locator('button[type="submit"]:has-text("Sign In")').click();
  await expect(page).toHaveURL(landing);
}

async function openDashboard(page: Page) {
  await page.locator('header button[aria-label="Dashboard"]').click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.locator('header button[aria-label="Dashboard"]')).toHaveAttribute("aria-current", "page");
}

async function authToken(page: Page): Promise<string> {
  return (await page.evaluate(() => localStorage.getItem("toktickit_auth_token"))) ?? "";
}

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

test.describe("Role Dashboards (E2E-04, RESP-01)", () => {
  test.beforeEach(() => {
    try {
      execSync("npm run prisma:seed", { cwd: "./server", stdio: "ignore" });
    } catch (err) {
      console.error("Prisma seed reset error:", err);
    }
  });

  test("AC-02: Requester dashboard shows owner-scoped metrics and drills down to My Tickets", async ({ page }) => {
    await login(page, "jennifer.anderson@kmutt.ac.th", "Password123!", /\/tickets/);
    await openDashboard(page);

    await expect(page.getByRole("heading", { name: "Welcome, Jennifer!" })).toBeVisible();
    const dashboard = page.getByTestId("requester-dashboard");
    await expect(dashboard.getByTestId("metric-value")).toHaveCount(4);

    // Displayed counts equal the authoritative backend calculation
    const token = await authToken(page);
    const apiRes = await page.request.get(`${API_URL}/api/dashboards/requester`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(apiRes.status()).toBe(200);
    const { metrics } = await apiRes.json();
    const openCard = page.getByRole("link", { name: new RegExp(`^My Open Tickets: ${metrics.myOpenTickets}\\.`) });
    await expect(openCard).toBeVisible();

    // Ownership protection: staff dashboard is forbidden for a Requester
    const forbidden = await page.request.get(`${API_URL}/api/dashboards/staff`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(forbidden.status()).toBe(403);

    await expectNoHorizontalOverflow(page);

    await openCard.click();
    await expect(page).toHaveURL(/\/tickets\?filter=open$/);
    await expect(page.getByLabel("Current Status")).toHaveValue("OPEN_ALL");
  });

  test("AC-12: IT Staff dashboard shows KPI cards with trends and drills down to the filtered queue", async ({ page }) => {
    await login(page, "staff.michael@toktickit.com", "Password123!", /\/queue/);
    await openDashboard(page);

    await expect(page.getByRole("heading", { name: "Welcome back, Michael!" })).toBeVisible();
    const dashboard = page.getByTestId("staff-dashboard");
    await expect(dashboard.getByTestId("metric-value")).toHaveCount(5);
    await expect(dashboard.getByTestId("trend-badge")).toHaveCount(5);

    const token = await authToken(page);
    const { metrics } = await (
      await page.request.get(`${API_URL}/api/dashboards/staff`, { headers: { Authorization: `Bearer ${token}` } })
    ).json();
    await expect(page.getByRole("link", { name: new RegExp(`^New: ${metrics.new}\\.`) })).toBeVisible();
    await expect(page.getByRole("link", { name: new RegExp(`^My Assigned: ${metrics.myAssigned}\\.`) })).toBeVisible();

    await expectNoHorizontalOverflow(page);

    await page.getByRole("link", { name: /^New: \d+\./ }).click();
    await expect(page).toHaveURL(/\/queue\?status=NEW$/);
    await expect(page.getByLabel("Filter by Status")).toHaveValue("NEW");

    await page.goBack();
    await expect(page).toHaveURL(/\/dashboard$/);
    await page.getByRole("link", { name: /^My Assigned: \d+\./ }).click();
    await expect(page).toHaveURL(/\/queue\?owner=me$/);
    await expect(page.getByLabel("Filter by Owner")).toHaveValue("me");
  });

  test("AC-13: Administrator dashboard shows operational metrics and user governance", async ({ page }) => {
    await login(page, "admin@toktickit.com", "AdminPass123!", /\/admin\/users/);
    await openDashboard(page);

    const dashboard = page.getByTestId("admin-dashboard");
    await expect(dashboard.getByTestId("metric-value")).toHaveCount(5);
    const governance = page.getByRole("region", { name: "User Governance" });
    await expect(governance).toBeVisible();
    await expect(governance.getByText("Total Users")).toBeVisible();

    await expectNoHorizontalOverflow(page);

    await governance.getByRole("link", { name: "Manage users" }).click();
    await expect(page).toHaveURL(/\/admin\/users$/);
  });
});
