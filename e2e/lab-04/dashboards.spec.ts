import { test, expect, Page } from "@playwright/test";
import {
  API_URL,
  apiToken,
  bearer,
  dbCount,
  expectMobileTouchTargets,
  expectNoHorizontalOverflow,
  login,
  resetSeed,
  snap,
  ticketIdByNumber,
  USERS,
  userIdByEmail,
} from "./support";

const OPEN_STATUSES = ["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "REOPENED"];

async function openDashboard(page: Page) {
  await page.locator('header button[aria-label="Dashboard"]').click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.locator('header button[aria-label="Dashboard"]')).toHaveAttribute("aria-current", "page");
}

function metricCard(page: Page, label: string) {
  return page.getByRole("link", { name: new RegExp(`^${label}: \\d+\\.`) });
}

async function metricValue(page: Page, label: string): Promise<number> {
  return Number(await metricCard(page, label).getByTestId("metric-value").textContent());
}

const EMPTY_OPERATIONAL = {
  metrics: { new: 0, open: 0, inProgress: 0, waitingForRequester: 0, myAssigned: 0, unassigned: 0, myActionsCount: 0 },
  trends: { newDelta: 0, openDelta: 0, inProgressDelta: 0, waitingForRequesterDelta: 0, myAssignedDelta: 0 },
  urgentTickets: [],
  recentTickets: [],
};

