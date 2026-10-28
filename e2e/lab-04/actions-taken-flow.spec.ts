import { test, expect, Page } from "@playwright/test";
import {
  API_URL,
  apiToken,
  bearer,
  createTicketAs,
  expectMobileTouchTargets,
  expectNoHorizontalOverflow,
  login,
  openActionsTab,
  openStaffTicket,
  resetSeed,
  snap,
  ticketIdByNumber,
  userIdByEmail,
} from "./support";

const SAVE_ACTION = 'button[type="submit"]:has-text("Save Action")';

async function statusOptions(page: Page) {
  return page.locator("#staff-status-select option").evaluateAll((opts) => opts.map((o) => (o as HTMLOptionElement).value));
}

async function openFromQueue(page: Page, ticketNumber: string, isMobile: boolean) {
  await page.locator('input[aria-label="Search tickets"]').fill(ticketNumber);
  const row = isMobile
    ? page.locator('[data-testid="staff-ticket-card"]', { hasText: ticketNumber })
    : page.locator("tr", { hasText: ticketNumber });
  await expect(row).toHaveCount(1);
  await row.click();
  await expect(page).toHaveURL(/\/queue\/\d+/);
  await expect(page.locator("h5, .h5").filter({ hasText: ticketNumber })).toBeVisible();
}

