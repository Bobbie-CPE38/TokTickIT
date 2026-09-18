import { test, expect, Page } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { execSync } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const screenshotsBase = path.resolve(__dirname, "../../artifacts/lab-03/screenshots");

function ensureDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// Assert zero horizontal overflow
async function assertZeroHorizontalOverflow(page: Page) {
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
}

// Assert mobile touch target minimum size
async function assertTouchTargetHeight(page: Page, selector: string, minHeight = 44) {
  const elements = await page.locator(selector).all();
  for (const el of elements) {
    if (await el.isVisible()) {
      const box = await el.boundingBox();
      if (box && box.height > 0) {
        expect(box.height).toBeGreaterThanOrEqual(minHeight - 2); // 42-44px threshold
      }
    }
  }
}

test.describe("Visual Responsive Screenshots & Layout Audits", () => {
  test.beforeAll(() => {
    ensureDir(path.join(screenshotsBase, "authentication"));
    ensureDir(path.join(screenshotsBase, "staff-queue"));
    ensureDir(path.join(screenshotsBase, "staff-ticket-detail"));
    ensureDir(path.join(screenshotsBase, "user-management"));

    try {
      execSync("npm run prisma:seed", { cwd: "./server", stdio: "ignore" });
    } catch (err) {
      console.error("Seed error before screenshots:", err);
    }
  });

  // -------------------------------------------------------------
  // Group 1: Authentication Screenshots
  // -------------------------------------------------------------
  test("Capture Authentication Screenshots (Login & Change Password)", async ({ page }) => {
    // 01-login-desktop.png (1280x800)
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/login");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(page.locator("h1")).toContainText("Sign in to your account");
    await assertZeroHorizontalOverflow(page);
    await page.screenshot({
      path: path.join(screenshotsBase, "authentication", "01-login-desktop.png"),
      fullPage: true,
    });

    // 02-login-tablet.png (768x1024)
    await page.setViewportSize({ width: 768, height: 1024 });
    await assertZeroHorizontalOverflow(page);
    await page.screenshot({
      path: path.join(screenshotsBase, "authentication", "02-login-tablet.png"),
      fullPage: true,
    });

    // 03-login-mobile.png (375x667)
    await page.setViewportSize({ width: 375, height: 667 });
    await assertZeroHorizontalOverflow(page);
    await assertTouchTargetHeight(page, 'button[type="submit"]', 44);
    await page.screenshot({
      path: path.join(screenshotsBase, "authentication", "03-login-mobile.png"),
      fullPage: true,
    });

    // 04-login-invalid-error.png
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.locator("#email").fill("jennifer.anderson@kmutt.ac.th");
    await page.locator("#password").fill("InvalidPassword123!");
    await page.locator('button[type="submit"]').click();
    await expect(page.locator('div[role="alert"]')).toBeVisible();
    await page.screenshot({
      path: path.join(screenshotsBase, "authentication", "04-login-invalid-error.png"),
      fullPage: true,
    });

    // 05-change-password-desktop.png
    // Log in with temporary password user
    await page.locator("#email").fill("firstlogin.requester@toktickit.com");
    await page.locator("#password").fill("InitialPass123!");
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/change-password/);
    await page.locator("#currentPassword").fill("InitialPass123!");
    await page.locator("#newPassword").fill("Abcdef1!");
    await page.locator("#confirmPassword").fill("Abcdef1!");
    await page.waitForTimeout(300);
    await assertZeroHorizontalOverflow(page);
    await page.screenshot({
      path: path.join(screenshotsBase, "authentication", "05-change-password-desktop.png"),
      fullPage: true,
    });

    // 06-change-password-tablet.png
    await page.setViewportSize({ width: 768, height: 1024 });
    await assertZeroHorizontalOverflow(page);
    await page.screenshot({
      path: path.join(screenshotsBase, "authentication", "06-change-password-tablet.png"),
      fullPage: true,
    });

    // 07-change-password-mobile.png
    await page.setViewportSize({ width: 375, height: 667 });
    await assertZeroHorizontalOverflow(page);
    await assertTouchTargetHeight(page, 'button[type="submit"]', 44);
    await page.screenshot({
      path: path.join(screenshotsBase, "authentication", "07-change-password-mobile.png"),
      fullPage: true,
    });
  });

  // -------------------------------------------------------------
  // Group 2: Staff Queue Screenshots
  // -------------------------------------------------------------
  test("Capture Staff Queue Screenshots", async ({ page }) => {
    // Log in as Michael Brown
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/login");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.locator("#email").fill("staff.michael@toktickit.com");
    await page.locator("#password").fill("Password123!");
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/queue/);
    await expect(page.locator("h1")).toContainText("IT Staff Ticket Queue");

    // 01-staff-queue-desktop.png (8-column table)
    await assertZeroHorizontalOverflow(page);
    await page.screenshot({
      path: path.join(screenshotsBase, "staff-queue", "01-staff-queue-desktop.png"),
      fullPage: true,
    });

    // 02-staff-queue-tablet.png (768x1024)
    await page.setViewportSize({ width: 768, height: 1024 });
    await assertZeroHorizontalOverflow(page);
    await page.screenshot({
      path: path.join(screenshotsBase, "staff-queue", "02-staff-queue-tablet.png"),
      fullPage: true,
    });

    // 03-staff-queue-mobile.png (375x667 stacked cards)
    await page.setViewportSize({ width: 375, height: 667 });
    await assertZeroHorizontalOverflow(page);
    await expect(page.locator('[data-testid="staff-ticket-card"]').first()).toBeVisible();
    await assertTouchTargetHeight(page, '[data-testid="staff-ticket-card"]', 44);
    await page.screenshot({
      path: path.join(screenshotsBase, "staff-queue", "03-staff-queue-mobile.png"),
      fullPage: true,
    });

    // 04-staff-queue-filtered.png
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.locator('select[aria-label="Filter by Status"]').selectOption("OPEN");
    await page.locator('input[aria-label="Search tickets"]').fill("VPN");
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(screenshotsBase, "staff-queue", "04-staff-queue-filtered.png"),
      fullPage: true,
    });
  });

  // -------------------------------------------------------------
  // Group 3: Staff Ticket Detail Screenshots
  // -------------------------------------------------------------
  test("Capture Staff Ticket Detail Screenshots", async ({ page }) => {
    // Log in as Michael Brown and navigate to ticket 101
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/login");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.locator("#email").fill("staff.michael@toktickit.com");
    await page.locator("#password").fill("Password123!");
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/queue/);

    await page.locator('input[aria-label="Search tickets"]').fill("TKT-2026-000101");
    await page.waitForTimeout(500);
    await page.locator('tr:has-text("TKT-2026-000101")').click();
    await expect(page).toHaveURL(/\/queue\/\d+/);
    await expect(page.locator("text=TKT-2026-000101")).toBeVisible();

    // 01-staff-detail-desktop.png (4-column metadata grid)
    await assertZeroHorizontalOverflow(page);
    await page.screenshot({
      path: path.join(screenshotsBase, "staff-ticket-detail", "01-staff-detail-desktop.png"),
      fullPage: true,
    });

    // 02-staff-detail-tablet.png (768x1024)
    await page.setViewportSize({ width: 768, height: 1024 });
    await assertZeroHorizontalOverflow(page);
    await page.screenshot({
      path: path.join(screenshotsBase, "staff-ticket-detail", "02-staff-detail-tablet.png"),
      fullPage: true,
    });

    // 03-staff-detail-mobile.png (375x667)
    await page.setViewportSize({ width: 375, height: 667 });
    await assertZeroHorizontalOverflow(page);
    await page.screenshot({
      path: path.join(screenshotsBase, "staff-ticket-detail", "03-staff-detail-mobile.png"),
      fullPage: true,
    });

    // 04-status-resolution-modal.png
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.locator("#staff-status-select").selectOption("RESOLVED");
    await expect(page.locator('.modal-title:has-text("Resolve Ticket")')).toBeVisible();
    await page.locator("#modal-resolution-summary").fill("Battery unit replaced with new OEM pack and tested across 3 full cycles.");
    await page.screenshot({
      path: path.join(screenshotsBase, "staff-ticket-detail", "04-status-resolution-modal.png"),
      fullPage: true,
    });
    // Dismiss modal
    await page.locator('.modal-footer button:has-text("Cancel")').click();

    // 05-public-comments-tab.png
    await page.locator('button[role="tab"]:has-text("Public Comments")').click();
    await page.screenshot({
      path: path.join(screenshotsBase, "staff-ticket-detail", "05-public-comments-tab.png"),
      fullPage: true,
    });

    // 06-internal-notes-tab.png (Amber security styling)
    await page.locator('button[role="tab"]:has-text("Internal Notes")').click();
    await expect(page.locator("text=Internal Notes are visible ONLY to IT Staff and Administrators.")).toBeVisible();
    await page.screenshot({
      path: path.join(screenshotsBase, "staff-ticket-detail", "06-internal-notes-tab.png"),
      fullPage: true,
    });
  });

  // -------------------------------------------------------------
  // Group 4: User Management Screenshots
  // -------------------------------------------------------------
  test("Capture Administrator User Management Screenshots", async ({ page }) => {
    // Log in as John Smith (Admin)
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/login");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.locator("#email").fill("admin@toktickit.com");
    await page.locator("#password").fill("AdminPass123!");
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/admin\/users/);
    await expect(page.locator("h1")).toContainText("Users");

    // 01-user-management-desktop.png
    await assertZeroHorizontalOverflow(page);
    await page.screenshot({
      path: path.join(screenshotsBase, "user-management", "01-user-management-desktop.png"),
      fullPage: true,
    });

    // 02-user-management-tablet.png (768x1024)
    await page.setViewportSize({ width: 768, height: 1024 });
    await assertZeroHorizontalOverflow(page);
    await page.screenshot({
      path: path.join(screenshotsBase, "user-management", "02-user-management-tablet.png"),
      fullPage: true,
    });

    // 03-user-management-mobile.png (375x667)
    await page.setViewportSize({ width: 375, height: 667 });
    await assertZeroHorizontalOverflow(page);
    await page.screenshot({
      path: path.join(screenshotsBase, "user-management", "03-user-management-mobile.png"),
      fullPage: true,
    });

    // 04-create-user-drawer.png
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.locator('button:has-text("+ Create User")').click();
    const drawer = page.locator('.modal.show');
    await expect(drawer).toBeVisible();
    await page.locator("#userFullName").fill("Alex Thompson");
    await page.locator("#userEmailAddress").fill("alex.thompson@toktickit.com");
    await page.locator("#userRole").selectOption("IT_STAFF");
    await page.locator("#userInitialPassword").fill("TempPass123!");
    await page.screenshot({
      path: path.join(screenshotsBase, "user-management", "04-create-user-drawer.png"),
      fullPage: true,
    });
    await page.locator('button:has-text("Cancel")').click();

    // 05-edit-user-safety-guards.png
    const adminRow = page.locator('tr:has-text("John Smith")');
    await adminRow.locator('button:has-text("Edit")').click();
    await expect(drawer).toBeVisible();
    await expect(page.locator("text=You cannot deactivate your own account.")).toBeVisible();
    await page.screenshot({
      path: path.join(screenshotsBase, "user-management", "05-edit-user-safety-guards.png"),
      fullPage: true,
    });
    await page.locator('button:has-text("Cancel")').click();
  });
});