test.describe("Role Dashboards (E2E-04, RESP-01)", () => {
  test.beforeEach(() => resetSeed());

  test("AC-02, BR-13: Requester dashboard shows owner-scoped metrics that match the database and drill down to My Tickets", async ({
    page,
    request,
  }, testInfo) => {
    await login(page, "jennifer");
    await openDashboard(page);
    await expect(page.getByRole("heading", { name: "Welcome, Jennifer!" })).toBeVisible();
    const dashboard = page.getByTestId("requester-dashboard");
    await expect(dashboard.getByTestId("metric-value")).toHaveCount(4);

    // UI == API == direct database query, all scoped to Jennifer
    const token = await apiToken(request, "jennifer");
    const { metrics, recentTickets } = await (
      await request.get(`${API_URL}/api/dashboards/requester`, { headers: bearer(token) })
    ).json();
    const jenniferId = await userIdByEmail(request, USERS.jennifer.email);
    const dbOpen = dbCount("ticket", { requesterId: jenniferId, currentStatus: { in: OPEN_STATUSES } });
    const dbResolved = dbCount("ticket", { requesterId: jenniferId, currentStatus: "RESOLVED" });
    const dbWaiting = dbCount("ticket", { requesterId: jenniferId, currentStatus: "WAITING_FOR_REQUESTER" });
    expect(metrics.myOpenTickets).toBe(dbOpen);
    expect(metrics.resolved).toBe(dbResolved);
    expect(metrics.waitingForRequester).toBe(dbWaiting);
    expect(await metricValue(page, "My Open Tickets")).toBe(dbOpen);
    expect(await metricValue(page, "Resolved")).toBe(dbResolved);
    expect(await metricValue(page, "In Progress")).toBe(metrics.inProgress);
    expect(await metricValue(page, "Closed")).toBe(metrics.closed);

    // Recent tickets: at most 5, newest first, only Jennifer's (no TKT-2026-0002xx from David)
    expect(recentTickets.length).toBeLessThanOrEqual(5);
    const rows = dashboard.getByTestId("dashboard-ticket-row");
    await expect(rows).toHaveCount(recentTickets.length);
    await expect(dashboard).not.toContainText("TKT-2026-0002");

    // Attention required: callout + badge for WAITING_FOR_REQUESTER
    expect(dbWaiting).toBeGreaterThan(0);
    await expect(dashboard.getByRole("status")).toContainText("waiting for your response");
    await expect(dashboard.getByText("Attention Required").first()).toBeVisible();

    await expectNoHorizontalOverflow(page);
    await expectMobileTouchTargets(page, '[data-testid="requester-dashboard"]');
    await snap(page, "requester-dashboard", "01-requester-dashboard", testInfo.project.name);

    // Ownership protection: other dashboards are forbidden, staff routes redirect home
    for (const role of ["staff", "admin"]) {
      const res = await request.get(`${API_URL}/api/dashboards/${role}`, { headers: bearer(token) });
      expect(res.status()).toBe(403);
    }
    await page.goto("/queue");
    await expect(page).toHaveURL(/\/tickets$/);

    // Drill-down: My Open Tickets -> filtered My Tickets with the same count
    await openDashboard(page);
    await metricCard(page, "My Open Tickets").click();
    await expect(page).toHaveURL(/\/tickets\?filter=open$/);
    await expect(page.getByLabel("Current Status")).toHaveValue("OPEN_ALL");
    const openList = await (
      await request.get(`${API_URL}/api/tickets?filter=open`, { headers: bearer(token) })
    ).json();
    expect(openList.pagination.total).toBe(dbOpen);

    await openDashboard(page);
    await metricCard(page, "Resolved").click();
    await expect(page).toHaveURL(/\/tickets\?status=RESOLVED$/);

    // Recent ticket row -> Ticket Detail; Quick Action -> Create Ticket
    await openDashboard(page);
    const first = recentTickets[0];
    await dashboard.getByRole("link", { name: first.ticketNumber }).click();
    await expect(page).toHaveURL(new RegExp(`/tickets/${first.id}$`));
    await openDashboard(page);
    await dashboard.getByRole("link", { name: /Create Ticket/ }).click();
    await expect(page).toHaveURL(/\/tickets\/new$/);
  });

  test("AC-12: IT Staff dashboard shows KPI cards with trends that match the database and drill down to the filtered queue", async ({
    page,
    request,
  }, testInfo) => {
    await login(page, "michael");
    await openDashboard(page);
    await expect(page.getByRole("heading", { name: "Welcome back, Michael!" })).toBeVisible();
    const dashboard = page.getByTestId("staff-dashboard");
    await expect(dashboard.getByTestId("metric-value")).toHaveCount(5);
    await expect(dashboard.getByTestId("trend-badge")).toHaveCount(5);

    const token = await apiToken(request, "michael");
    const { metrics, urgentTickets, recentTickets } = await (
      await request.get(`${API_URL}/api/dashboards/staff`, { headers: bearer(token) })
    ).json();
    const michaelId = await userIdByEmail(request, USERS.michael.email);
    const dbNew = dbCount("ticket", { currentStatus: "NEW" });
    // spec FR-18 / api-spec 4.2: owner IS NULL and status not in (CLOSED, CANCELLED)
    const dbUnassigned = dbCount("ticket", { ticketOwnerId: null, currentStatus: { notIn: ["CLOSED", "CANCELLED"] } });
    const dbMyActions = dbCount("actionTaken", { performedByUserId: michaelId });
    expect(metrics.new).toBe(dbNew);
    expect(metrics.unassigned).toBe(dbUnassigned);
    expect(metrics.myActionsCount).toBe(dbMyActions);
    expect(await metricValue(page, "New")).toBe(dbNew);
    expect(await metricValue(page, "Open")).toBe(metrics.open);
    expect(await metricValue(page, "In Progress")).toBe(metrics.inProgress);
    expect(await metricValue(page, "Waiting for Requester")).toBe(metrics.waitingForRequester);
    expect(await metricValue(page, "My Assigned")).toBe(metrics.myAssigned);
    await expect(dashboard.getByRole("link", { name: `Unassigned: ${dbUnassigned}. Open unassigned queue` })).toBeVisible();
    await expect(dashboard.getByText(`My Actions Recorded: ${dbMyActions}`)).toBeVisible();

    // Recent & urgent list: urgent pinned first, rows open Ticket Detail
    const rows = dashboard.getByTestId("dashboard-ticket-row");
    expect(await rows.count()).toBeGreaterThan(0);
    if (urgentTickets.length > 0) {
      await expect(rows.first()).toContainText(urgentTickets[0].ticketNumber);
    }
    expect(urgentTickets.length + recentTickets.length).toBeGreaterThan(0);

    await expectNoHorizontalOverflow(page);
    await expectMobileTouchTargets(page, '[data-testid="staff-dashboard"]');
    await snap(page, "staff-dashboard", "01-staff-dashboard", testInfo.project.name);

    // Drill-down count == queue count for the same filter
    const queue = await (
      await request.get(`${API_URL}/api/staff/tickets?status=NEW`, { headers: bearer(token) })
    ).json();
    expect(queue.pagination.total).toBe(dbNew);
    await metricCard(page, "New").click();
    await expect(page).toHaveURL(/\/queue\?status=NEW$/);
    await expect(page.getByLabel("Filter by Status")).toHaveValue("NEW");

    await page.goBack();
    await expect(page).toHaveURL(/\/dashboard$/);
    await metricCard(page, "My Assigned").click();
    await expect(page).toHaveURL(/\/queue\?owner=me$/);
    await expect(page.getByLabel("Filter by Owner")).toHaveValue("me");

    await openDashboard(page);
    await dashboard.getByRole("link", { name: /^Unassigned: \d+/ }).click();
    await expect(page).toHaveURL(/\/queue\?owner=unassigned$/);

    await openDashboard(page);
    await rows.first().getByRole("link").first().click();
    await expect(page).toHaveURL(/\/queue\/\d+$/);

    // Keyboard: metric cards are focusable with a visible focus ring and open with Enter
    await openDashboard(page);
    const newCard = metricCard(page, "New");
    await newCard.focus();
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Tab");
    await expect(newCard).toBeFocused();
    // box-shadow animates over 0.15s, so wait for the settled focus ring
    await expect
      .poll(() => newCard.evaluate((el) => getComputedStyle(el).boxShadow))
      .toContain("rgba(11, 122, 70, 0.2)");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/queue\?status=NEW$/);

    // Staff may not read Requester or Admin dashboards
    for (const role of ["requester", "admin"]) {
      const res = await request.get(`${API_URL}/api/dashboards/${role}`, { headers: bearer(token) });
      expect(res.status()).toBe(403);
    }
  });

  test("AC-12: 'My Actions Recorded' reflects the current user's Actions Taken after Refresh", async ({ page, request }) => {
    await login(page, "michael");
    await openDashboard(page);
    const dashboard = page.getByTestId("staff-dashboard");
    const before = Number(
      (await dashboard.getByText(/My Actions Recorded: \d+/).textContent())?.match(/\d+/)?.[0]
    );

    const ticketId = await ticketIdByNumber(request, "TKT-2026-000101");
    const created = await request.post(`${API_URL}/api/tickets/${ticketId}/actions-taken`, {
      headers: bearer(await apiToken(request, "michael")),
      data: { description: "Checked BIOS power settings.", result: "Set to balanced profile.", isFollowUpRequired: false },
    });
    expect(created.status()).toBe(201);

    // Another staff member's action must not count toward Michael's total
    await request.post(`${API_URL}/api/tickets/${ticketId}/actions-taken`, {
      headers: bearer(await apiToken(request, "sarah")),
      data: { description: "Second opinion on battery wear.", result: "Agree pack is degraded.", isFollowUpRequired: false },
    });

    const refresh = dashboard.getByRole("button", { name: /Refresh/ });
    await refresh.click();
    await expect(dashboard.getByText(`My Actions Recorded: ${before + 1}`)).toBeVisible();
    await expect(refresh).toBeEnabled();
  });

  test("Dashboard loading, empty, forbidden, and safe-failure states with Retry", async ({ page }, testInfo) => {
    const project = testInfo.project.name;
    await login(page, "michael");

    // Loading
    await page.route("**/api/dashboards/staff", async (route) => {
      await new Promise((r) => setTimeout(r, 1500));
      await route.continue();
    });
    await page.locator('header button[aria-label="Dashboard"]').click();
    await expect(page.getByRole("status").filter({ hasText: "Loading dashboard..." })).toBeVisible();
    await snap(page, "staff-dashboard", "02-loading", project);
    await expect(page.getByTestId("metric-value")).toHaveCount(5);
    await page.unroute("**/api/dashboards/staff");

    // Empty: zero metrics and no tickets
    await page.route("**/api/dashboards/staff", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_OPERATIONAL) })
    );
    await page.reload();
    const values = page.getByTestId("metric-value");
    await expect(values).toHaveCount(5);
    await expect(values).toHaveText(["0", "0", "0", "0", "0"]);
    await expect(page.getByText("No recent tickets to display.")).toBeVisible();
    await expect(page.getByTestId("trend-badge").first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await snap(page, "staff-dashboard", "03-empty", project);
    await page.unroute("**/api/dashboards/staff");

    // Safe failure: 500 shows a non-technical alert with Retry that recovers
    await page.route("**/api/dashboards/staff", (route) =>
      route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: "Dashboard is temporarily unavailable." }) })
    );
    await page.reload();
    const alert = page.getByRole("alert");
    await expect(alert).toContainText("Dashboard is temporarily unavailable.");
    await expect(page.getByTestId("metric-value")).toHaveCount(0);
    await snap(page, "staff-dashboard", "04-safe-failure", project);
    await page.unroute("**/api/dashboards/staff");
    await alert.getByRole("button", { name: "Retry" }).click();
    await expect(page.getByTestId("metric-value")).toHaveCount(5);
    await expect(page.getByRole("alert")).toHaveCount(0);

    // Forbidden: a 403 renders a permission message rather than data
    await page.route("**/api/dashboards/staff", (route) =>
      route.fulfill({ status: 403, contentType: "application/json", body: JSON.stringify({ error: "Forbidden" }) })
    );
    await page.reload();
    await expect(page.getByRole("alert")).toContainText("You do not have permission to view this dashboard.");
    await snap(page, "staff-dashboard", "05-forbidden", project);
    await page.unroute("**/api/dashboards/staff");
  });

  test("Requester dashboard empty and safe-failure states", async ({ page }, testInfo) => {
    const project = testInfo.project.name;
    await login(page, "jennifer");

    await page.route("**/api/dashboards/requester", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          metrics: { myOpenTickets: 0, waitingForRequester: 0, inProgress: 0, resolved: 0, closed: 0 },
          recentTickets: [],
        }),
      })
    );
    await openDashboard(page);
    await expect(page.getByTestId("metric-value")).toHaveText(["0", "0", "0", "0"]);
    await expect(page.getByText("You have not submitted any tickets yet.")).toBeVisible();
    await expect(page.getByText(/waiting for your response/)).toHaveCount(0);
    await expectNoHorizontalOverflow(page);
    await snap(page, "requester-dashboard", "02-empty", project);
    await page.unroute("**/api/dashboards/requester");

    await page.route("**/api/dashboards/requester", (route) => route.abort("failed"));
    await page.reload();
    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page.getByRole("alert").getByRole("button", { name: "Retry" })).toBeVisible();
    await snap(page, "requester-dashboard", "03-safe-failure", project);
    await page.unroute("**/api/dashboards/requester");
    await page.getByRole("button", { name: "Retry" }).click();
    await expect(page.getByTestId("metric-value")).toHaveCount(4);
  });

  test("AC-13: Administrator dashboard shows operational metrics and user governance counts that match the database", async ({
    page,
    request,
  }, testInfo) => {
    await login(page, "admin");
    await openDashboard(page);

    const dashboard = page.getByTestId("admin-dashboard");
    await expect(dashboard.getByTestId("metric-value")).toHaveCount(5);
    const governance = page.getByRole("region", { name: "User Governance" });
    await expect(governance).toBeVisible();

    const token = await apiToken(request, "admin");
    const { userStats, operationalMetrics } = await (
      await request.get(`${API_URL}/api/dashboards/admin`, { headers: bearer(token) })
    ).json();
    expect(userStats.totalUsers).toBe(dbCount("user", {}));
    expect(userStats.inactiveUsers).toBe(dbCount("user", { isActive: false }));
    expect(operationalMetrics.new).toBe(dbCount("ticket", { currentStatus: "NEW" }));
    await expect(governance.getByText("Total Users")).toBeVisible();
    await expect(governance).toContainText(String(userStats.totalUsers));
    await expect(governance).toContainText(String(userStats.inactiveUsers));

    await expectNoHorizontalOverflow(page);
    await expectMobileTouchTargets(page, '[data-testid="admin-dashboard"]');
    await snap(page, "admin-dashboard", "01-admin-dashboard", testInfo.project.name);

    await governance.getByRole("link", { name: "Manage users" }).click();
    await expect(page).toHaveURL(/\/admin\/users$/);
  });
});
