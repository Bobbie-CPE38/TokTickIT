import { test, expect } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe("Requester Ticket Flow (E2E-01)", () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage to ensure a clean requester selection state
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test("E2E-01: Complete Requester Flow - Select User -> Create Ticket with Attachment -> View in My Tickets -> Inspect Detail -> Soft Remove Attachment", async ({
    page,
  }) => {
    // -------------------------------------------------------------
    // Step 1: Select Development Requester (AC-02, AC-05)
    // -------------------------------------------------------------
    // Verify modal appears when unauthenticated
    await expect(page.locator("h1")).toContainText("Select Development Requester");

    // Verify Inactive requester is excluded (AC-05)
    const selectOptions = await page.locator("#requester-select option").allTextContents();
    expect(selectOptions.some((opt) => opt.includes("Alex Inactive"))).toBe(false);

    // Select Jennifer Anderson (ID 1)
    await page.locator("#requester-select").selectOption({ label: "Jennifer Anderson" });
    await page.locator('button[type="submit"]:has-text("Continue")').click();

    // Verify modal is dismissed and header reflects Jennifer Anderson
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
    // Open Profile dropdown
    await page.locator('button[aria-label="Profile"]').click();
    await page.locator('button:has-text("Switch Requester")').click();

    // Select David Lee
    await expect(page.locator("h1")).toContainText("Select Development Requester");
    await page.locator("#requester-select").selectOption({ label: "David Lee" });
    await page.locator('button[type="submit"]:has-text("Continue")').click();

    // Verify My Tickets list refreshed and Jennifer's ticket is NOT present (AC-04)
    await expect(page.locator("h1")).toContainText("My Tickets");
    await expect(page.locator(`text=${generatedTicketNo}`)).not.toBeVisible();

    const davidSearch = page.locator('input[placeholder*="Search by ticket number"]');
    await davidSearch.fill(generatedTicketNo);
    await expect(page.locator("text=No tickets match your filter criteria.")).toBeVisible({ timeout: 10000 });
  });
});
