import { test, expect, APIRequestContext } from "@playwright/test";

async function resetDavidInitialPassword(request: APIRequestContext) {
  try {
    const loginRes = await request.post("http://localhost:3000/api/auth/login", {
      data: { email: "admin@toktickit.com", password: "AdminPass123!" },
    });
    if (!loginRes.ok()) return;
    const { token } = await loginRes.json();
    const usersRes = await request.get(
      "http://localhost:3000/api/admin/users?search=staff.david@toktickit.com",
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    if (!usersRes.ok()) return;
    const users = await usersRes.json();
    const david = users.find((u: any) => u.email === "staff.david@toktickit.com");
    if (david) {
      await request.post(
        `http://localhost:3000/api/admin/users/${david.id}/reset-password`,
        {
          headers: { Authorization: `Bearer ${token}` },
          data: { initialPassword: "InitialPass123!" },
        }
      );
    }
  } catch (err) {
    console.error("Failed to reset David password via API", err);
  }
}

test.describe("Initial Password Login & Mandatory Change (E2E-02)", () => {
  test.beforeEach(async ({ page, request }) => {
    // Reset staff.david@toktickit.com to InitialPass123! with mustChangePassword = true
    await resetDavidInitialPassword(request);

    // Clear client storage
    await page.goto("/login");
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload();
  });

  test("AC-02 & BR-02: Initial password login forces redirection to /change-password and blocks bypass", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.locator("#email").fill("staff.david@toktickit.com");
    await page.locator("#password").fill("InitialPass123!");
    await page.locator('button[type="submit"]:has-text("Sign In")').click();

    // Must be redirected to /change-password
    await expect(page).toHaveURL(/\/change-password/);
    await expect(page.locator("h1")).toContainText(/change your password/i);
    await expect(page.locator("text=You must change your password to continue")).toBeVisible();

    // Attempting direct navigation to queue or tickets must be intercepted back to /change-password
    await page.goto("/queue");
    await expect(page).toHaveURL(/\/change-password/);

    await page.goto("/tickets");
    await expect(page).toHaveURL(/\/change-password/);
  });

  test("AC-03 & BR-07: Interactive password complexity checklist validation", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.locator("#email").fill("staff.david@toktickit.com");
    await page.locator("#password").fill("InitialPass123!");
    await page.locator('button[type="submit"]:has-text("Sign In")').click();
    await expect(page).toHaveURL(/\/change-password/);

    const currentPassInput = page.locator("#currentPassword");
    const newPassInput = page.locator("#newPassword");
    const confirmPassInput = page.locator("#confirmPassword");
    const submitBtn = page.locator('button[type="submit"]:has-text("Continue")');

    await currentPassInput.fill("InitialPass123!");

    // Locators for the three checklist items
    const lenItem = page.locator('li[data-satisfied]:has-text("Be at least 8 characters")');
    const caseItem = page.locator('li[data-satisfied]:has-text("Include upper and lower case letters")');
    const numSpecItem = page.locator('li[data-satisfied]:has-text("Include a number and a special character")');

    // Initially unsatisfied
    await expect(lenItem).toHaveAttribute("data-satisfied", "false");
    await expect(caseItem).toHaveAttribute("data-satisfied", "false");
    await expect(numSpecItem).toHaveAttribute("data-satisfied", "false");

    // Type short text
    await newPassInput.fill("short");
    await expect(lenItem).toHaveAttribute("data-satisfied", "false");

    // Satisfy length (>= 8) with all lowercase
    await newPassInput.fill("abcdefgh");
    await expect(lenItem).toHaveAttribute("data-satisfied", "true");
    await expect(caseItem).toHaveAttribute("data-satisfied", "false");
    await expect(numSpecItem).toHaveAttribute("data-satisfied", "false");

    // Satisfy upper and lower
    await newPassInput.fill("Abcdefgh");
    await expect(lenItem).toHaveAttribute("data-satisfied", "true");
    await expect(caseItem).toHaveAttribute("data-satisfied", "true");
    await expect(numSpecItem).toHaveAttribute("data-satisfied", "false");

    // Satisfy number and symbol
    await newPassInput.fill("Abcdefgh1!");
    await expect(lenItem).toHaveAttribute("data-satisfied", "true");
    await expect(caseItem).toHaveAttribute("data-satisfied", "true");
    await expect(numSpecItem).toHaveAttribute("data-satisfied", "true");

    // Mismatched confirmation error
    await confirmPassInput.fill("DifferentPass123!");
    await submitBtn.click();
    await expect(page.locator("text=Passwords do not match.")).toBeVisible();
    await expect(page).toHaveURL(/\/change-password/);
  });

  test("AC-03 & BR-07: Successful password change unblocks user and lands on role view (/queue)", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.locator("#email").fill("staff.david@toktickit.com");
    await page.locator("#password").fill("InitialPass123!");
    await page.locator('button[type="submit"]:has-text("Sign In")').click();
    await expect(page).toHaveURL(/\/change-password/);

    await page.locator("#currentPassword").fill("InitialPass123!");
    await page.locator("#newPassword").fill("DavidSecurePass2026!");
    await page.locator("#confirmPassword").fill("DavidSecurePass2026!");

    await page.locator('button[type="submit"]:has-text("Continue")').click();

    // On success, redirected to default view for IT_STAFF (/queue)
    await expect(page).toHaveURL(/\/queue/);
    await expect(page.locator("header")).toContainText("David Lee");
    await expect(page.locator("header")).toContainText("IT Staff");

    // Refreshing page stays on /queue without redirecting to /change-password
    await page.reload();
    await expect(page).toHaveURL(/\/queue/);
    await expect(page.locator("header")).toContainText("David Lee");
  });
});
