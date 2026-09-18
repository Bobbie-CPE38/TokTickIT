import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { UserManagementScreen } from "../../src/features/admin/UserManagementScreen.js";
import { RouterProvider } from "../../src/core/router/RouterContext.js";
import { AuthContext, AuthContextType } from "../../src/context/AuthContext.js";
import * as api from "../../src/api.js";

const mockAdminUser: api.AuthUser = {
  id: 1,
  name: "John Smith",
  email: "admin@toktickit.com",
  role: "ADMINISTRATOR",
  isActive: true,
  mustChangePassword: false,
};

const mockUsers: api.AdminUser[] = [
  {
    id: 1,
    name: "John Smith",
    email: "admin@toktickit.com",
    role: "ADMINISTRATOR",
    isActive: true,
    mustChangePassword: false,
    createdAt: "2026-05-01T00:00:00.000Z",
  },
  {
    id: 2,
    name: "Michael Brown",
    email: "mbrown@toktickit.com",
    role: "IT_STAFF",
    isActive: true,
    mustChangePassword: false,
    createdAt: "2026-05-01T00:00:00.000Z",
  },
  {
    id: 3,
    name: "Jennifer Anderson",
    email: "janderson@kmutt.ac.th",
    role: "REQUESTER",
    isActive: true,
    mustChangePassword: false,
    createdAt: "2026-05-01T00:00:00.000Z",
  },
];

function renderWithProviders(ui: React.ReactElement, user: api.AuthUser = mockAdminUser) {
  const authValue: AuthContextType = {
    user,
    token: "valid-admin-jwt-token",
    loading: false,
    isAuthenticated: true,
    mustChangePassword: false,
    login: vi.fn(),
    logout: vi.fn(),
    changePassword: vi.fn(),
    refreshUser: vi.fn(),
  };

  return render(
    <AuthContext.Provider value={authValue}>
      <RouterProvider>
        {ui}
      </RouterProvider>
    </AuthContext.Provider>
  );
}

describe("Lab 3 Admin User Management UI Tests (UI-10, UI-11, UI-12, UI-13)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(api, "fetchAdminUsers").mockResolvedValue(mockUsers);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * UI-10: User list search and role filter
   * AC-17, FR-23
   */
  it("UI-10: renders user list, and allows searching and filtering by role (AC-17, FR-23)", async () => {
    renderWithProviders(<UserManagementScreen />);

    // Verify column headers
    expect(await screen.findByRole("columnheader", { name: /name/i })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /email/i })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /role/i })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /status/i })).toBeInTheDocument();

    // Verify all 3 mock users appear in table
    expect(screen.getByText("John Smith")).toBeInTheDocument();
    expect(screen.getByText("Michael Brown")).toBeInTheDocument();
    expect(screen.getByText("Jennifer Anderson")).toBeInTheDocument();

    // Search for "Jennifer"
    const searchInput = screen.getByPlaceholderText(/search users by name or email/i);
    fireEvent.change(searchInput, { target: { value: "Jennifer" } });

    await waitFor(() => {
      expect(screen.getByText("Jennifer Anderson")).toBeInTheDocument();
      expect(screen.queryByText("Michael Brown")).not.toBeInTheDocument();
    });

    // Reset search
    fireEvent.change(searchInput, { target: { value: "" } });

    // Filter by role: "IT_STAFF"
    const roleSelect = screen.getByLabelText(/filter by role/i);
    fireEvent.change(roleSelect, { target: { value: "IT_STAFF" } });

    await waitFor(() => {
      expect(screen.getByText("Michael Brown")).toBeInTheDocument();
      expect(screen.queryByText("Jennifer Anderson")).not.toBeInTheDocument();
      expect(screen.queryByText("John Smith")).not.toBeInTheDocument();
    });
  });

  /**
   * UI-11: Deactivate button disabled with tooltip when editing own admin account
   * AC-19, BR-16
   */
  it("UI-11: disables deactivate action with tooltip when editing own administrator account (AC-19, BR-16)", async () => {
    renderWithProviders(<UserManagementScreen />);

    // Wait for users to load
    expect(await screen.findByText("John Smith")).toBeInTheDocument();

    // Click "Edit" on John Smith (the logged-in admin: id 1)
    const editButtons = screen.getAllByRole("button", { name: /edit/i });
    fireEvent.click(editButtons[0]);

    // Drawer opens in Edit User mode
    expect(await screen.findByRole("heading", { name: /edit user/i })).toBeInTheDocument();

    // The Deactivate User button must be disabled with tooltip
    const deactivateBtn = screen.getByRole("button", { name: /deactivate user/i });
    expect(deactivateBtn).toBeDisabled();
    expect(deactivateBtn.getAttribute("title") || deactivateBtn.closest("[title]")?.getAttribute("title")).toMatch(
      /cannot deactivate your own account/i
    );
  });

  /**
   * UI-12: Form state preserved on API failure
   * BR-20
   */
  it("UI-12: preserves entered form state when user creation or editing API call fails (BR-20)", async () => {
    vi.spyOn(api, "createAdminUser").mockRejectedValueOnce(
      new Error("An account with this email address already exists")
    );

    renderWithProviders(<UserManagementScreen />);

    // Click "+ Create User"
    const createBtn = await screen.findByRole("button", { name: /\+ create user|create user/i });
    fireEvent.click(createBtn);

    expect(await screen.findByRole("heading", { name: /create new user/i })).toBeInTheDocument();

    // Fill form
    const nameInput = screen.getByLabelText(/full name/i);
    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/initial password/i);

    fireEvent.change(nameInput, { target: { value: "New Candidate" } });
    fireEvent.change(emailInput, { target: { value: "existing@toktickit.com" } });
    fireEvent.change(passwordInput, { target: { value: "TempPassword123!" } });

    // Submit form
    const submitBtn = screen.getByRole("button", { name: /save user/i });
    fireEvent.click(submitBtn);

    // Wait for error banner
    await waitFor(() => {
      expect(screen.getByText(/an account with this email address already exists/i)).toBeInTheDocument();
    });

    // Form inputs must remain preserved (BR-20)
    expect((nameInput as HTMLInputElement).value).toBe("New Candidate");
    expect((emailInput as HTMLInputElement).value).toBe("existing@toktickit.com");
    expect((passwordInput as HTMLInputElement).value).toBe("TempPassword123!");
  });

  /**
   * UI-13: Editing user updates table row
   * AC-22, FR-25
   */
  it("UI-13: successfully updates user details in table row after editing in drawer (AC-22, FR-25)", async () => {
    const updatedUser: api.AdminUser = {
      ...mockUsers[1],
      name: "Michael Brown Updated",
    };
    vi.spyOn(api, "updateAdminUser").mockResolvedValue(updatedUser);

    renderWithProviders(<UserManagementScreen />);

    expect(await screen.findByText("Michael Brown")).toBeInTheDocument();

    // Click "Edit" for Michael Brown (second user, index 1)
    const editButtons = screen.getAllByRole("button", { name: /edit/i });
    fireEvent.click(editButtons[1]);

    expect(await screen.findByRole("heading", { name: /edit user/i })).toBeInTheDocument();

    const nameInput = screen.getByLabelText(/full name/i);
    fireEvent.change(nameInput, { target: { value: "Michael Brown Updated" } });

    const submitBtn = screen.getByRole("button", { name: /save user/i });
    fireEvent.click(submitBtn);

    // Wait for drawer to close and table to show updated name
    await waitFor(() => {
      expect(screen.getByText("Michael Brown Updated")).toBeInTheDocument();
    });
  });
});