test.describe("Actions Taken workflow (E2E-01, E2E-02, AC-01 to AC-07)", () => {
  test.beforeEach(() => resetSeed());

  test("E2E-01: IT Staff assigns an unassigned ticket, records an Action Taken, resolves through the gate, and closes it", async ({
    page,
    request,
    isMobile,
  }, testInfo) => {
    const project = testInfo.project.name;
    const ticket = await createTicketAs(request, "jennifer", `E2E-01 docking station flicker ${Date.now()}`);

    await login(page, "michael");
    await openFromQueue(page, ticket.ticketNumber, isMobile);

    // Assign: the fresh ticket starts unassigned and NEW
    const owner = page.locator("#staff-owner-select");
    await expect(owner).toHaveValue("");
    await owner.selectOption({ label: "Michael Brown (IT Staff)" });
    await expect(page.getByText("Ticket ownership updated.")).toBeVisible();

    // Permitted transitions only (ui-spec 8.1)
    const status = page.locator("#staff-status-select");
    expect(await statusOptions(page)).toEqual(["NEW", "OPEN", "IN_PROGRESS", "CANCELLED"]);
    await status.selectOption("OPEN");
    await expect(page.getByText("Ticket status transitioned to OPEN.")).toBeVisible();
    await expect(status).toHaveValue("OPEN");
    await status.selectOption("IN_PROGRESS");
    await expect(page.getByText("Ticket status transitioned to IN_PROGRESS.")).toBeVisible();

    // Actions Taken: empty list mode -> create mode
    await openActionsTab(page);
    await expect(page.getByText("No actions have been recorded for this ticket yet.")).toBeVisible();
    await page.getByRole("button", { name: "+ Record Action Taken" }).click();
    await expect(page.getByRole("heading", { name: "Record Action Taken" })).toBeVisible();
    await expect(page.locator("#actionDateTime")).not.toHaveValue("");
    await page.locator("#actionDescription").fill("Swapped the USB-C docking station for a known-good unit.");
    await page.locator("#actionResult").fill("External monitor no longer flickers after 30 minutes of use.");
    await page.locator("#attachmentNotes").fill("dock_swap_photo.jpg in Attachments");
    await expectNoHorizontalOverflow(page);
    await expectMobileTouchTargets(page);
    await snap(page, "actions-taken", "02-create-mode", project);
    await page.locator(SAVE_ACTION).click();

    // List mode shows the new card with the authenticated performer (BR-03)
    const card = page.locator(".actions-taken-list .card").filter({ hasText: "Swapped the USB-C docking station" });
    await expect(card).toBeVisible();
    await expect(card).toContainText("Performed by: Michael Brown");
    await expect(card).toContainText("Action Complete");
    await expect(card).toContainText("dock_swap_photo.jpg in Attachments");
    await expect(page.getByRole("tab", { name: "Actions Taken (1)" })).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await snap(page, "actions-taken", "01-list-mode", project);

    // Resolution Gate satisfied: summary required
    await status.selectOption("RESOLVED");
    const dialog = page.getByRole("dialog", { name: "Resolve Ticket" });
    await expect(dialog).toBeVisible();
    await dialog.locator("#modal-resolution-summary").fill("Replaced faulty docking station; display is stable.");
    await dialog.getByRole("button", { name: "Confirm Resolution" }).click();
    await expect(page.getByText("Ticket status transitioned to RESOLVED.")).toBeVisible();
    await expect(status).toHaveValue("RESOLVED");
    expect(await statusOptions(page)).toEqual(["RESOLVED", "CLOSED", "REOPENED"]);

    // Close: modal pre-fills the existing resolution summary
    await status.selectOption("CLOSED");
    const closeDialog = page.getByRole("dialog", { name: "Close Ticket" });
    await expect(closeDialog.locator("#modal-close-summary")).toHaveValue(
      "Replaced faulty docking station; display is stable."
    );
    await closeDialog.getByRole("button", { name: "Confirm Close" }).click();
    await expect(page.getByText("Ticket status transitioned to CLOSED.")).toBeVisible();
    expect(await statusOptions(page)).toEqual(["CLOSED", "REOPENED"]);

    // Authoritative state persisted for the Requester
    const token = await apiToken(request, "jennifer");
    const detail = await (await request.get(`${API_URL}/api/tickets/${ticket.id}`, { headers: bearer(token) })).json();
    const t = detail.ticket ?? detail;
    expect(t.currentStatus).toBe("CLOSED");
    expect(t.resolutionSummary).toBe("Replaced faulty docking station; display is stable.");
  });

  test("E2E-02: Follow-up required blocks submission until a valid follow-up note is entered (AC-03, BR-05)", async ({
    page,
    request,
  }, testInfo) => {
    const ticketId = await ticketIdByNumber(request, "TKT-2026-000101");
    const posts: string[] = [];
    page.on("request", (r) => {
      if (r.method() === "POST" && r.url().endsWith(`/api/tickets/${ticketId}/actions-taken`)) posts.push(r.url());
    });

    await login(page, "michael");
    await openStaffTicket(page, ticketId);
    await openActionsTab(page);
    await page.getByRole("button", { name: "+ Record Action Taken" }).click();

    // Field validation (BR-06): description and result need >= 3 characters
    await page.locator("#actionDescription").fill("ab");
    await page.locator("#actionResult").fill("Battery cell #2 measured at 38% capacity.");
    await page.locator(SAVE_ACTION).click();
    await expect(page.getByRole("alert")).toHaveText("Action description must be at least 3 characters.");

    await page.locator("#actionDescription").fill("Ran manufacturer battery diagnostics.");
    await page.getByLabel("Follow-up required?").check();
    const note = page.locator("#followUpNote");
    await expect(note).toBeVisible();
    await expect(page.getByText("0 / 1000 characters")).toBeVisible();

    // Empty note is rejected inline, directly below the field
    await page.locator(SAVE_ACTION).click();
    const noteError = page.locator("#followUpNote-error");
    await expect(noteError).toHaveText(
      "Follow-up note is required when follow-up is flagged (minimum 3 characters)."
    );
    await expect(note).toHaveAttribute("aria-invalid", "true");
    await expect(note).toHaveAttribute("aria-describedby", "followUpNote-error");
    await expectNoHorizontalOverflow(page);
    await snap(page, "actions-taken", "03-follow-up-validation", testInfo.project.name);

    // Too-short note is still rejected
    await note.fill("ok");
    await page.locator(SAVE_ACTION).click();
    await expect(noteError).toBeVisible();
    expect(posts).toHaveLength(0);

    // Valid note submits once
    await note.fill("Install the replacement battery pack when it arrives (ETA 2 days).");
    await expect(noteError).toBeHidden();
    await page.locator(SAVE_ACTION).click();

    const card = page.locator(".actions-taken-list .card").filter({ hasText: "Ran manufacturer battery diagnostics." });
    await expect(card).toContainText("Follow-Up Required");
    await expect(card).toContainText("Follow-Up Note:");
    await expect(card).toContainText("Install the replacement battery pack when it arrives (ETA 2 days).");
    expect(posts).toHaveLength(1);
    await snap(page, "actions-taken", "04-follow-up-required-card", testInfo.project.name);
  });

  test("AC-05, BR-02, BR-08: Different IT Staff actions on one ticket stay chronological, and edit mode updates or cancels cleanly", async ({
    page,
    request,
  }, testInfo) => {
    const ticketId = await ticketIdByNumber(request, "TKT-2026-000101");
    const sarah = await apiToken(request, "sarah");
    const michael = await apiToken(request, "michael");

    // Recorded out of order: Michael's later action first, then Sarah's earlier action
    const later = await request.post(`${API_URL}/api/tickets/${ticketId}/actions-taken`, {
      headers: bearer(michael),
      data: {
        actionDateTime: "2026-08-27T10:00:00.000Z",
        description: "Verified AC adapter output with a multimeter.",
        result: "Charger output stable at 65W.",
        isFollowUpRequired: false,
      },
    });
    expect(later.status()).toBe(201);
    const earlier = await request.post(`${API_URL}/api/tickets/${ticketId}/actions-taken`, {
      headers: bearer(sarah),
      data: {
        actionDateTime: "2026-08-26T09:00:00.000Z",
        description: "Ran hardware diagnostic on laptop battery cells.",
        result: "Cell #2 degraded below 40% capacity.",
        isFollowUpRequired: false,
      },
    });
    expect(earlier.status()).toBe(201);

    await login(page, "michael");
    await openStaffTicket(page, ticketId);
    await openActionsTab(page);

    const cards = page.locator(".actions-taken-list > .card");
    await expect(cards).toHaveCount(2);
    await expect(cards.nth(0)).toContainText("Ran hardware diagnostic on laptop battery cells.");
    await expect(cards.nth(0)).toContainText("Performed by: Sarah Johnson");
    await expect(cards.nth(1)).toContainText("Verified AC adapter output with a multimeter.");
    await expect(cards.nth(1)).toContainText("Performed by: Michael Brown");
    // Ticket Owner (Michael) differs from Sarah, who performed the first action (BR-02)
    await expect(page.locator("#staff-owner-select")).toHaveValue(/\d+/);
    await snap(page, "actions-taken", "05-multiple-performers", testInfo.project.name);

    // Edit -> Cancel restores the card without a PATCH
    const patches: string[] = [];
    page.on("request", (r) => {
      if (r.method() === "PATCH" && r.url().includes("/api/actions-taken/")) patches.push(r.url());
    });
    await cards.nth(0).getByRole("button", { name: "Edit" }).click();
    await expect(page.getByRole("heading", { name: "Edit Action Taken" })).toBeVisible();
    await expect(page.locator("#actionDescription")).toHaveValue("Ran hardware diagnostic on laptop battery cells.");
    await page.locator("#actionResult").fill("Discarded edit");
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByText("Discarded edit")).toHaveCount(0);
    await expect(cards.nth(0)).toContainText("Cell #2 degraded below 40% capacity.");
    expect(patches).toHaveLength(0);

    // Edit -> Save Changes persists, adds a follow-up, and keeps the original performer
    await cards.nth(0).getByRole("button", { name: "Edit" }).click();
    await page.locator("#actionResult").fill("Cell #2 degraded to 38%; replacement battery ordered.");
    await page.getByLabel("Follow-up required?").check();
    await page.locator("#followUpNote").fill("Install replacement battery on delivery.");
    await expectNoHorizontalOverflow(page);
    await expectMobileTouchTargets(page);
    await snap(page, "actions-taken", "06-edit-mode", testInfo.project.name);
    await page.getByRole("button", { name: "Save Changes" }).click();
    await expect(cards.nth(0)).toContainText("Cell #2 degraded to 38%; replacement battery ordered.");
    await expect(cards.nth(0)).toContainText("Follow-Up Required");
    await expect(cards.nth(0)).toContainText("Performed by: Sarah Johnson");
    expect(patches).toHaveLength(1);

    // Ordering and edits survive a reload
    await page.reload();
    await openActionsTab(page);
    await expect(cards.nth(0)).toContainText("Cell #2 degraded to 38%; replacement battery ordered.");
    await expect(cards.nth(1)).toContainText("Verified AC adapter output with a multimeter.");
  });

  test("AC-06, AC-07, BR-07, BR-13: Requester sees a read-only Actions Taken log and cannot create, edit, or read others' actions", async ({
    page,
    request,
  }, testInfo) => {
    const ownTicketId = await ticketIdByNumber(request, "TKT-2026-000103");
    const otherTicketId = await ticketIdByNumber(request, "TKT-2026-000201");

    await login(page, "jennifer");
    await page.goto(`/tickets/${ownTicketId}`);
    await page.getByRole("button", { name: /^Actions Taken \(\d+\)/ }).click();

    const cards = page.locator(".actions-taken-list > .card");
    expect(await cards.count()).toBeGreaterThan(1);
    await expect(page.locator(".actions-taken-list")).toContainText("Sarah Johnson");
    await expect(page.locator(".actions-taken-list")).toContainText("Michael Brown");
    await expect(page.getByRole("button", { name: "+ Record Action Taken" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Edit", exact: true })).toHaveCount(0);
    await expect(page.getByText(/Internal Notes/)).toHaveCount(0);
    await expectNoHorizontalOverflow(page);
    await snap(page, "actions-taken", "07-requester-read-only", testInfo.project.name);

    // Backend authorization, independent of hidden controls
    const token = await apiToken(request, "jennifer");
    const list = await request.get(`${API_URL}/api/tickets/${ownTicketId}/actions-taken`, { headers: bearer(token) });
    expect(list.status()).toBe(200);
    const [firstAction] = await list.json();

    const create = await request.post(`${API_URL}/api/tickets/${ownTicketId}/actions-taken`, {
      headers: bearer(token),
      data: { description: "Requester attempt", result: "Should be rejected", isFollowUpRequired: false },
    });
    expect(create.status()).toBe(403);

    const edit = await request.patch(`${API_URL}/api/actions-taken/${firstAction.id}`, {
      headers: bearer(token),
      data: { result: "Tampered by requester" },
    });
    expect(edit.status()).toBe(403);

    const crossTenant = await request.get(`${API_URL}/api/tickets/${otherTicketId}/actions-taken`, {
      headers: bearer(token),
    });
    expect(crossTenant.status()).toBe(404);
  });

  test("AC-04, BR-04: Inactive IT Staff cannot be assigned as owner and cannot record actions", async ({ page, request }) => {
    const ticketId = await ticketIdByNumber(request, "TKT-2026-000102");
    const inactiveId = await userIdByEmail(request, "kpatel@toktickit.com");

    await login(page, "michael");
    await openStaffTicket(page, ticketId);
    const ownerOptions = await page
      .locator("#staff-owner-select option")
      .evaluateAll((opts) => opts.map((o) => o.textContent ?? ""));
    expect(ownerOptions).toContain("Michael Brown (IT Staff)");
    expect(ownerOptions.some((o) => o.includes("Kevin Patel"))).toBe(false);

    // Bypassing the UI: backend rejects the inactive assignee
    const michael = await apiToken(request, "michael");
    const assign = await request.patch(`${API_URL}/api/staff/tickets/${ticketId}/assignment`, {
      headers: bearer(michael),
      data: { ticketOwnerId: inactiveId },
    });
    expect(assign.status()).toBe(422);
    expect(JSON.stringify(await assign.json())).toContain("must be an active IT Staff or Administrator");

    // Inactive performer cannot authenticate to record work
    const inactiveLogin = await request.post(`${API_URL}/api/auth/login`, {
      data: { email: "kpatel@toktickit.com", password: "Password123!" },
    });
    expect(inactiveLogin.status()).toBe(403);
  });

  test("BR-17, BR-18: Action form keeps input after a server failure and locks Save with a spinner to prevent duplicates", async ({
    page,
    request,
  }, testInfo) => {
    const ticketId = await ticketIdByNumber(request, "TKT-2026-000101");
    const endpoint = `**/api/tickets/${ticketId}/actions-taken`;

    await login(page, "michael");
    await openStaffTicket(page, ticketId);
    await openActionsTab(page);
    await page.getByRole("button", { name: "+ Record Action Taken" }).click();
    await page.locator("#actionDescription").fill("Reseated the RAM modules and cleared CMOS.");
    await page.locator("#actionResult").fill("Laptop boots normally; memory test passed.");
    await page.getByLabel("Follow-up required?").check();
    await page.locator("#followUpNote").fill("Confirm with requester after one week of use.");
    await page.locator("#attachmentNotes").fill("memtest_report.txt");

    // Safe failure: 500 shows an alert and keeps every entered value
    await page.route(endpoint, (route) =>
      route.request().method() === "POST"
        ? route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: "Database temporarily unavailable." }) })
        : route.continue()
    );
    await page.locator(SAVE_ACTION).click();
    await expect(page.getByRole("alert")).toHaveText("Database temporarily unavailable.");
    await expect(page.locator("#actionDescription")).toHaveValue("Reseated the RAM modules and cleared CMOS.");
    await expect(page.locator("#actionResult")).toHaveValue("Laptop boots normally; memory test passed.");
    await expect(page.getByLabel("Follow-up required?")).toBeChecked();
    await expect(page.locator("#followUpNote")).toHaveValue("Confirm with requester after one week of use.");
    await expect(page.locator("#attachmentNotes")).toHaveValue("memtest_report.txt");
    await snap(page, "actions-taken", "08-safe-failure-retained-input", testInfo.project.name);
    await page.unroute(endpoint);

    // Debounce: a slow request disables Save with a spinner; repeated clicks send one POST
    let posts = 0;
    await page.route(endpoint, async (route) => {
      if (route.request().method() !== "POST") return route.continue();
      posts += 1;
      await new Promise((r) => setTimeout(r, 1500));
      await route.continue();
    });
    const save = page.locator("form button[type='submit']");
    await save.click();
    await expect(save).toBeDisabled();
    await expect(save).toHaveText(/Saving Action\.\.\./);
    await expect(save.locator(".spinner-border")).toBeVisible();
    await save.click({ force: true });
    await save.dispatchEvent("click");

    const card = page.locator(".actions-taken-list .card").filter({ hasText: "Reseated the RAM modules" });
    await expect(card).toHaveCount(1);
    expect(posts).toBe(1);
  });
});
