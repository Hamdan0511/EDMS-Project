import { defineConfig, devices } from "@playwright/test";
import { BASE_URL } from "./e2e/constants";

/**
 * This config assumes the application is ALREADY running against a
 * disposable, migrated, seeded database at BASE_URL before this runs — see
 * e2e/README.md for the exact sequence (also what `npm run test:e2e` and
 * .github/workflows/e2e.yml both do). globalSetup here only waits for that
 * server and captures authenticated storageState for each fixture user; it
 * does not provision any infrastructure itself.
 */
export default defineConfig({
  testDir: "./e2e/specs",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [["list"], ["html", { outputFolder: "playwright-report", open: "never" }]],
  outputDir: "test-results",
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
