import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e", fullyParallel: false, workers: 1, retries: 0,
  use: { baseURL: "http://localhost:3000", trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], channel: process.env.PLAYWRIGHT_CHANNEL ?? "msedge" } }],
  reporter: [["list"], ["html", { open: "never" }]],
});
