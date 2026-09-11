import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { ChangePassword } from "../../src/components/ChangePassword.js";
import * as api from "../../src/api.js";

describe("Lab 3 Change Password UI Tests (UI-03)", () => {
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
   * UI-03: ChangePassword form live complexity checklist (AC-02, AC-03)
   */
  it("UI-03: dynamically updates checklist items as password complexity requirements are met (AC-03)", async () => {
    render(<ChangePassword onSuccess={mockOnSuccess} />);

    expect(screen.getByRole("heading", { name: /change your password/i })).toBeInTheDocument();

    const newPassInput = screen.getByLabelText(/^new password/i);

    // Initial state: all checklist items unmet
    const lengthItem = screen.getByText(/be at least 8 characters/i);
    const caseItem = screen.getByText(/include upper and lower case letters/i);
    const numSpecialItem = screen.getByText(/include a number and a special character/i);

    expect(lengthItem).toHaveAttribute("data-satisfied", "false");
    expect(caseItem).toHaveAttribute("data-satisfied", "false");
    expect(numSpecialItem).toHaveAttribute("data-satisfied", "false");

    // Type 8 characters all lowercase
    fireEvent.change(newPassInput, { target: { value: "abcdefgh" } });
    expect(lengthItem).toHaveAttribute("data-satisfied", "true");
    expect(caseItem).toHaveAttribute("data-satisfied", "false");
    expect(numSpecialItem).toHaveAttribute("data-satisfied", "false");

    // Add uppercase letter
    fireEvent.change(newPassInput, { target: { value: "Abcdefgh" } });
    expect(lengthItem).toHaveAttribute("data-satisfied", "true");
    expect(caseItem).toHaveAttribute("data-satisfied", "true");
    expect(numSpecialItem).toHaveAttribute("data-satisfied", "false");

    // Add number and special character
    fireEvent.change(newPassInput, { target: { value: "Abcdefgh1!" } });
    expect(lengthItem).toHaveAttribute("data-satisfied", "true");
    expect(caseItem).toHaveAttribute("data-satisfied", "true");
    expect(numSpecialItem).toHaveAttribute("data-satisfied", "true");
  });

  it("UI-03: displays inline validation error when confirm password does not match", async () => {
    render(<ChangePassword onSuccess={mockOnSuccess} />);

    const currentPassInput = screen.getByLabelText(/current \(temporary\) password/i);
    const newPassInput = screen.getByLabelText(/^new password/i);
    const confirmPassInput = screen.getByLabelText(/confirm new password/i);
    const submitBtn = screen.getByRole("button", { name: /continue/i });

    fireEvent.change(currentPassInput, { target: { value: "InitialPass123!" } });
    fireEvent.change(newPassInput, { target: { value: "NewPass123!" } });
    fireEvent.change(confirmPassInput, { target: { value: "DifferentPass123!" } });

    fireEvent.click(submitBtn);

    expect(screen.getByText("Passwords do not match.")).toBeInTheDocument();
    expect(mockOnSuccess).not.toHaveBeenCalled();
  });

  it("UI-03: successfully submits compliant password and triggers onSuccess (AC-02)", async () => {
    const changeSpy = vi.spyOn(api, "changePassword").mockResolvedValue({
      message: "Password changed successfully",
    });

    render(<ChangePassword onSuccess={mockOnSuccess} />);

    const currentPassInput = screen.getByLabelText(/current \(temporary\) password/i);
    const newPassInput = screen.getByLabelText(/^new password/i);
    const confirmPassInput = screen.getByLabelText(/confirm new password/i);
    const submitBtn = screen.getByRole("button", { name: /continue/i });

    fireEvent.change(currentPassInput, { target: { value: "InitialPass123!" } });
    fireEvent.change(newPassInput, { target: { value: "NewPass123!" } });
    fireEvent.change(confirmPassInput, { target: { value: "NewPass123!" } });

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(changeSpy).toHaveBeenCalledWith("InitialPass123!", "NewPass123!", "NewPass123!");
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });
});
