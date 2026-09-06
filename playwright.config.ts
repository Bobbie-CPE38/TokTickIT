import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e/lab-02",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 800 },
      },
    },
    {
      name: "tablet",
      testMatch: /requester-ticket-flow\.spec\.ts/,
      use: {
        viewport: { width: 768, height: 1024 },
        userAgent:
          "Mozilla/5.0 (iPad; CPU OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1",
      },
    },
    {
      name: "mobile",
      testMatch: /requester-ticket-flow\.spec\.ts/,
      use: {
        ...devices["Pixel 5"],
        viewport: { width: 375, height: 667 },
      },
    },
  ],
  webServer: [
    {
      command: "npm run dev",
      cwd: "./server",
      port: 3000,
      reuseExistingServer: !process.env.CI,
      stdout: "ignore",
      stderr: "pipe",
    },
    {
      command: "npm run dev",
      cwd: "./client",
      port: 5173,
      reuseExistingServer: !process.env.CI,
      stdout: "ignore",
      stderr: "pipe",
    },
  ],
});
