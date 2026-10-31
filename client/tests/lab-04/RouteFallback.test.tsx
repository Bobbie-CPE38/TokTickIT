import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import App from "../../src/App.js";
import * as api from "../../src/api.js";
import { isViewPermittedForRole, pathToView } from "../../src/core/router/RouteGuard.js";

const mockRequesterUser: api.AuthUser = {
  id: 1,
  name: "Jennifer Anderson",
  email: "jennifer.anderson@kmutt.ac.th",
  role: "REQUESTER",
  isActive: true,
  mustChangePassword: false,
};

const emptyTicketList: api.TicketListResponse = {
  data: [],
  pagination: { total: 0, page: 1, pageSize: 10, totalPages: 0 },
};

describe("Lab 4 Unknown Route Fallback (Issue #58)", () => {
  beforeEach(() => {
    window.history.pushState({}, "", "/");
    localStorage.clear();
    vi.restoreAllMocks();
    vi.spyOn(api, "fetchCategories").mockResolvedValue([]);
    vi.spyOn(api, "fetchRelatedSystems").mockResolvedValue([]);
    vi.spyOn(api, "fetchTickets").mockResolvedValue(emptyTicketList);
  });

  afterEach(() => {
    localStorage.clear();
    window.history.pushState({}, "", "/");
    vi.restoreAllMocks();
  });

  it("maps unknown paths to the not-found view and keeps known paths unchanged", () => {
    expect(pathToView("/hehehe").view).toBe("not-found");
    expect(pathToView("/tickets/abc").view).toBe("not-found");
    expect(pathToView("/admin").view).toBe("not-found");
    expect(pathToView("/tickets").view).toBe("my-tickets");
    expect(pathToView("/").view).toBe("my-tickets");
    expect(pathToView("/queue?status=NEW").view).toBe("queue");
    expect(pathToView("/tickets/12")).toEqual({ view: "ticket-detail", ticketId: 12 });
  });

  it("permits the not-found view for every signed-in role but not for anonymous users", () => {
    for (const role of ["REQUESTER", "IT_STAFF", "ADMINISTRATOR"]) {
      expect(isViewPermittedForRole("not-found", role)).toBe(true);
    }
    expect(isViewPermittedForRole("not-found", undefined)).toBe(false);
  });

  it("shows Page not found for an unknown URL and Go to home returns to the role's home view", async () => {
    localStorage.setItem("toktickit_auth_token", "valid-requester-token");
    localStorage.setItem("toktickit_auth_user", JSON.stringify(mockRequesterUser));
    vi.spyOn(api, "fetchCurrentUser").mockResolvedValue(mockRequesterUser);
    window.history.pushState({}, "", "/hehehe");

    render(<App />);

    expect(await screen.findByRole("heading", { name: /page not found/i })).toBeInTheDocument();
    expect(window.location.pathname).toBe("/hehehe");
    expect(screen.queryByRole("heading", { name: /^my tickets$/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /go to home/i }));

    await waitFor(() => expect(window.location.pathname).toBe("/tickets"));
    expect(await screen.findByRole("heading", { name: /^my tickets$/i })).toBeInTheDocument();
  });
});
