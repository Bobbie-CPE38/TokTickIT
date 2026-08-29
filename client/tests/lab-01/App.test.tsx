import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import App from "../../src/App.js";
import * as api from "../../src/api.js";

describe("App", () => {
  beforeEach(() => {
    localStorage.setItem("toktickit_requester_id", "1");
    vi.spyOn(api, "fetchActiveRequesters").mockResolvedValue([
      {
        id: 1,
        name: "Jennifer Anderson",
        email: "jennifer.anderson@kmutt.ac.th",
        department: "Computer Engineering",
      },
    ]);
  });

  // WORKED EXAMPLE — provided for you.
  it("renders the TokTickIT heading", async () => {
    render(<App />);
    expect(await screen.findByText(/TokTickIT/i)).toBeInTheDocument();
  });

  // Issue 4 — write these yourself. Hint: mock the api module with
  // vi.spyOn(api, "checkSystem").mockResolvedValue(...) / .mockRejectedValue(...)
  // then click the button and assert the Online list / Offline message.
  it("shows Online and the seeded categories on success", async () => {
    vi.spyOn(api, "checkSystem").mockResolvedValue({
      online: true,
      categories: [
        { id: 1, name: "Account and Access" },
        { id: 2, name: "Hardware" },
        { id: 3, name: "Software" },
        { id: 4, name: "Network" },
      ],
    });

    render(<App />);
    const checkBtn = await screen.findByRole("button", { name: /Check System/i });
    fireEvent.click(checkBtn);

    await screen.findByText(/Status: Online/i);
    expect(screen.getByText(/Account and Access/i)).toBeInTheDocument();
    expect(screen.getByText(/Hardware/i)).toBeInTheDocument();
    expect(screen.getByText(/Software/i)).toBeInTheDocument();
    expect(screen.getByText(/Network/i)).toBeInTheDocument();
  });

  it("shows an Offline error message when the API is unavailable", async () => {
    vi.spyOn(api, "checkSystem").mockRejectedValue(new Error("Backend is unavailable."));

    render(<App />);
    const checkBtn = await screen.findByRole("button", { name: /Check System/i });
    fireEvent.click(checkBtn);

    await screen.findByText(/Status: Offline/i);
    expect(screen.getByText(/Backend is unavailable./i)).toBeInTheDocument();
  });
});
