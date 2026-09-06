import { test, expect } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const screenshotsBase = path.resolve(__dirname, "../../artifacts/lab-02/screenshots");

// Helper to ensure directory exists
function ensureDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

test.describe("Visual Responsive Screenshots Capture", () => {
  test.beforeAll(() => {
    ensureDir(path.join(screenshotsBase, "create-ticket"));
    ensureDir(path.join(screenshotsBase, "my-tickets"));
    ensureDir(path.join(screenshotsBase, "ticket-detail"));
  });

  // Helper to log in as Jennifer Anderson
  async function selectJennifer(page: any) {
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.setItem("toktickit_requester_id", "1");
      localStorage.setItem(
        "toktickit_requester_data",
        JSON.stringify({
          id: 1,
          name: "Jennifer Anderson",
          email: "jennifer.anderson@kmutt.ac.th",
          department: "Computer Engineering",
        })
      );
    });
    await page.reload();
    await page.waitForSelector("header");
  }

  // -------------------------------------------------------------
  // Group 1: create-ticket screenshots
  // -------------------------------------------------------------
  test("Capture Create Ticket Screenshots (01 to 05)", async ({ page }) => {
    // 01-create-ticket-desktop.png (1280px clean initial screen)
    await page.setViewportSize({ width: 1280, height: 800 });
    await selectJennifer(page);
    await page.goto("/tickets/new");
    await expect(page.locator("h1")).toContainText("Create New IT Support Ticket");
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(screenshotsBase, "create-ticket", "01-create-ticket-desktop.png"),
      fullPage: true,
    });

    // 02-create-ticket-validation-errors.png (Field-level validation messages)
    await page.locator("#summary").fill("Hi");
    await page.locator("#description").fill("Short");
    await page.locator('button[type="submit"]:has-text("Submit Ticket")').click();
    await expect(page.locator("text=Summary must be at least 5 characters")).toBeVisible();
    await expect(page.locator("text=Description must be at least 10 characters")).toBeVisible();
    await page.screenshot({
      path: path.join(screenshotsBase, "create-ticket", "02-create-ticket-validation-errors.png"),
      fullPage: true,
    });

    // 03-create-ticket-attachments.png (Valid and invalid attachment handling)
    const invalidFixture = path.resolve(__dirname, "../fixtures/malicious.exe");
    const validFixture = path.resolve(__dirname, "../fixtures/test-screenshot.png");

    // Upload valid file first
    await page.locator('input[type="file"]').setInputFiles(validFixture);
    await expect(page.locator("text=test-screenshot.png")).toBeVisible();

    // Now attempt uploading invalid file to trigger error banner alongside staged file
    await page.locator('input[type="file"]').setInputFiles(invalidFixture);
    await expect(page.locator(".alert-danger:has-text('Unsupported file type')")).toBeVisible();

    await page.screenshot({
      path: path.join(screenshotsBase, "create-ticket", "03-create-ticket-attachments.png"),
      fullPage: true,
    });

    // 04-create-ticket-failure-preserved.png (Preserved form state on API failure)
    await page.locator("#categoryId").selectOption({ label: "Hardware" });
    await page.locator("#relatedSystemId").selectOption({ label: "Corporate Laptop" });
    await page.locator('label:has-text("high")').click();
    await page.locator("#summary").fill("Laptop battery drains rapidly after latest OS update");
    await page.locator("#description").fill(
      "The battery drops from 100% to 15% in less than 45 minutes even with low screen brightness and no heavy apps running. Started right after yesterday's patch."
    );

    // Mock API failure for POST /api/tickets
    await page.route("**/api/tickets", async (route: any) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({
            error: "Submission failed: Internal server error. Your form data has been preserved.",
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.locator('button[type="submit"]:has-text("Submit Ticket")').click();
    await expect(page.locator(".alert-danger:has-text('Submission failed')")).toBeVisible();

    // Verify inputs preserved
    await expect(page.locator("#summary")).toHaveValue("Laptop battery drains rapidly after latest OS update");
    await page.screenshot({
      path: path.join(screenshotsBase, "create-ticket", "04-create-ticket-failure-preserved.png"),
      fullPage: true,
    });

    // Unroute for future requests
    await page.unroute("**/api/tickets");

    // 05-create-ticket-mobile.png (Create ticket layout at 375px)
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/tickets/new");
    await expect(page.locator("h1")).toContainText("Create New IT Support Ticket");
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(screenshotsBase, "create-ticket", "05-create-ticket-mobile.png"),
      fullPage: true,
    });
  });

  // -------------------------------------------------------------
  // Group 2: my-tickets screenshots
  // -------------------------------------------------------------
  test("Capture My Tickets Screenshots (01 to 05)", async ({ page }) => {
    // 01-my-tickets-desktop.png (1280px data table with badges, sorting, pagination)
    await page.setViewportSize({ width: 1280, height: 800 });
    await selectJennifer(page);
    await page.goto("/tickets");
    await expect(page.locator("h1")).toContainText("My Tickets");
    await expect(page.locator("table")).toBeVisible();
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(screenshotsBase, "my-tickets", "01-my-tickets-desktop.png"),
      fullPage: true,
    });

    // 02-my-tickets-filtered.png (Active search and category filters applied)
    await page.locator("#filterCategory").selectOption({ label: "Hardware" });
    await page.waitForTimeout(400);
    await page.screenshot({
      path: path.join(screenshotsBase, "my-tickets", "02-my-tickets-filtered.png"),
      fullPage: true,
    });

    // 03-my-tickets-empty-and-no-results.png (No-results state with filter reset action)
    const searchInput = page.locator('input[placeholder*="Search by ticket number"]');
    await searchInput.fill("nonexistent-ticket-query-xyz");
    await expect(page.locator("text=No tickets match your filter criteria.")).toBeVisible();
    await page.screenshot({
      path: path.join(screenshotsBase, "my-tickets", "03-my-tickets-empty-and-no-results.png"),
      fullPage: true,
    });

    // 04-my-tickets-mobile-cards.png (Responsive card layout at 375px)
    await page.setViewportSize({ width: 375, height: 667 });
    await page.locator('button:has-text("Clear Filters")').first().click();
    await expect(page.locator(".ticket-card").first()).toBeVisible();
    await page.waitForTimeout(400);
    await page.screenshot({
      path: path.join(screenshotsBase, "my-tickets", "04-my-tickets-mobile-cards.png"),
      fullPage: true,
    });

    // 05-my-tickets-requester-switch.png (Showing ticket list changing when switching requester)
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.locator('button[aria-label="Profile"]').click();
    await page.locator('button:has-text("Switch Requester")').click();
    await expect(page.locator("h1")).toContainText("Select Development Requester");
    await page.locator("#requester-select").selectOption({ label: "David Lee" });
    await page.locator('button[type="submit"]:has-text("Continue")').click();
    await expect(page.locator("header")).toContainText("David Lee");
    await expect(page.locator("table")).toBeVisible();
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(screenshotsBase, "my-tickets", "05-my-tickets-requester-switch.png"),
      fullPage: true,
    });
  });

  // -------------------------------------------------------------
  // Group 3: ticket-detail screenshots
  // -------------------------------------------------------------
  test("Capture Ticket Detail Screenshots (01 to 05)", async ({ page }) => {
    // 01-ticket-detail-desktop.png (Read-only ticket detail with Zen Green styling)
    await page.setViewportSize({ width: 1280, height: 800 });
    await selectJennifer(page);

    // Create a fresh ticket with attachment so we have a known ticket to inspect & manipulate
    await page.goto("/tickets/new");
    await page.locator("#categoryId").selectOption({ label: "Hardware" });
    await page.locator("#relatedSystemId").selectOption({ label: "Corporate Laptop" });
    await page.locator('label:has-text("medium")').click();
    await page.locator("#summary").fill("Visual Audit: Laptop battery drains quickly after latest OS update");
    await page.locator("#description").fill(
      "The battery drops from 100% to 15% in less than 45 minutes even with low screen brightness and no heavy apps running. Started right after yesterday's patch."
    );

    const validFixture = path.resolve(__dirname, "../fixtures/test-screenshot.png");
    await page.locator('input[type="file"]').setInputFiles(validFixture);
    await page.locator('button[type="submit"]:has-text("Submit Ticket")').click();

    await expect(page.locator("h2")).toContainText("Ticket Created Successfully");
    const ticketNoElement = page.locator("text=/TKT-2026-\\d{6}/").first();
    await expect(ticketNoElement).toBeVisible();
    const ticketNo = (await ticketNoElement.innerText()).trim();

    // Navigate to ticket details
    await page.locator('button:has-text("Back to My Tickets")').click();
    await expect(page.locator("h1")).toContainText("My Tickets");
    const item = page.locator(`:is(tr.ticket-row, .ticket-card):has-text("${ticketNo}"):visible`).first();
    await item.click();
    await expect(page.locator('strong:has-text("Ticket Details")')).toBeVisible();
    await page.waitForTimeout(500);

    await page.screenshot({
      path: path.join(screenshotsBase, "ticket-detail", "01-ticket-detail-desktop.png"),
      fullPage: true,
    });

    // 02-ticket-detail-attachments-active.png (Active attachments with download action)
    const attachmentsCard = page.locator("text=Active Attachments").locator("..");
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
    await page.waitForTimeout(300);
    await page.screenshot({
      path: path.join(screenshotsBase, "ticket-detail", "02-ticket-detail-attachments-active.png"),
      fullPage: false,
    });

    // 03-ticket-detail-soft-remove-modal.png (Soft removal confirmation dialog with reason)
    await page.locator('button:has-text("Remove")').first().click();
    const removalModal = page.locator('.modal:has-text("Remove Attachment")');
    await expect(removalModal).toBeVisible();
    await removalModal
      .locator("#removalReason")
      .fill("Uploaded wrong screenshot containing internal data");
    await page.screenshot({
      path: path.join(screenshotsBase, "ticket-detail", "03-ticket-detail-soft-remove-modal.png"),
      fullPage: false,
    });

    // 04-ticket-detail-removed-attachments.png (Soft-removed attachment metadata and blocked download)
    await removalModal.locator('button:has-text("Confirm Soft Removal")').click();
    await expect(removalModal).not.toBeVisible();
    await expect(page.locator("text=Removed Attachments History")).toBeVisible();
    await page.screenshot({
      path: path.join(screenshotsBase, "ticket-detail", "04-ticket-detail-removed-attachments.png"),
      fullPage: true,
    });

    // 05-ticket-detail-mobile.png (Ticket detail view at 375px)
    await page.setViewportSize({ width: 375, height: 667 });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(300);
    await page.screenshot({
      path: path.join(screenshotsBase, "ticket-detail", "05-ticket-detail-mobile.png"),
      fullPage: true,
    });
  });
});
