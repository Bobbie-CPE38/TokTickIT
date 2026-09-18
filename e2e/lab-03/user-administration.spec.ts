import { test, expect } from "@playwright/test";
import { execSync } from "child_process";

test.describe("Administrator User Management (E2E-04)", () => {
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

    // Login as Administrator (John Smith)
    await page.locator("#email").fill("admin@toktickit.com");
    await page.locator("#password").fill("AdminPass123!");
    await page.locator('button[type="submit"]:has-text("Sign In")').click();
    await expect(page).toHaveURL(/\/admin\/users/);
  });

  test("AC-17, FR-22, FR-23: Search and role filtering in user directory", async ({ page }) => {
    // Verify admin header and title
    await expect(page.locator("h1")).toContainText("Users");
    await expect(page.locator("header")).toContainText("John Smith");
    await expect(page.locator("header")).toContainText("Administrator");

    // Search by name
    const searchInput = page.locator('input[placeholder*="Search users"]');
    await searchInput.fill("Jennifer");
    await expect(page.locator("body")).toContainText("jennifer.anderson@kmutt.ac.th");
    await expect(page.locator("body")).not.toContainText("staff.michael@toktickit.com");

    // Clear search
    await searchInput.fill("");

    // Filter by Role: IT_STAFF
    const roleSelect = page.locator("#roleFilterSelect");
    await roleSelect.selectOption("IT_STAFF");
    await expect(page.locator("body")).toContainText("staff.michael@toktickit.com");
    await expect(page.locator("body")).not.toContainText("jennifer.anderson@kmutt.ac.th");

    // Restore to All Roles
    await roleSelect.selectOption("ALL");
  });

  test("AC-17, AC-22, AC-23, BR-16, BR-19: Create user, edit user, reset password, and enforce safety guards", async ({
    page,
    isMobile,
  }) => {
    // -------------------------------------------------------------
    // Step 1: Create New User with Initial Password (AC-17, BR-19)
    // -------------------------------------------------------------
    await page.locator('button:has-text("+ Create User")').click();

    const drawer = page.locator('.modal.show');
    await expect(drawer).toBeVisible();
    await expect(drawer.locator("h2")).toContainText("Create New User");

    const uniqueEmail = `alex.thompson.${Date.now()}@toktickit.com`;
    await page.locator("#userFullName").fill("Alex Thompson");
    await page.locator("#userEmailAddress").fill(uniqueEmail);
    await page.locator("#userRole").selectOption("IT_STAFF");
    await page.locator("#userInitialPassword").fill("TempPass123!");

    // Must change password checkbox is checked by default
    await expect(page.locator("#mustChangeCheckbox")).toBeChecked();

    await page.locator('button[type="submit"]:has-text("Save User")').click();

    // Drawer closes automatically upon success
    await expect(drawer).not.toBeVisible();

    // Verify user appears in table or card
    const userElement = isMobile
      ? page.locator(`[data-testid="admin-user-card"]:has-text("${uniqueEmail}")`)
      : page.locator(`tr:has-text("${uniqueEmail}")`);
    await expect(userElement).toBeVisible();
    await expect(userElement).toContainText("Alex Thompson");
    await expect(userElement).toContainText("IT Staff");
    await expect(userElement).toContainText("Active");

    // -------------------------------------------------------------
    // Step 2: Edit User (AC-22, FR-25)
    // -------------------------------------------------------------
    await userElement.locator('button:has-text("Edit")').click();
    await expect(drawer).toBeVisible();
    await expect(drawer.locator("h2")).toContainText("Edit User");

    // Update Full Name
    await page.locator("#userFullName").fill("Alex Thompson Updated");

    // -------------------------------------------------------------
    // Step 3: Reset Initial Password in Edit Drawer (AC-23, FR-26)
    // -------------------------------------------------------------
    await page.locator('button:has-text("Reset Initial Password")').click();
    await page.locator("#resetPasswordField").fill("NewResetPass456!");
    await page.locator('button:has-text("Set Initial Password")').click();

    await expect(
      page.locator("text=Initial password reset successfully")
    ).toBeVisible();

    // Save user details edit
    await page.locator('button[type="submit"]:has-text("Save User")').click();
    await expect(drawer).not.toBeVisible();

    // Verify table shows updated name
    await expect(userElement).toContainText("Alex Thompson Updated");

    // -------------------------------------------------------------
    // Step 4: Administrator Safety Guards (AC-19, BR-16)
    // -------------------------------------------------------------
    const adminElement = isMobile
      ? page.locator('[data-testid="admin-user-card"]:has-text("John Smith")')
      : page.locator('tr:has-text("John Smith")');
    await adminElement.locator('button:has-text("Edit")').click();
    await expect(drawer).toBeVisible();
    await expect(drawer.locator("h2")).toContainText("Edit User");

    // Verify self-deactivation button is disabled
    const deactivateBtn = page.locator('button:has-text("Deactivate User")');
    await expect(deactivateBtn).toBeDisabled();

    // Verify safety warning text
    await expect(page.locator("text=You cannot deactivate your own account.")).toBeVisible();

    // Verify role dropdown is disabled
    await expect(page.locator("#userRole")).toBeDisabled();

    await page.locator('button:has-text("Cancel")').click();
    await expect(drawer).not.toBeVisible();
  });
});
