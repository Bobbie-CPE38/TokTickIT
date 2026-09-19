import { test, expect } from "@playwright/test";
import { execSync } from "child_process";

test.describe("IT Staff Ticket Queue & Detail Operations (E2E-03)", () => {
  test.beforeEach(async ({ page }) => {
    // Restore clean seed state
    try {
      execSync("npm run prisma:seed", { cwd: "./server", stdio: "ignore" });
    } catch (err) {
      console.error("Prisma seed reset error:", err);
    }

    // Clear client storage
    await page.goto("/login");
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload();

    // Login as Michael Brown (IT Staff)
    await page.locator("#email").fill("staff.michael@toktickit.com");
    await page.locator("#password").fill("Password123!");
    await page.locator('button[type="submit"]:has-text("Sign In")').click();
    await expect(page).toHaveURL(/\/queue/);
  });

  test("AC-10 & FR-15: Queue filtering and search triage", async ({ page, isMobile }) => {
    // 1. Status Filter
    const statusSelect = page.locator('select[aria-label="Filter by Status"]');
    await statusSelect.selectOption("OPEN");

    // Wait for queue rows/cards to update and show Open status
    await expect(page.locator("body")).toContainText("Open");

    // 2. Search Input
    const searchInput = page.locator('input[aria-label="Search tickets"]');
    await searchInput.fill("VPN");

    // Wait for debounced search to filter
    await page.waitForTimeout(500);

    // Verify ticket TKT-2026-000102 is visible
    if (isMobile) {
      await expect(
        page.locator('[data-testid="staff-ticket-card"]:has-text("TKT-2026-000102")')
      ).toBeVisible();
    } else {
      await expect(page.locator('tr:has-text("TKT-2026-000102")')).toBeVisible();
    }
  });

  test("AC-11, AC-12, AC-13, AC-14, AC-15: Complete Staff Operational Workflow", async ({
    page,
    isMobile,
  }) => {
    // Search to locate TKT-2026-000102
    const searchInput = page.locator('input[aria-label="Search tickets"]');
    await searchInput.fill("TKT-2026-000102");
    await page.waitForTimeout(500);

    // 1. Open Ticket Detail for TKT-2026-000102
    if (isMobile) {
      await page.locator('[data-testid="staff-ticket-card"]:has-text("TKT-2026-000102")').click();
    } else {
      await page.locator('tr:has-text("TKT-2026-000102")').click();
    }

    await expect(page).toHaveURL(/\/queue\/\d+/);
    await expect(page.locator("h5, .h5").filter({ hasText: "TKT-2026-000102" })).toBeVisible();

    // 2. Claim Ticket Ownership (AC-11, BR-10)
    const ownerSelect = page.locator("#staff-owner-select");
    await expect(ownerSelect).toBeVisible();
    // Select Michael Brown
    const michaelOption = ownerSelect.locator('option:has-text("Michael Brown")');
    const michaelValue = await michaelOption.getAttribute("value");
    if (michaelValue) {
      await ownerSelect.selectOption(michaelValue);
      await expect(page.locator("text=Ticket ownership updated.")).toBeVisible();
    }

    // 3. Update IT Priority (AC-12, BR-11)
    const prioritySelect = page.locator("#staff-priority-select");
    await prioritySelect.selectOption("URGENT");
    await expect(page.locator("text=IT Priority updated.")).toBeVisible();
    await expect(prioritySelect).toHaveValue("URGENT");

    // 4. Status Transition with Validation Modal (AC-13, BR-14, BR-15)
    const statusSelect = page.locator("#staff-status-select");
    // Transition OPEN -> IN_PROGRESS
    await statusSelect.selectOption("IN_PROGRESS");
    await expect(page.locator("text=Ticket status transitioned to IN_PROGRESS.")).toBeVisible();

    // Transition IN_PROGRESS -> RESOLVED (Modal required)
    await statusSelect.selectOption("RESOLVED");

    // Verify confirmation modal opens
    const modalHeading = page.locator('.modal-title:has-text("Resolve Ticket")');
    await expect(modalHeading).toBeVisible();

    const summaryTextarea = page.locator("#modal-resolution-summary");
    const confirmBtn = page.locator('.modal-footer button:has-text("Confirm Resolution")');

    // Attempt submit with empty summary -> rejected
    await confirmBtn.click();
    await expect(
      page.locator("text=Resolution summary is required and must be at least 5 characters.")
    ).toBeVisible();

    // Enter compliant resolution summary >= 5 chars
    await summaryTextarea.fill("Replaced client VPN profile and resolved network handshake failure.");
    await confirmBtn.click();

    // Modal dismisses and status updates
    await expect(page.locator("text=Ticket status transitioned to RESOLVED.")).toBeVisible();

    // 5. Post Public Comment (AC-14, BR-12)
    const commentsTab = page.locator('button[role="tab"]:has-text("Public Comments")');
    await commentsTab.click();

    const commentInput = page.locator("#staff-public-comment-input");
    await commentInput.fill("We have updated the VPN profile. Please test connecting from home.");
    await page.locator('button:has-text("Post Comment")').click();

    // Comment appears in thread as paragraph
    await expect(
      page.locator('p:has-text("We have updated the VPN profile. Please test connecting from home.")').first()
    ).toBeVisible();

    // 6. Post Internal Note (AC-15, BR-04, BR-13)
    const notesTab = page.locator('button[role="tab"]:has-text("Internal Notes")');
    await notesTab.click();

    // Verify amber warning security banner
    await expect(
      page.locator("text=Internal Notes are visible ONLY to IT Staff and Administrators.")
    ).toBeVisible();

    const noteInput = page.locator("#staff-internal-note-input");
    await noteInput.fill("Root cause identified as outdated RADIUS intermediate cert on gateway.");
    await page.locator('button:has-text("Save Internal Note")').click();

    // Note appears in thread as paragraph
    await expect(
      page.locator('p:has-text("Root cause identified as outdated RADIUS intermediate cert on gateway.")').first()
    ).toBeVisible();
  });
});
