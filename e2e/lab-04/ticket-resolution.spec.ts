import { test, expect } from "@playwright/test";
import { execSync } from "child_process";

test.describe("Ticket Resolution Gate & Optimistic Concurrency Protection (E2E-03)", () => {
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

  test("AC-08 & AC-09: Resolution Gate blocks resolution when 0 actions exist and permits after recording action", async ({
    page,
    isMobile,
  }) => {
    // 1. Locate and open ticket TKT-2026-000101 (IN_PROGRESS with 0 actions taken in seed)
    const searchInput = page.locator('input[aria-label="Search tickets"]');
    await searchInput.fill("TKT-2026-000101");
    await page.waitForTimeout(500);

    if (isMobile) {
      await page.locator('[data-testid="staff-ticket-card"]:has-text("TKT-2026-000101")').click();
    } else {
      await page.locator('tr:has-text("TKT-2026-000101")').click();
    }

    await expect(page).toHaveURL(/\/queue\/\d+/);
    await expect(page.locator("h5, .h5").filter({ hasText: "TKT-2026-000101" })).toBeVisible();

    // 2. Attempt transition to RESOLVED with 0 Actions Taken (AC-08, BR-09)
    const statusSelect = page.locator("#staff-status-select");
    await statusSelect.selectOption("RESOLVED");

    // Modal appears with Resolution Gate warning
    const resolveModalTitle = page.locator('.modal-title:has-text("Resolve Ticket")');
    await expect(resolveModalTitle).toBeVisible();

    const gateWarning = page.locator(
      "text=At least one Action Taken must be recorded before this ticket can be resolved."
    );
    await expect(gateWarning).toBeVisible();

    const confirmBtn = page.locator('.modal-footer button:has-text("Confirm Resolution")');
    await expect(confirmBtn).toBeDisabled();

    // Cancel modal
    await page.locator('.modal-footer button:has-text("Cancel")').click();
    await expect(resolveModalTitle).not.toBeVisible();

    // 3. Record an Action Taken
    await page.locator('button[role="tab"]:has-text("Actions Taken")').click();
    await page.locator('button:has-text("+ Record Action Taken")').click();

    await page
      .locator("#actionDescription")
      .fill("Replaced degraded battery with genuine OEM replacement unit.");
    await page
      .locator("#actionResult")
      .fill("Battery charges normally and passed discharge diagnostics.");
    await page.locator('button[type="submit"]:has-text("Save Action")').click();

    // Verify action is displayed
    await expect(
      page.locator("text=Replaced degraded battery with genuine OEM replacement unit.")
    ).toBeVisible();

    // 4. Now transition to RESOLVED (Gate satisfied)
    await statusSelect.selectOption("RESOLVED");
    await expect(resolveModalTitle).toBeVisible();
    await expect(gateWarning).not.toBeVisible();

    const summaryTextarea = page.locator("#modal-resolution-summary");
    await expect(summaryTextarea).toBeVisible();

    // Summary validation (min 5 chars)
    await summaryTextarea.fill("done");
    await expect(page.locator("text=Minimum 5 characters required")).toBeVisible();
    await expect(confirmBtn).toBeDisabled();

    await summaryTextarea.fill("Replaced laptop battery pack and verified normal charge cycle.");
    await expect(confirmBtn).toBeEnabled();

    await confirmBtn.click();

    // Verify status transitioned successfully
    await expect(page.locator("text=Ticket status transitioned to RESOLVED.")).toBeVisible();
    await expect(page.locator("text=Replaced laptop battery pack and verified normal charge cycle.")).toBeVisible();
  });

  test("AC-11 & BR-12: Optimistic concurrency collision triggers Stale Record dialog and preserves drafts", async ({
    page,
    isMobile,
  }) => {
    // 1. Locate and open ticket TKT-2026-000105
    const searchInput = page.locator('input[aria-label="Search tickets"]');
    await searchInput.fill("TKT-2026-000105");
    await page.waitForTimeout(500);

    if (isMobile) {
      await page.locator('[data-testid="staff-ticket-card"]:has-text("TKT-2026-000105")').click();
    } else {
      await page.locator('tr:has-text("TKT-2026-000105")').click();
    }

    await expect(page).toHaveURL(/\/queue\/\d+/);
    await expect(page.locator("h5, .h5").filter({ hasText: "TKT-2026-000105" })).toBeVisible();

    const currentUrl = page.url();
    const match = currentUrl.match(/\/queue\/(\d+)/);
    expect(match).not.toBeNull();
    const ticketId = match![1];

    // 2. Michael writes an unsubmitted draft comment in the Public Comments tab
    const commentsTab = page.locator('button[role="tab"]:has-text("Public Comments")');
    await commentsTab.click();

    const commentInput = page.locator("#staff-public-comment-input");
    const draftComment = "Michael's unsubmitted work draft that must survive stale collision";
    await commentInput.fill(draftComment);

    // 3. Concurrent update: Sarah Johnson updates ticket priority out-of-band via backend API
    const loginRes = await page.request.post("http://localhost:3000/api/auth/login", {
      data: {
        email: "staff.sarah@toktickit.com",
        password: "Password123!",
      },
    });
    expect(loginRes.ok()).toBeTruthy();
    const loginData = await loginRes.json();
    const sarahToken = loginData.token;

    const patchRes = await page.request.patch(
      `http://localhost:3000/api/staff/tickets/${ticketId}/priority`,
      {
        headers: {
          Authorization: `Bearer ${sarahToken}`,
          "Content-Type": "application/json",
        },
        data: {
          itPriority: "URGENT",
        },
      }
    );
    expect(patchRes.ok()).toBeTruthy();

    // 4. In browser, Michael attempts to transition status to IN_PROGRESS
    const statusSelect = page.locator("#staff-status-select");
    await statusSelect.selectOption("IN_PROGRESS");

    // 5. Backend responds with 409 Conflict -> Stale Record dialog displays
    const staleModalTitle = page.locator('.modal-title:has-text("Stale Record Detected")');
    await expect(staleModalTitle).toBeVisible();
    await expect(
      page.locator(
        "text=This ticket has been updated by another team member since you loaded the page."
      )
    ).toBeVisible();

    // 6. Michael clicks "Keep My Drafts & Refresh"
    const refreshBtn = page.locator('button:has-text("Keep My Drafts & Refresh")');
    await refreshBtn.click();
    await expect(staleModalTitle).not.toBeVisible();

    // 7. Verify draft comment was preserved in UI state
    await expect(commentInput).toHaveValue(draftComment);

    // 8. Verify refreshed authoritative state reflects Sarah's priority update
    await expect(page.locator("#staff-priority-select")).toHaveValue("URGENT");

    // 9. Michael can now successfully transition status with fresh updatedAt
    await statusSelect.selectOption("IN_PROGRESS");
    await expect(page.locator("text=Ticket status transitioned to IN_PROGRESS.")).toBeVisible();
  });
});
