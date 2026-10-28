import { test, expect, Page } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Lab 3 replaced the Lab 2 development requester selector with real authentication.
async function signIn(page: Page, email: string) {
  await page.goto("/login");
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.goto("/login");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill("Password123!");
  await page.locator('button[type="submit"]:has-text("Sign In")').click();
}

test.describe("Requester Ticket Flow (E2E-01)", () => {
  test.beforeEach(async ({ page }) => {
    // Clear stored credentials to start signed out
    await page.goto("/login");
    await page.evaluate(() => localStorage.clear());
    await page.goto("/login");
  });

  test("E2E-01: Complete Requester Flow - Select User -> Create Ticket with Attachment -> View in My Tickets -> Inspect Detail -> Soft Remove Attachment", async ({
    page,
  }) => {
    // -------------------------------------------------------------
    // Step 1: Sign in as the Requester (AC-02, AC-05)
    // -------------------------------------------------------------
    // Unauthenticated users see the sign-in screen
    await expect(page.locator("h1")).toContainText("Sign in to your account");

    // Inactive requester cannot sign in (AC-05)
    await signIn(page, "alex.inactive@kmutt.ac.th");
    await expect(page.locator('div[role="alert"]')).toBeVisible();
    await expect(page).toHaveURL(/\/login/);

    // Sign in as Jennifer Anderson; header reflects her identity
    await signIn(page, "jennifer.anderson@kmutt.ac.th");
    await expect(page).toHaveURL(/\/tickets/);
    await expect(page.locator("header")).toContainText("Jennifer Anderson");

    // -------------------------------------------------------------
    // Step 2: Navigate to Create Ticket & Submit (AC-01, AC-07)
    // -------------------------------------------------------------
    // Click Create Ticket in header or page action
    const createNavBtn = page.locator('header button:has-text("Create Ticket")');
    await createNavBtn.click();

    await expect(page.locator("h1")).toContainText("Create New IT Support Ticket");

    // Select Category and Related System
    await page.locator("#categoryId").selectOption({ label: "Hardware" });
    await page.locator("#relatedSystemId").selectOption({ label: "Corporate Laptop" });

    // Select Requested Priority "High"
    await page.locator('label:has-text("high")').click();

    // Fill Summary and Description
    const uniqueSummary = `E2E Automated Ticket - Battery Issue ${Date.now()}`;
    const descriptionText =
      "The laptop battery drains rapidly from 100% to 15% in 45 minutes under normal office use.";

    await page.locator("#summary").fill(uniqueSummary);
    await page.locator("#description").fill(descriptionText);

    // Stage attachment (AC-10)
    const fixturePath = path.resolve(__dirname, "../fixtures/test-screenshot.png");
    await page.locator('input[type="file"]').setInputFiles(fixturePath);

    // Verify staged file pill appears
    await expect(page.locator("text=test-screenshot.png")).toBeVisible();

    // Submit Ticket & Verify Busy State (AC-07)
    const submitBtn = page.locator('button[type="submit"]:has-text("Submit Ticket")');
    await submitBtn.click();

    // Success Screen Verification (AC-01)
    await expect(page.locator("h2")).toContainText("Ticket Created Successfully");
    const ticketNoElement = page.locator("text=/TKT-2026-\\d{6}/").first();
    await expect(ticketNoElement).toBeVisible();
    const generatedTicketNo = (await ticketNoElement.innerText()).trim();
    expect(generatedTicketNo).toMatch(/^TKT-2026-\d{6}$/);

    // -------------------------------------------------------------
    // Step 3: View in My Tickets (AC-04)
    // -------------------------------------------------------------
    await page.locator('button:has-text("Back to My Tickets")').click();

    // Wait for tickets list to load
    await expect(page.locator("h1")).toContainText("My Tickets");

    // Search for the newly created ticket to ensure discovery
    const searchInput = page.locator('input[placeholder*="Search by ticket number"]');
    await searchInput.fill(generatedTicketNo);

    // Locate the matching row or mobile card
    const ticketItem = page.locator(`:is(tr.ticket-row, .ticket-card):has-text("${generatedTicketNo}"):visible`).first();
    await expect(ticketItem).toBeVisible();
    await expect(ticketItem).toContainText("New");
    await expect(ticketItem).toContainText("Hardware");

    // -------------------------------------------------------------
    // Step 4: Inspect Ticket Detail (AC-01, FR-13)
    // -------------------------------------------------------------
    await ticketItem.click();

    // Verify Ticket Details view
    await expect(page.locator('strong:has-text("Ticket Details")')).toBeVisible();
    await expect(page.locator('label:has-text("Ticket No.")').locator('..')).toContainText(generatedTicketNo);
    await expect(page.locator('label:has-text("Requester")').locator('..')).toContainText("Jennifer Anderson");
    await expect(page.locator('label:has-text("Related System")').locator('..')).toContainText("Corporate Laptop");
    await expect(page.locator(`text=${uniqueSummary}`)).toBeVisible();

    // -------------------------------------------------------------
    // Step 5: Attachment Download & Soft Removal (AC-12, AC-13)
    // -------------------------------------------------------------
    // Verify active attachment is listed
    const activeRow = page.locator(`tr:has-text("test-screenshot.png"), .card:has-text("test-screenshot.png")`).first();
    await expect(activeRow).toBeVisible();

    // Test Download (AC-12)
    const downloadPromise = page.waitForEvent("download");
    await activeRow.locator('button:has-text("Download")').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe("test-screenshot.png");

    // Initiate Soft Removal (AC-13)
    await activeRow.locator('button:has-text("Remove")').click();

    // Verify Soft Removal Modal
    const removalModal = page.locator('.modal:has-text("Remove Attachment")');
    await expect(removalModal).toBeVisible();

    // Enter mandatory reason (>= 3 chars)
    const removalReason = "Uploaded redundant test screenshot during verification";
    await removalModal.locator("#removalReason").fill(removalReason);

    // Confirm soft removal
    await removalModal.locator('button:has-text("Confirm Soft Removal")').click();
    await expect(removalModal).not.toBeVisible();

    // Verify attachment transitioned to Removed Attachments History
    const removedSection = page.locator("text=Removed Attachments History");
    await expect(removedSection).toBeVisible();

    const removedItem = page.locator(`.border:has-text("test-screenshot.png")`).first();
    await expect(removedItem).toContainText("Removed");
    await expect(removedItem).toContainText(removalReason);
    await expect(removedItem).toContainText("(Download Disabled)");

    // -------------------------------------------------------------
    // Step 6: Multi-Tenant Requester Switch (AC-04)
    // -------------------------------------------------------------
    // Sign out from the Profile menu, then sign in as David Lee
    await page.locator('button[aria-label="Profile"]').click();
    await page.locator('button:has-text("Sign Out")').click();
    await expect(page).toHaveURL(/\/login/);
    await signIn(page, "david.lee@kmutt.ac.th");
    await expect(page.locator("header")).toContainText("David Lee");

    // Verify My Tickets list refreshed and Jennifer's ticket is NOT present (AC-04)
    await expect(page.locator("h1")).toContainText("My Tickets");
    await expect(page.locator(`text=${generatedTicketNo}`)).not.toBeVisible();

    const davidSearch = page.locator('input[placeholder*="Search by ticket number"]');
    await davidSearch.fill(generatedTicketNo);
    await expect(page.locator("text=No tickets match your filter criteria.")).toBeVisible({ timeout: 10000 });
  });
});
