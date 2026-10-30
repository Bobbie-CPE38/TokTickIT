import { test, expect, Page } from "@playwright/test";
import {
  expectMobileTouchTargets,
  expectNoHorizontalOverflow,
  login,
  openStaffTicket,
  resetSeed,
  snap,
  ticketIdByNumber,
} from "./support";

const SERVER_ERROR = { status: 500, contentType: "application/json", body: JSON.stringify({ error: "Service temporarily unavailable." }) };

/** Fails the first matching request with HTTP 500, then delays the next one so the busy state is observable. */
async function failThenDelay(page: Page, url: string, method: string) {
  const state = { calls: 0 };
  await page.route(url, async (route) => {
    if (route.request().method() !== method) return route.continue();
    state.calls += 1;
    if (state.calls === 1) return route.fulfill(SERVER_ERROR);
    await new Promise((r) => setTimeout(r, 1500));
    await route.continue();
  });
  return state;
}

test.describe("Final hardening: form retention, double-submit guard, accessibility, and clean console (BR-17, BR-18)", () => {
  test.beforeEach(() => resetSeed());

  test("Staff public comment and internal note keep their text on failure and lock with a spinner while posting", async ({
    page,
    request,
  }) => {
    const ticketId = await ticketIdByNumber(request, "TKT-2026-000101");
    await login(page, "michael");
    await openStaffTicket(page, ticketId);

    // Public comment
    await page.getByRole("tab", { name: /^Public Comments/ }).click();
    const comment = page.locator("#staff-public-comment-input");
    const commentText = `Hardening comment ${Date.now()}`;
    const commentCalls = await failThenDelay(page, `**/api/tickets/${ticketId}/comments`, "POST");
    await comment.fill(commentText);
    const post = page.getByRole("button", { name: /Post Comment|Posting/ });
    await post.click();
    await expect(page.getByText("Service temporarily unavailable.")).toBeVisible();
    await expect(comment).toHaveValue(commentText);

    await post.click();
    await expect(post).toBeDisabled();
    await expect(post.locator(".spinner-border")).toBeVisible();
    await post.dispatchEvent("click");
    await expect(page.getByText(commentText)).toHaveCount(1);
    await expect(comment).toHaveValue("");
    expect(commentCalls.calls).toBe(2);

    // Internal note
    await page.getByRole("tab", { name: /Internal Notes/ }).click();
    const note = page.locator("#staff-internal-note-input");
    const noteText = `Hardening note ${Date.now()}`;
    const noteCalls = await failThenDelay(page, `**/api/tickets/${ticketId}/notes`, "POST");
    await note.fill(noteText);
    const save = page.getByRole("button", { name: /Save Internal Note|Saving/ });
    await save.click();
    await expect(page.getByText("Service temporarily unavailable.")).toBeVisible();
    await expect(note).toHaveValue(noteText);

    await save.click();
    await expect(save).toBeDisabled();
    await expect(save.locator(".spinner-border")).toBeVisible();
    await save.dispatchEvent("click");
    await expect(page.getByText(noteText)).toHaveCount(1);
    expect(noteCalls.calls).toBe(2);
  });

  test("Resolution modal keeps the summary after a server failure and locks Confirm while updating", async ({
    page,
    request,
  }, testInfo) => {
    const ticketId = await ticketIdByNumber(request, "TKT-2026-000106"); // IN_PROGRESS with 1 Action Taken
    await login(page, "michael");
    await openStaffTicket(page, ticketId);

    const calls = await failThenDelay(page, `**/api/staff/tickets/${ticketId}/status`, "PATCH");
    await page.locator("#staff-status-select").selectOption("RESOLVED");
    const dialog = page.getByRole("dialog", { name: "Resolve Ticket" });
    const summary = dialog.locator("#modal-resolution-summary");
    const text = "Re-imaged the workstation and restored the user profile.";
    await summary.fill(text);
    const confirm = dialog.getByRole("button", { name: /Confirm Resolution|Updating/ });
    await confirm.click();

    await expect(dialog.getByText("Service temporarily unavailable.")).toBeVisible();
    await expect(summary).toHaveValue(text);
    await snap(page, "ticket-workflow", "09-modal-safe-failure", testInfo.project.name);

    await confirm.click();
    await expect(confirm).toBeDisabled();
    await expect(confirm.locator(".spinner-border")).toBeVisible();
    await confirm.dispatchEvent("click");
    await expect(page.getByText("Ticket status transitioned to RESOLVED.")).toBeVisible();
    expect(calls.calls).toBe(2);
  });

  test("Requester comment and advisory-resolve dialog fail safely without losing input", async ({ page, request }) => {
    const ticketId = await ticketIdByNumber(request, "TKT-2026-000102");
    await login(page, "jennifer");
    await page.goto(`/tickets/${ticketId}`);

    await page.getByRole("button", { name: /^Public Comments/ }).click();
    const box = page.getByPlaceholder("Type your comment here...");
    const text = `Requester follow-up ${Date.now()}`;
    const calls = await failThenDelay(page, `**/api/tickets/${ticketId}/comments`, "POST");
    await box.fill(text);
    const post = page.getByRole("button", { name: /Post Comment|Posting/ });
    await post.click();
    await expect(page.getByText("Service temporarily unavailable.")).toBeVisible();
    await expect(box).toHaveValue(text);
    await post.click();
    await expect(post).toBeDisabled();
    await expect(page.getByText(text)).toHaveCount(1);
    expect(calls.calls).toBe(2);

    await page.route(`**/api/tickets/${ticketId}/resolve-indication`, (route) => route.fulfill(SERVER_ERROR));
    await page.getByRole("button", { name: "Mark as Resolved" }).click();
    const dialog = page.getByRole("dialog", { name: "Confirm Problem Resolution" });
    await expect(dialog).toHaveAttribute("aria-modal", "true");
    await dialog.getByRole("button", { name: "Confirm" }).click();
    await expect(dialog.getByText("Service temporarily unavailable.")).toBeVisible();
    await expect(dialog).toBeVisible();
    await expect(page.getByText("Problem appears resolved?")).toBeVisible();
  });

  test("Read-only ticket fields are shaded and distinct from editable controls; dialogs are labelled modals", async ({
    page,
    request,
  }, testInfo) => {
    const ticketId = await ticketIdByNumber(request, "TKT-2026-000101");

    // Requester: metadata is read-only (#F3F6F4)
    await login(page, "jennifer");
    await page.goto(`/tickets/${ticketId}`);
    const ticketNo = page.getByText("TKT-2026-000101", { exact: true }).first();
    await expect(ticketNo).toHaveCSS("background-color", "rgb(243, 246, 244)");
    await expectNoHorizontalOverflow(page);
    await expectMobileTouchTargets(page);
    await snap(page, "actions-taken", "09-requester-ticket-detail", testInfo.project.name);

    // Staff: editable controls are white, dialogs expose role, name, and aria-modal
    await login(page, "michael");
    await openStaffTicket(page, ticketId);
    for (const id of ["#staff-status-select", "#staff-owner-select", "#staff-priority-select"]) {
      await expect(page.locator(id)).toHaveCSS("background-color", "rgb(255, 255, 255)");
    }
    await page.locator("#staff-status-select").selectOption("CANCELLED");
    const dialog = page.getByRole("dialog", { name: "Cancel Ticket" });
    await expect(dialog).toHaveAttribute("aria-modal", "true");
    await dialog.getByRole("button", { name: "Close" }).click();
    await expect(dialog).toBeHidden();

    // Keyboard: tab focus lands on the status control with the Zen Green focus ring
    await page.locator("#staff-status-select").focus();
    await expect
      .poll(() => page.locator("#staff-status-select").evaluate((el) => getComputedStyle(el).boxShadow))
      .toContain("rgba(11, 122, 70, 0.2)");
    await expectNoHorizontalOverflow(page);
    await expectMobileTouchTargets(page);
  });

  test("Every major screen renders without console errors, placeholder text, or horizontal overflow", async ({
    page,
    request,
  }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(`${page.url()} :: ${msg.text()}`);
    });
    page.on("pageerror", (err) => errors.push(`${page.url()} :: ${err.message}`));

    const ownTicket = await ticketIdByNumber(request, "TKT-2026-000103");

    async function visit(path: string, ready: () => Promise<void>) {
      await page.goto(path);
      await ready();
      await expectNoHorizontalOverflow(page);
      await expect(page.locator("body")).not.toContainText(/[Ll]orem ipsum|\bTODO\b|\bFIXME\b|\bundefined\b|\bNaN\b|\[object Object\]/);
    }

    await login(page, "jennifer");
    await visit("/dashboard", () => expect(page.getByTestId("metric-value")).toHaveCount(4));
    await visit("/tickets", () => expect(page.getByLabel("Current Status")).toBeVisible());
    await visit("/tickets/new", () => expect(page.getByRole("heading").first()).toBeVisible());
    await visit(`/tickets/${ownTicket}`, () => expect(page.getByText("TKT-2026-000103").first()).toBeVisible());

    await login(page, "michael");
    await visit("/dashboard", () => expect(page.getByTestId("metric-value")).toHaveCount(5));
    await visit("/queue", () => expect(page.locator('input[aria-label="Search tickets"]')).toBeVisible());
    await visit(`/queue/${ownTicket}`, () => expect(page.locator("#staff-status-select")).toBeVisible());
    for (const tab of [/Internal Notes/, /^Attachments/, /^Actions Taken/, /^Public Comments/]) {
      await page.getByRole("tab", { name: tab }).click();
      await expectNoHorizontalOverflow(page);
    }

    await login(page, "admin");
    await visit("/dashboard", () => expect(page.getByTestId("metric-value")).toHaveCount(5));
    await visit("/admin/users", () => expect(page.getByRole("heading").first()).toBeVisible());

    expect(errors).toEqual([]);
  });
});
