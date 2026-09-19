import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import App from "../../src/App.js";
import * as api from "../../src/api.js";

const mockRequesterTickets: api.TicketListResponse = {
  data: [
    {
      id: 101,
      ticketNumber: "TKT-2026-000101",
      summary: "Laptop battery drains quickly",
      requestedPriority: "MEDIUM",
      itPriority: "MEDIUM",
      currentStatus: "NEW",
      ticketOwner: null,
      categoryId: 2,
      categoryName: "Hardware",
      relatedSystemId: 2,
      relatedSystemName: "Corporate Laptop",
      attachmentCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  pagination: { total: 1, page: 1, pageSize: 10, totalPages: 1 },
};

describe("Removal of Development Requester Selector and Legacy Requester Selection Flow", () => {
  beforeEach(() => {
    window.history.pushState({}, "", "/");
    localStorage.clear();
    vi.restoreAllMocks();
    vi.spyOn(api, "fetchCategories").mockResolvedValue([]);
    vi.spyOn(api, "fetchRelatedSystems").mockResolvedValue([]);
    vi.spyOn(api, "fetchTickets").mockResolvedValue(mockRequesterTickets);
    vi.spyOn(api, "fetchCurrentUser").mockResolvedValue({
      id: 1,
      name: "Jennifer Anderson",
      email: "jennifer.anderson@kmutt.ac.th",
      role: "REQUESTER",
      isActive: true,
      mustChangePassword: false,
    });
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  /**
   * 1. The Development Requester selector is no longer present in the UI
   */
  it("confirms Development Requester selection modal and text are removed when unauthenticated", async () => {
    render(<App />);

    // Unauthenticated user should see Login screen
    expect(await screen.findByText(/Sign in to your account/i)).toBeInTheDocument();

    // Legacy selector modal and its text must NOT exist anywhere in the DOM
    expect(screen.queryByText(/Select Development Requester/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Select a Development Requester to test/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Only active development requesters are shown/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: /Select Requester/i })).not.toBeInTheDocument();
  });

  /**
   * 2. The Change Requester action is no longer present in the header/profile dropdown
   */
  it("confirms Change / Switch Requester action is no longer present in header or profile menu", async () => {
    localStorage.setItem("toktickit_auth_token", "mock-jwt-token");
    localStorage.setItem(
      "toktickit_auth_user",
      JSON.stringify({
        id: 1,
        name: "Jennifer Anderson",
        email: "jennifer.anderson@kmutt.ac.th",
        role: "REQUESTER",
        isActive: true,
        mustChangePassword: false,
      })
    );
    vi.spyOn(api, "fetchCurrentUser").mockResolvedValue({
      id: 1,
      name: "Jennifer Anderson",
      email: "jennifer.anderson@kmutt.ac.th",
      role: "REQUESTER",
      isActive: true,
      mustChangePassword: false,
    });

    render(<App />);

    // Wait for authenticated header to render
    expect(await screen.findByRole("button", { name: /Profile/i })).toBeInTheDocument();

    // Click profile dropdown
    const profileBtn = screen.getByRole("button", { name: /Profile/i });
    fireEvent.click(profileBtn);

    // Assert that Switch / Change Requester action is NOT present
    expect(
      screen.queryByRole("button", { name: /Switch Requester|Change Requester/i })
    ).not.toBeInTheDocument();

    // Only user info and Sign Out must be present
    expect(screen.getAllByText(/Jennifer Anderson/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/jennifer.anderson@kmutt.ac.th/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Sign Out/i })).toBeInTheDocument();
  });

  /**
   * 3. The underlying requester-selection mechanism cannot still be used to authenticate or access tickets
   */
  it("prevents bypassing authentication by injecting legacy toktickit_requester_id into localStorage", async () => {
    // Inject legacy requester keys into localStorage without a valid Lab 3 token
    localStorage.setItem("toktickit_requester_id", "1");
    localStorage.setItem(
      "toktickit_requester_data",
      JSON.stringify({
        id: 1,
        name: "Jennifer Anderson",
        email: "jennifer.anderson@kmutt.ac.th",
        department: "Computer Engineering",
      })
    );

    const fetchTicketsSpy = vi.spyOn(api, "fetchTickets");

    render(<App />);

    // Must still redirect to Login screen
    expect(await screen.findByText(/Sign in to your account/i)).toBeInTheDocument();

    // Tickets must NOT be fetched or displayed
    expect(fetchTicketsSpy).not.toHaveBeenCalled();
    expect(screen.queryByText(/Laptop battery drains quickly/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/TKT-2026-000101/i)).not.toBeInTheDocument();
  });

  /**
   * 4. The normal Lab 3 authentication flow remains functional
   */
  it("authenticates normally via Lab 3 login and provides access to tickets", async () => {
    const loginSpy = vi.spyOn(api, "login").mockResolvedValue({
      token: "valid-jwt-token",
      user: {
        id: 1,
        name: "Jennifer Anderson",
        email: "jennifer.anderson@kmutt.ac.th",
        role: "REQUESTER",
        isActive: true,
        mustChangePassword: false,
      },
    });

    render(<App />);

    // Fill login form
    const emailInput = await screen.findByLabelText(/Email address/i);
    const passwordInput = screen.getByLabelText(/^Password/i);
    const submitBtn = screen.getByRole("button", { name: /Sign In/i });

    fireEvent.change(emailInput, { target: { value: "jennifer.anderson@kmutt.ac.th" } });
    fireEvent.change(passwordInput, { target: { value: "Password123!" } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(loginSpy).toHaveBeenCalledWith("jennifer.anderson@kmutt.ac.th", "Password123!");
    });

    // Successfully transitioned into My Tickets view
    expect(
      (await screen.findAllByText(/Laptop battery drains quickly/i)).length
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Jennifer Anderson/i).length).toBeGreaterThanOrEqual(1);
  });
});
