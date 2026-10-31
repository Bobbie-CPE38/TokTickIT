import { expect, APIRequestContext, Page } from "@playwright/test";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

export const API_URL = process.env.E2E_API_URL ?? "http://localhost:3000";

export const USERS = {
  jennifer: { email: "jennifer.anderson@kmutt.ac.th", password: "Password123!", landing: /\/tickets/ },
  david: { email: "david.lee@kmutt.ac.th", password: "Password123!", landing: /\/tickets/ },
  michael: { email: "staff.michael@toktickit.com", password: "Password123!", landing: /\/queue/ },
  sarah: { email: "staff.sarah@toktickit.com", password: "Password123!", landing: /\/queue/ },
  admin: { email: "admin@toktickit.com", password: "AdminPass123!", landing: /\/admin\/users/ },
} as const;

export type SeedUser = keyof typeof USERS;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const SCREENSHOTS_DIR = path.resolve(__dirname, "../../artifacts/lab-04/screenshots");

export function resetSeed() {
  try {
    execSync("npm run prisma:seed", { cwd: "./server", stdio: "ignore" });
  } catch (err) {
    console.error("Prisma seed reset error:", err);
  }
}

export async function login(page: Page, user: SeedUser) {
  const { email, password, landing } = USERS[user];
  // Clear the previous session from a blank same-origin page. Clearing it while the app runs lets the
  // signed-in landing page fire requests without a token, which log 401 console errors at random.
  await page.route("**/__e2e-blank", (route) => route.fulfill({ contentType: "text/html", body: "<html></html>" }));
  await page.goto("/__e2e-blank");
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.unroute("**/__e2e-blank");
  // Enter /login directly: reloading a protected page would record it as the next intended destination
  await page.goto("/login");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.locator('button[type="submit"]:has-text("Sign In")').click();
  await expect(page).toHaveURL(landing);
}

export async function apiToken(request: APIRequestContext, user: SeedUser): Promise<string> {
  const { email, password } = USERS[user];
  const res = await request.post(`${API_URL}/api/auth/login`, { data: { email, password } });
  expect(res.ok()).toBeTruthy();
  return (await res.json()).token;
}

export function bearer(token: string) {
  return { Authorization: `Bearer ${token}` };
}

/** Resolves a seed ticket number to its database id through the staff queue API. */
export async function ticketIdByNumber(request: APIRequestContext, ticketNumber: string): Promise<number> {
  const token = await apiToken(request, "michael");
  const res = await request.get(`${API_URL}/api/staff/tickets?search=${ticketNumber}`, { headers: bearer(token) });
  expect(res.ok()).toBeTruthy();
  const { data } = await res.json();
  const match = data.find((t: { ticketNumber: string }) => t.ticketNumber === ticketNumber);
  expect(match, `seed ticket ${ticketNumber}`).toBeTruthy();
  return match.id;
}

/** Looks up a user id by email through the Administrator API. */
export async function userIdByEmail(request: APIRequestContext, email: string): Promise<number> {
  const token = await apiToken(request, "admin");
  const res = await request.get(`${API_URL}/api/admin/users?search=${encodeURIComponent(email)}`, {
    headers: bearer(token),
  });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  const users = body.data ?? body.users ?? body;
  const match = users.find((u: { email: string }) => u.email === email);
  expect(match, `user ${email}`).toBeTruthy();
  return match.id;
}

/** Creates a fresh NEW, unassigned ticket owned by the requester and returns its id and number. */
export async function createTicketAs(
  request: APIRequestContext,
  user: SeedUser,
  summary: string
): Promise<{ id: number; ticketNumber: string }> {
  const token = await apiToken(request, user);
  const [categories, systems] = await Promise.all([
    request.get(`${API_URL}/api/categories`).then((r) => r.json()),
    request.get(`${API_URL}/api/related-systems`).then((r) => r.json()),
  ]);
  const res = await request.post(`${API_URL}/api/tickets`, {
    headers: bearer(token),
    data: {
      categoryId: categories[0].id,
      relatedSystemId: systems[0].id,
      requestedPriority: "MEDIUM",
      summary,
      description: "Created by the Lab 4 Playwright suite to exercise the full ticket lifecycle.",
    },
  });
  expect(res.status()).toBe(201);
  const body = await res.json();
  const ticket = body.ticket ?? body;
  return { id: ticket.id, ticketNumber: ticket.ticketNumber };
}

export async function openStaffTicket(page: Page, ticketId: number) {
  await page.goto(`/queue/${ticketId}`);
  await expect(page.locator("#staff-status-select")).toBeVisible();
}

export async function openActionsTab(page: Page) {
  await page.getByRole("tab", { name: /^Actions Taken/ }).click();
}

export async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );
  expect(overflow, "horizontal page overflow (px)").toBeLessThanOrEqual(0);
}

/** On mobile viewports every visible button, link-button, and form field must be >= 44px tall (ui-spec 9.3). */
export async function expectMobileTouchTargets(page: Page, scope = "body") {
  const width = page.viewportSize()?.width ?? 1280;
  if (width >= 768) return;
  const undersized = await page.evaluate((scopeSelector) => {
    const root = document.querySelector(scopeSelector) ?? document.body;
    const controls = root.querySelectorAll<HTMLElement>(
      ".btn:not(.btn-close):not(.btn-link), .form-control, .form-select, a.dashboard-metric-card"
    );
    return Array.from(controls)
      .filter((el) => el.offsetParent !== null)
      .map((el) => ({ text: (el.textContent || el.id || el.className).trim().slice(0, 40), h: el.getBoundingClientRect().height }))
      .filter((c) => c.h > 0 && c.h < 43.5);
  }, scope);
  expect(undersized, "controls below the 44px mobile touch target").toEqual([]);
}

export async function snap(page: Page, folder: string, name: string, projectName: string) {
  const dir = path.join(SCREENSHOTS_DIR, folder);
  fs.mkdirSync(dir, { recursive: true });
  await page.screenshot({ path: path.join(dir, `${name}-${projectName}.png`), fullPage: true });
}

/**
 * Counts rows directly in PostgreSQL through Prisma, independent of the API under test,
 * so dashboard numbers can be checked against the authoritative database query.
 */
export function dbCount(model: "ticket" | "user" | "actionTaken", where: object): number {
  // The script travels in an env var so no shell quoting or "$" expansion can alter it.
  const script = `
    const { PrismaClient } = require("@prisma/client");
    const prisma = new PrismaClient();
    prisma.${model}
      .count({ where: JSON.parse(process.env.E2E_WHERE) })
      .then((count) => { process.stdout.write("E2E_COUNT=" + count + "\\n"); return prisma.$disconnect(); });
  `;
  const out = execSync('node -e "eval(process.env.E2E_SCRIPT)"', {
    cwd: "./server",
    env: { ...process.env, E2E_SCRIPT: script, E2E_WHERE: JSON.stringify(where) },
  }).toString();
  const match = out.match(/E2E_COUNT=(\d+)/);
  if (!match) throw new Error(`dbCount(${model}) produced no count: ${out}`);
  return Number(match[1]);
}
