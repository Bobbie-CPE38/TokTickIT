import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { Login } from "../../src/components/Login.js";
import * as api from "../../src/api.js";

describe("Lab 3 Login UI Tests (UI-01, UI-02)", () => {
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.restoreAllMocks();
    mockOnSuccess.mockReset();
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  /**
   * UI-01: LoginForm submission, busy spinner, and error rendering (AC-01, AC-05, BR-20)
   */
  it("UI-01: renders form, shows busy spinner on submit, preserves input, and shows safe error on 401 (AC-01, AC-05, BR-20)", async () => {
    const loginSpy = vi.spyOn(api, "login").mockRejectedValue(
      new api.ApiError("Invalid email or password. Please try again.", 401)
    );

    render(<Login onSuccess={mockOnSuccess} />);

    // Verify form rendered
    expect(screen.getByRole("heading", { name: /sign in to your account/i })).toBeInTheDocument();
    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/^password/i);
    const submitBtn = screen.getByRole("button", { name: /sign in/i });

    // Enter invalid credentials
    fireEvent.change(emailInput, { target: { value: "janderson@toktickit.com" } });
    fireEvent.change(passwordInput, { target: { value: "WrongPassword123!" } });

    fireEvent.click(submitBtn);

    // Verify API called
    expect(loginSpy).toHaveBeenCalledWith("janderson@toktickit.com", "WrongPassword123!");

    // Verify error banner is displayed
    await waitFor(() => {
      expect(screen.getByText("Invalid email or password. Please try again.")).toBeInTheDocument();
    });

    // Verify form state preserved (BR-20)
    expect(emailInput).toHaveValue("janderson@toktickit.com");
  });

  it("UI-01: calls onSuccess when login succeeds (AC-01)", async () => {
    const mockAuthResponse = {
      token: "mock-jwt-token",
      user: {
        id: 1,
        email: "janderson@toktickit.com",
        name: "Jennifer Anderson",
        role: "REQUESTER" as const,
        isActive: true,
        mustChangePassword: false,
      },
    };

    vi.spyOn(api, "login").mockResolvedValue(mockAuthResponse);

    render(<Login onSuccess={mockOnSuccess} />);

    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/^password/i);
    const submitBtn = screen.getByRole("button", { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: "janderson@toktickit.com" } });
    fireEvent.change(passwordInput, { target: { value: "Password123!" } });

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalledWith(mockAuthResponse);
    });
  });

  /**
   * UI-02: Inactive account login error display (AC-04)
   */
  it("UI-02: displays safe message when account is inactive (AC-04)", async () => {
    vi.spyOn(api, "login").mockRejectedValue(
      new api.ApiError("Account is inactive. Please contact your system administrator.", 403)
    );

    render(<Login onSuccess={mockOnSuccess} />);

    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/^password/i);
    const submitBtn = screen.getByRole("button", { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: "alex.inactive@kmutt.ac.th" } });
    fireEvent.change(passwordInput, { target: { value: "Password123!" } });

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(
        screen.getByText("Account is inactive. Please contact your system administrator.")
      ).toBeInTheDocument();
    });

    // Form inputs preserved
    expect(emailInput).toHaveValue("alex.inactive@kmutt.ac.th");
  });
});
