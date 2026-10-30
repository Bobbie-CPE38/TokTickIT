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
} from "./support";

async function statusOptions(page: Page) {
  return page.locator("#staff-status-select option").evaluateAll((opts) => opts.map((o) => (o as HTMLOptionElement).value));
}

test.describe("Ticket Resolution Gate, advisory resolution, and concurrency (E2E-03)", () => {
  test.beforeEach(() => resetSeed());

  test("Part A — AC-08, AC-09: Resolution Gate blocks resolution with 0 actions and requires a summary once an action exists", async ({
    page,
    request,
  }, testInfo) => {
    const project = testInfo.project.name;
    const ticketId = await ticketIdByNumber(request, "TKT-2026-000101"); // IN_PROGRESS, 0 actions in seed
    await login(page, "michael");
    await openStaffTicket(page, ticketId);

    const status = page.locator("#staff-status-select");
    await status.selectOption("RESOLVED");
    const dialog = page.getByRole("dialog", { name: "Resolve Ticket" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("alert")).toContainText(
      "At least one Action Taken must be recorded before this ticket can be resolved."
    );
    const confirm = dialog.getByRole("button", { name: "Confirm Resolution" });
    await expect(confirm).toBeDisabled();
    await expectNoHorizontalOverflow(page);
    await snap(page, "ticket-workflow", "01-resolution-gate-blocked", project);
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(dialog).toBeHidden();
    await expect(status).toHaveValue("IN_PROGRESS");

    // Backend enforces the gate even when the UI is bypassed
    const michael = await apiToken(request, "michael");
    const bypass = await request.patch(`${API_URL}/api/staff/tickets/${ticketId}/status`, {
      headers: bearer(michael),
      data: { status: "RESOLVED", resolutionSummary: "Bypassing the screen." },
    });
    expect(bypass.status()).toBe(422);

    // Record one action, then the gate opens
    await openActionsTab(page);
    await page.getByRole("button", { name: "+ Record Action Taken" }).click();
    await page.locator("#actionDescription").fill("Replaced degraded battery with genuine OEM replacement unit.");
    await page.locator("#actionResult").fill("Battery charges normally and passed discharge diagnostics.");
    await page.locator('button[type="submit"]:has-text("Save Action")').click();
    await expect(page.getByText("Replaced degraded battery with genuine OEM replacement unit.")).toBeVisible();

    await status.selectOption("RESOLVED");
    await expect(dialog.getByRole("alert")).toHaveCount(0);
    const summary = dialog.locator("#modal-resolution-summary");
    await summary.fill("done");
    await expect(dialog.getByText("Minimum 5 characters required")).toBeVisible();
    await expect(confirm).toBeDisabled();
    await summary.fill("Replaced laptop battery pack and verified normal charge cycle.");
    await expect(confirm).toBeEnabled();
    await expectMobileTouchTargets(page, '[role="dialog"]');
    await snap(page, "ticket-workflow", "02-resolution-modal-summary", project);
    await confirm.click();

    await expect(page.getByText("Ticket status transitioned to RESOLVED.")).toBeVisible();
    await expect(status).toHaveValue("RESOLVED");
    await expect(page.getByText("Replaced laptop battery pack and verified normal charge cycle.")).toBeVisible();
  });

  test("Part B — AC-10, BR-10: Requester 'Problem appears resolved' is advisory and does not change the ticket status", async ({
    page,
    request,
  }, testInfo) => {
    const ticketId = await ticketIdByNumber(request, "TKT-2026-000101");

    await login(page, "jennifer");
    await page.goto(`/tickets/${ticketId}`);
    await expect(page.getByText("Problem appears resolved?")).toBeVisible();
    await page.getByRole("button", { name: "Mark as Resolved" }).click();
    const dialog = page.getByRole("dialog", { name: "Confirm Problem Resolution" });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Confirm" }).click();
    await expect(dialog).toBeHidden();
    await expect(
      page.getByText("You marked this problem as resolved. IT Staff will confirm and close the ticket.")
    ).toBeVisible();
    await snap(page, "ticket-workflow", "03-requester-advisory-resolved", testInfo.project.name);

    // Requester cannot drive the staff workflow endpoint
    const jennifer = await apiToken(request, "jennifer");
    const forbidden = await request.patch(`${API_URL}/api/staff/tickets/${ticketId}/status`, {
      headers: bearer(jennifer),
      data: { status: "RESOLVED", resolutionSummary: "Requester attempt" },
    });
    expect(forbidden.status()).toBe(403);

    // IT Staff sees the advisory banner while the status is unchanged
    await login(page, "michael");
    await openStaffTicket(page, ticketId);
    await expect(page.getByText("Requester indicated this issue appears resolved.")).toBeVisible();
    await expect(page.locator("#staff-status-select")).toHaveValue("IN_PROGRESS");
    await expectNoHorizontalOverflow(page);
    await snap(page, "ticket-workflow", "04-staff-advisory-banner", testInfo.project.name);
  });

  test("Part C — AC-11, BR-12: Stale update raises the Stale Record dialog and keeps unsubmitted drafts", async ({
    page,
    request,
  }, testInfo) => {
    const ticketId = await ticketIdByNumber(request, "TKT-2026-000105");
    await login(page, "michael");
    await openStaffTicket(page, ticketId);

    await page.getByRole("tab", { name: /^Public Comments/ }).click();
    const commentInput = page.locator("#staff-public-comment-input");
    const draftComment = "Michael's unsubmitted work draft that must survive stale collision";
    await commentInput.fill(draftComment);

    // Sarah changes the priority out-of-band
    const sarah = await apiToken(request, "sarah");
    const patchRes = await request.patch(`${API_URL}/api/staff/tickets/${ticketId}/priority`, {
      headers: bearer(sarah),
      data: { itPriority: "URGENT" },
    });
    expect(patchRes.ok()).toBeTruthy();

    const status = page.locator("#staff-status-select");
    await status.selectOption("IN_PROGRESS");

    const stale = page.getByRole("dialog", { name: "Stale Record Detected" });
    await expect(stale).toBeVisible();
    await expect(
      stale.getByText("This ticket has been updated by another team member since you loaded the page.")
    ).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await snap(page, "ticket-workflow", "05-concurrency-conflict-dialog", testInfo.project.name);

    await stale.getByRole("button", { name: "Keep My Drafts & Refresh" }).click();
    await expect(stale).toBeHidden();
    await expect(commentInput).toHaveValue(draftComment);
    await expect(page.locator("#staff-priority-select")).toHaveValue("URGENT");

    await status.selectOption("IN_PROGRESS");
    await expect(page.getByText("Ticket status transitioned to IN_PROGRESS.")).toBeVisible();
  });

  test("AC-14, BR-11: Status control offers only permitted transitions for every status and the backend rejects illegal jumps", async ({
    page,
    request,
  }) => {
    const fresh = await createTicketAs(request, "jennifer", `E2E transition matrix ${Date.now()}`);
    const matrix: Array<[string | number, string[]]> = [
      [fresh.id, ["NEW", "OPEN", "IN_PROGRESS", "CANCELLED"]],
      ["TKT-2026-000102", ["OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "CANCELLED"]],
      ["TKT-2026-000101", ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"]],
      ["TKT-2026-000401", ["WAITING_FOR_REQUESTER", "IN_PROGRESS", "RESOLVED", "CANCELLED"]],
      ["TKT-2026-000103", ["RESOLVED", "CLOSED", "REOPENED"]],
      ["TKT-2026-000402", ["REOPENED", "IN_PROGRESS", "RESOLVED", "CANCELLED"]],
      ["TKT-2026-000104", ["CLOSED", "REOPENED"]],
      ["TKT-2026-000403", ["CANCELLED"]],
    ];

    await login(page, "michael");
    for (const [ref, expected] of matrix) {
      const id = typeof ref === "number" ? ref : await ticketIdByNumber(request, ref);
      await openStaffTicket(page, id);
      expect(await statusOptions(page), `options for ${ref}`).toEqual(expected);
      if (expected[0] === "CANCELLED") {
        await expect(page.locator("#staff-status-select")).toBeDisabled();
      }
    }

    const michael = await apiToken(request, "michael");
    const illegal = await request.patch(`${API_URL}/api/staff/tickets/${fresh.id}/status`, {
      headers: bearer(michael),
      data: { status: "CLOSED" },
    });
    expect(illegal.status()).toBe(422);
  });

  test("Workflow modals: cancel is terminal and a closed ticket can be reopened with a rationale", async ({
    page,
    request,
  }, testInfo) => {
    const project = testInfo.project.name;
    const fresh = await createTicketAs(request, "jennifer", `E2E cancel flow ${Date.now()}`);
    await login(page, "michael");

    // Cancel (terminal)
    await openStaffTicket(page, fresh.id);
    const status = page.locator("#staff-status-select");
    await status.selectOption("CANCELLED");
    const cancelDialog = page.getByRole("dialog", { name: "Cancel Ticket" });
    await expect(cancelDialog).toContainText("Cancelled tickets cannot be reopened.");
    await snap(page, "ticket-workflow", "06-cancel-modal", project);
    await cancelDialog.getByRole("button", { name: "Confirm Cancellation" }).click();
    await expect(page.getByText("Ticket status transitioned to CANCELLED.")).toBeVisible();
    await expect(status).toBeDisabled();

    // Closed -> Reopened with rationale
    const closedId = await ticketIdByNumber(request, "TKT-2026-000104");
    await openStaffTicket(page, closedId);
    await status.selectOption("REOPENED");
    const reopen = page.getByRole("dialog", { name: "Reopen Ticket" });
    await reopen.locator("#modal-reopen-rationale").fill("User reported the problem recurring after a firmware update.");
    await snap(page, "ticket-workflow", "07-reopen-modal", project);
    await reopen.getByRole("button", { name: "Confirm Reopen" }).click();
    await expect(page.getByText("Ticket status transitioned to REOPENED.")).toBeVisible();
    await expect(status).toHaveValue("REOPENED");

    // Resolved -> Closed closure modal pre-fills the summary
    const resolvedId = await ticketIdByNumber(request, "TKT-2026-000103");
    await openStaffTicket(page, resolvedId);
    await status.selectOption("CLOSED");
    const close = page.getByRole("dialog", { name: "Close Ticket" });
    await expect(close.locator("#modal-close-summary")).not.toHaveValue("");
    await expectNoHorizontalOverflow(page);
    await snap(page, "ticket-workflow", "08-closure-modal", project);
    await close.getByRole("button", { name: "Confirm Close" }).click();
    await expect(page.getByText("Ticket status transitioned to CLOSED.")).toBeVisible();
  });

  test("Append-only history and role visibility: comments, notes, and actions only append; requesters never see internal notes", async ({
    page,
    request,
  }) => {
    const ticketId = await ticketIdByNumber(request, "TKT-2026-000101");
    const stamp = Date.now();
    const publicText = `Public update ${stamp}: replacement battery on order.`;
    const internalText = `Internal note ${stamp}: vendor RMA #A-2231.`;

    await login(page, "michael");
    await openStaffTicket(page, ticketId);

    const commentsTab = page.getByRole("tab", { name: /^Public Comments/ });
    const before = Number((await commentsTab.textContent())?.match(/\((\d+)\)/)?.[1]);
    await commentsTab.click();
    await page.locator("#staff-public-comment-input").fill(publicText);
    await page.getByRole("button", { name: "Post Comment" }).click();
    await expect(page.getByText(publicText)).toBeVisible();
    await expect(commentsTab).toHaveText(`Public Comments (${before + 1})`);

    await page.getByRole("tab", { name: /Internal Notes/ }).click();
    await page.locator("#staff-internal-note-input").fill(internalText);
    await page.getByRole("button", { name: "Save Internal Note" }).click();
    await expect(page.getByText(internalText)).toBeVisible();

    // No edit/delete controls on historical entries
    await expect(page.getByRole("button", { name: /^(Delete|Remove|Edit)$/ })).toHaveCount(0);
    await page.getByRole("tab", { name: /^Public Comments/ }).click();
    await expect(page.getByRole("button", { name: /^(Delete|Remove|Edit)$/ })).toHaveCount(0);
    await openActionsTab(page);
    await expect(page.getByRole("button", { name: /^(Delete|Remove)$/ })).toHaveCount(0);

    // Requester sees the public comment but never the internal note
    await login(page, "jennifer");
    await page.goto(`/tickets/${ticketId}`);
    await page.getByRole("button", { name: /^Public Comments/ }).click();
    await expect(page.getByText(publicText)).toBeVisible();
    await expect(page.getByText(internalText)).toHaveCount(0);
    const jennifer = await apiToken(request, "jennifer");
    const notes = await request.get(`${API_URL}/api/tickets/${ticketId}/notes`, { headers: bearer(jennifer) });
    expect(notes.status()).toBe(403);
  });
});
