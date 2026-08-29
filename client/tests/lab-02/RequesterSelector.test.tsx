import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import App from "../../src/App.js";
import * as api from "../../src/api.js";

const mockActiveRequesters: api.DevelopmentRequester[] = [
  {
    id: 1,
    name: "Jennifer Anderson",
    email: "jennifer.anderson@kmutt.ac.th",
    department: "Computer Engineering",
  },
  {
    id: 2,
    name: "David Lee",
    email: "david.lee@kmutt.ac.th",
    department: "Information Technology",
  },
  {
    id: 3,
    name: "Sarah Johnson",
    email: "sarah.johnson@kmutt.ac.th",
    department: "Digital Media",
  },
  {
    id: 4,
    name: "Michael Brown",
    email: "michael.brown@kmutt.ac.th",
    department: "Electrical Engineering",
  },
];

describe("UI-04: Development Requester Context and Selector", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("prompts with Development Requester selection modal when no requester is selected (AC-02, BR-03)", async () => {
    vi.spyOn(api, "fetchActiveRequesters").mockResolvedValue(mockActiveRequesters);

    render(<App />);

    // Check title and notice banner text per ui-spec.md Section 5.1
    expect(await screen.findByText(/Select Development Requester/i)).toBeInTheDocument();
    expect(
      screen.getByText(
        /Select a Development Requester to test requester-specific ticket behavior. This is not a login screen. Authentication and role-based access will be introduced in Lab 3./i
      )
    ).toBeInTheDocument();

    // Check dropdown options format: {Name} ({Department}) - {Email}
    const select = (await screen.findByRole("combobox", {
      name: /Select Requester/i,
    })) as HTMLSelectElement;
    expect(select).toBeInTheDocument();

    // Helper text
    expect(screen.getByText(/Only active development requesters are shown./i)).toBeInTheDocument();

    // Ensure options are populated with the active requesters
    await waitFor(() => {
      expect(screen.getByRole("option", { name: "Jennifer Anderson" })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: "David Lee" })).toBeInTheDocument();
    });

    // Inactive requester (Alex Inactive) must NOT be present (AC-05, BR-05)
    expect(screen.queryByText(/Alex Inactive/i)).not.toBeInTheDocument();
  });

  it("selects a requester, persists to storage, and displays profile in header", async () => {
    vi.spyOn(api, "fetchActiveRequesters").mockResolvedValue(mockActiveRequesters);

    render(<App />);

    const select = (await screen.findByRole("combobox", {
      name: /Select Requester/i,
    })) as HTMLSelectElement;

    // Select Jennifer Anderson (id: 1)
    fireEvent.change(select, { target: { value: "1" } });

    const continueBtn = screen.getByRole("button", { name: /Continue/i });
    fireEvent.click(continueBtn);

    // Modal should close and header should display selected requester name and department
    await waitFor(() => {
      expect(screen.queryByText(/Select a Development Requester to test/i)).not.toBeInTheDocument();
    });

    expect(screen.getAllByText(/Jennifer Anderson/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Computer Engineering/i).length).toBeGreaterThanOrEqual(1);

    // Verify localStorage has persisted requester ID
    expect(localStorage.getItem("toktickit_requester_id")).toBe("1");
  });

  it("allows switching requester via the Change / Switch Requester action in header (BR-16)", async () => {
    // Pre-populate localStorage with David Lee (id: 2)
    localStorage.setItem("toktickit_requester_id", "2");
    vi.spyOn(api, "fetchActiveRequesters").mockResolvedValue(mockActiveRequesters);

    render(<App />);

    // Should load with David Lee active and no prompt open initially
    await waitFor(() => {
      expect(screen.getAllByText(/David Lee/i).length).toBeGreaterThanOrEqual(1);
    });
    expect(screen.getAllByText(/Information Technology/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText(/Select a Development Requester to test/i)).not.toBeInTheDocument();

    // Click Profile button in header to open dropdown menu, then click Switch Requester
    const profileBtn = screen.getByRole("button", { name: /Profile/i });
    fireEvent.click(profileBtn);

    const switchBtn = screen.getByRole("button", { name: /Switch Requester|Change Requester/i });
    fireEvent.click(switchBtn);

    // Modal should open
    expect(screen.getByText(/Select Development Requester/i)).toBeInTheDocument();

    // Cancel button should be enabled when a requester is already active
    const cancelBtn = screen.getByRole("button", { name: /Cancel/i });
    expect(cancelBtn).not.toBeDisabled();

    // Switch to Sarah Johnson (id: 3)
    const select = screen.getByRole("combobox", { name: /Select Requester/i }) as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "3" } });

    const continueBtn = screen.getByRole("button", { name: /Continue/i });
    fireEvent.click(continueBtn);

    // Should now show Sarah Johnson in header
    await waitFor(() => {
      expect(screen.getAllByText(/Sarah Johnson/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/Digital Media/i).length).toBeGreaterThanOrEqual(1);
    });
    expect(localStorage.getItem("toktickit_requester_id")).toBe("3");
  });

  it("displays error alert and allows retry when loading requesters fails", async () => {
    const fetchSpy = vi
      .spyOn(api, "fetchActiveRequesters")
      .mockRejectedValueOnce(new Error("Unable to load requesters"))
      .mockResolvedValueOnce(mockActiveRequesters);

    render(<App />);

    expect(await screen.findByText(/Unable to load requesters/i)).toBeInTheDocument();

    // Click Retry
    const retryBtn = screen.getByRole("button", { name: /Retry/i });
    fireEvent.click(retryBtn);

    // Should reload and succeed
    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledTimes(2);
      expect(screen.getByRole("option", { name: "Jennifer Anderson" })).toBeInTheDocument();
    });
  });
});
