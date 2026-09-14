import { describe, it, expect } from "vitest";
import { render, screen, act } from "@testing-library/react";
import React from "react";
import { RouterProvider, useRouter } from "../../src/core/router/RouterContext.js";

function TestConsumer() {
  const { currentPath, ticketId, navigateTo, replaceTo } = useRouter();
  return (
    <div>
      <span data-testid="path">{currentPath}</span>
      <span data-testid="ticket-id">{ticketId !== null ? String(ticketId) : "none"}</span>
      <button onClick={() => navigateTo("/tickets/205")}>Go to 205</button>
      <button onClick={() => replaceTo("/login")}>Replace to Login</button>
    </div>
  );
}

describe("RouterContext (Zero-Dependency History Router)", () => {
  it("synchronously reads initial pathname from window.location upon mount", () => {
    window.history.pushState({}, "", "/tickets/101");

    render(
      <RouterProvider>
        <TestConsumer />
      </RouterProvider>
    );

    expect(screen.getByTestId("path").textContent).toBe("/tickets/101");
    expect(screen.getByTestId("ticket-id").textContent).toBe("101");
  });

  it("updates path and history on navigateTo", () => {
    window.history.pushState({}, "", "/tickets");

    render(
      <RouterProvider>
        <TestConsumer />
      </RouterProvider>
    );

    act(() => {
      screen.getByText("Go to 205").click();
    });

    expect(screen.getByTestId("path").textContent).toBe("/tickets/205");
    expect(screen.getByTestId("ticket-id").textContent).toBe("205");
    expect(window.location.pathname).toBe("/tickets/205");
  });

  it("updates path and history on replaceTo", () => {
    window.history.pushState({}, "", "/tickets");

    render(
      <RouterProvider>
        <TestConsumer />
      </RouterProvider>
    );

    act(() => {
      screen.getByText("Replace to Login").click();
    });

    expect(screen.getByTestId("path").textContent).toBe("/login");
    expect(screen.getByTestId("ticket-id").textContent).toBe("none");
    expect(window.location.pathname).toBe("/login");
  });

  it("responds cleanly to browser popstate events", () => {
    window.history.pushState({}, "", "/tickets");

    render(
      <RouterProvider>
        <TestConsumer />
      </RouterProvider>
    );

    act(() => {
      window.history.pushState({}, "", "/tickets/303");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });

    expect(screen.getByTestId("path").textContent).toBe("/tickets/303");
    expect(screen.getByTestId("ticket-id").textContent).toBe("303");
  });
});
