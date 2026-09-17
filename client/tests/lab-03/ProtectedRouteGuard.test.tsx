import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import React from "react";
import App from "../../src/App.js";
import * as api from "../../src/api.js";

const mockRequesterUser: api.AuthUser = {
  id: 1,
  name: "Jennifer Anderson",
  email: "jennifer.anderson@kmutt.ac.th",
  role: "REQUESTER",
  isActive: true,
  mustChangePassword: false,
};

const mockMustChangeUser: api.AuthUser = {
  id: 2,
  name: "New Requester",
  email: "new.requester@toktickit.com",
  role: "REQUESTER",
  isActive: true,
  mustChangePassword: true,
};

const mockStaffUser: api.AuthUser = {
  id: 3,
  name: "Michael Brown",
  email: "staff.michael@toktickit.com",
  role: "IT_STAFF",
  isActive: true,
  mustChangePassword: false,
};

const mockTicketList: api.TicketListResponse = {
  data: [
    {
      id: 101,
      ticketNumber: "TKT-2026-000101",
      summary: "Laptop battery issue",
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

const mockTicketDetail: api.TicketDetail = {
  id: 101,
  ticketNumber: "TKT-2026-000101",
  summary: "Laptop battery issue",
  description: "Drains in 30 minutes",
  requestedPriority: "MEDIUM",
  itPriority: "MEDIUM",
  currentStatus: "NEW",
  ticketOwner: null,
  resolutionSummary: null,
  requesterId: 1,
  requester: {
    id: 1,
    name: "Jennifer Anderson",
    email: "jennifer.anderson@kmutt.ac.th",
    department: "Computer Engineering",
  },
  categoryId: 2,
  category: { id: 2, name: "Hardware" },
  relatedSystemId: 2,
  relatedSystem: { id: 2, name: "Corporate Laptop" },
  attachments: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe("Protected Route Guard and Intended Destination UI Tests", () => {
  beforeEach(() => {
    window.history.pushState({}, "", "/");
    localStorage.clear();
    vi.restoreAllMocks();

    vi.spyOn(api, "fetchCategories").mockResolvedValue([]);
    vi.spyOn(api, "fetchRelatedSystems").mockResolvedValue([]);
    vi.spyOn(api, "fetchTickets").mockResolvedValue(mockTicketList);
    vi.spyOn(api, "fetchTicketDetail").mockResolvedValue(mockTicketDetail);
  });

  afterEach(() => {
    localStorage.clear();
    window.history.pushState({}, "", "/");
    vi.restoreAllMocks();
  });

  /**
   * 1. Direct navigation to protected route while unauthenticated redirects to /login
   */
  it("redirects unauthenticated users attempting to access /tickets/new to /login and hides navigation tabs", async () => {
    window.history.pushState({}, "", "/tickets/new");

    render(<App />);

    // Protected Create Ticket form must NOT be rendered
    expect(screen.queryByText(/Create New IT Support Ticket/i)).not.toBeInTheDocument();

    // Login screen must be rendered
    expect(await screen.findByRole("heading", { name: /sign in to your account/i })).toBeInTheDocument();

    // Address bar must reflect /login
    expect(window.location.pathname).toBe("/login");

    // Navigation tabs (My Tickets, Create Ticket) must not be rendered when unauthenticated
    expect(screen.queryByRole("button", { name: /create ticket/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /my tickets/i })).not.toBeInTheDocument();
  });

  /**
   * 2. Preserves intended destination and forwards user after successful login
   */
  it("preserves intended destination and forwards user to /tickets/new upon successful login", async () => {
    window.history.pushState({}, "", "/tickets/new");

    vi.spyOn(api, "login").mockResolvedValue({
      token: "valid-mock-jwt-token",
      user: mockRequesterUser,
    });
    vi.spyOn(api, "fetchCurrentUser").mockResolvedValue(mockRequesterUser);

    render(<App />);

    // Confirm redirected to login
    expect(await screen.findByRole("heading", { name: /sign in to your account/i })).toBeInTheDocument();
    expect(window.location.pathname).toBe("/login");

    // Fill in and submit login credentials
    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/^password/i);
    const submitBtn = screen.getByRole("button", { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: "jennifer.anderson@kmutt.ac.th" } });
    fireEvent.change(passwordInput, { target: { value: "Password123!" } });
    fireEvent.click(submitBtn);

    // Forwarded to intended destination (/tickets/new)
    expect(await screen.findByText(/Create New IT Support Ticket/i)).toBeInTheDocument();
    expect(window.location.pathname).toBe("/tickets/new");
  });

  /**
   * 3. Preserves intended ticket detail destination
   */
  it("preserves intended ticket detail destination and forwards user upon successful login", async () => {
    window.history.pushState({}, "", "/tickets/101");

    vi.spyOn(api, "login").mockResolvedValue({
      token: "valid-mock-jwt-token",
      user: mockRequesterUser,
    });
    vi.spyOn(api, "fetchCurrentUser").mockResolvedValue(mockRequesterUser);

    render(<App />);

    // Redirected to login
    expect(await screen.findByRole("heading", { name: /sign in to your account/i })).toBeInTheDocument();
    expect(window.location.pathname).toBe("/login");

    // Login
    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/^password/i);
    const submitBtn = screen.getByRole("button", { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: "jennifer.anderson@kmutt.ac.th" } });
    fireEvent.change(passwordInput, { target: { value: "Password123!" } });
    fireEvent.click(submitBtn);

    // Forwarded to ticket detail
    expect(await screen.findByText(/TKT-2026-000101/i)).toBeInTheDocument();
    expect(window.location.pathname).toBe("/tickets/101");
  });

  /**
   * 4. Mandatory password change takes priority over intended destination
   */
  it("enforces mandatory password change before restoring intended destination", async () => {
    window.history.pushState({}, "", "/tickets/new");

    vi.spyOn(api, "login").mockResolvedValue({
      token: "valid-mock-jwt-token",
      user: mockMustChangeUser,
    });
    vi.spyOn(api, "fetchCurrentUser").mockResolvedValue(mockMustChangeUser);
    vi.spyOn(api, "changePassword").mockResolvedValue({ message: "Password updated successfully" });

    render(<App />);

    // Initial redirect to login
    expect(await screen.findByRole("heading", { name: /sign in to your account/i })).toBeInTheDocument();

    // Login with account requiring password change
    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/^password/i);
    const submitBtn = screen.getByRole("button", { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: "new.requester@toktickit.com" } });
    fireEvent.change(passwordInput, { target: { value: "InitialPassword123!" } });
    fireEvent.click(submitBtn);

    // Must be intercepted on Change Password screen, NOT Create Ticket
    expect(await screen.findByRole("heading", { name: /change your password/i })).toBeInTheDocument();
    expect(window.location.pathname).toBe("/change-password");
    expect(screen.queryByText(/Create New IT Support Ticket/i)).not.toBeInTheDocument();

    // Complete password change
    const currentPassInput = screen.getByLabelText(/^current \(temporary\) password/i);
    const newPassInput = screen.getByLabelText(/^new password/i);
    const confirmPassInput = screen.getByLabelText(/^confirm new password/i);
    const savePassBtn = screen.getByRole("button", { name: /continue/i });

    fireEvent.change(currentPassInput, { target: { value: "InitialPassword123!" } });
    fireEvent.change(newPassInput, { target: { value: "NewSecurePassword123!" } });
    fireEvent.change(confirmPassInput, { target: { value: "NewSecurePassword123!" } });
    fireEvent.click(savePassBtn);

    // After password change, now forwarded to original destination (/tickets/new)
    expect(await screen.findByText(/Create New IT Support Ticket/i)).toBeInTheDocument();
    expect(window.location.pathname).toBe("/tickets/new");
  });

  /**
   * 5. Role-based permission enforcement on intended destination
   */
  it("validates role permissions and redirects to default view when destination is not permitted", async () => {
    window.history.pushState({}, "", "/admin/users");

    vi.spyOn(api, "login").mockResolvedValue({
      token: "valid-mock-jwt-token",
      user: mockRequesterUser,
    });
    vi.spyOn(api, "fetchCurrentUser").mockResolvedValue(mockRequesterUser);

    render(<App />);

    // Redirected to login
    expect(await screen.findByRole("heading", { name: /sign in to your account/i })).toBeInTheDocument();

    // Login as REQUESTER (cannot access /admin/users)
    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/^password/i);
    const submitBtn = screen.getByRole("button", { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: "jennifer.anderson@kmutt.ac.th" } });
    fireEvent.change(passwordInput, { target: { value: "Password123!" } });
    fireEvent.click(submitBtn);

    // Redirected to default REQUESTER view (/tickets), NOT /admin/users
    await waitFor(() => {
      expect(window.location.pathname).toBe("/tickets");
    });
    expect(await screen.findByRole("heading", { name: /my tickets/i })).toBeInTheDocument();
  });

  /**
   * 6. Prevents unauthenticated bypass via manual popstate URL changes
   */
  it("prevents unauthenticated bypass via manual popstate URL changes", async () => {
    render(<App />);

    expect(await screen.findByRole("heading", { name: /sign in to your account/i })).toBeInTheDocument();

    // Simulate user attempting to navigate to /tickets/new via history / popstate
    act(() => {
      window.history.pushState({}, "", "/tickets/new");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });

    // Guard immediately intercepts and replaces URL back to /login
    await waitFor(() => {
      expect(window.location.pathname).toBe("/login");
    });
    expect(screen.getByRole("heading", { name: /sign in to your account/i })).toBeInTheDocument();
    expect(screen.queryByText(/Create New IT Support Ticket/i)).not.toBeInTheDocument();
  });

  /**
   * 7. IT Staff default landing page is /queue upon login
   */
  it("redirects IT Staff to /queue upon successful login when no deep-link destination was requested", async () => {
    window.history.pushState({}, "", "/login");

    vi.spyOn(api, "login").mockResolvedValue({
      token: "valid-staff-jwt-token",
      user: mockStaffUser,
    });
    vi.spyOn(api, "fetchCurrentUser").mockResolvedValue(mockStaffUser);
    vi.spyOn(api, "fetchStaffTickets").mockResolvedValue({
      data: [],
      pagination: { total: 0, page: 1, pageSize: 10, totalPages: 1 },
    });

    render(<App />);

    expect(await screen.findByRole("heading", { name: /sign in to your account/i })).toBeInTheDocument();

    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/^password/i);
    const submitBtn = screen.getByRole("button", { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: "staff.michael@toktickit.com" } });
    fireEvent.change(passwordInput, { target: { value: "Password123!" } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(window.location.pathname).toBe("/queue");
    });
    expect(await screen.findByRole("heading", { name: /IT Staff Ticket Queue/i })).toBeInTheDocument();
  });

  /**
   * 8. Navigating to /queue/:id renders staff ticket detail correctly
   */
  it("renders StaffDetailScreen when navigating to /queue/:id", async () => {
    localStorage.setItem("toktickit_auth_token", "valid-staff-token");
    localStorage.setItem("toktickit_auth_user", JSON.stringify(mockStaffUser));
    window.history.pushState({}, "", "/queue/101");

    vi.spyOn(api, "fetchCurrentUser").mockResolvedValue(mockStaffUser);
    vi.spyOn(api, "fetchStaffTicketDetail").mockResolvedValue({
      ...mockTicketDetail,
      publicComments: [],
      internalNotes: [],
    });
    vi.spyOn(api, "fetchStaffAssignees").mockResolvedValue([]);

    render(<App />);

    expect(await screen.findByText(/TKT-2026-000101/i)).toBeInTheDocument();
    expect(window.location.pathname).toBe("/queue/101");
    // Ensure My Tickets header is NOT rendered
    expect(screen.queryByRole("heading", { name: /^my tickets$/i })).not.toBeInTheDocument();
  });
});
