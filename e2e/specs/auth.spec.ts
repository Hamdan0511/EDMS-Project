import { test, expect } from "@playwright/test";
import { USERS } from "../constants";

test.describe("Authentication", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("logs in with valid credentials and reaches the authenticated app", async ({ page }) => {
    await page.goto("/login");
    await page.locator('input[type="email"]').fill(USERS.admin.email);
    await page.locator('input[type="password"]').fill(USERS.admin.password);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/\/home/);
    await expect(page).toHaveURL(/\/home/);
  });

  test("rejects an invalid password and stays on the login page", async ({ page }) => {
    await page.goto("/login");
    await page.locator('input[type="email"]').fill(USERS.admin.email);
    await page.locator('input[type="password"]').fill("definitely-wrong-password");
    await page.locator('button[type="submit"]').click();
    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test("redirects an unauthenticated visitor away from a protected page", async ({ page }) => {
    await page.goto("/home");
    await expect(page).toHaveURL(/\/login/);
  });

  // Logs in fresh and logs back out within this one isolated, storageState-
  // free test — deliberately NOT reusing e2e/.auth/admin.json, because every
  // other spec file's apiContextFor("admin") depends on that shared session
  // staying alive for the whole run; destroying it here would 401 everything
  // that runs after this test.
  test("logging out destroys the session and redirects to login", async ({ page }) => {
    await page.goto("/login");
    await page.locator('input[type="email"]').fill(USERS.admin.email);
    await page.locator('input[type="password"]').fill(USERS.admin.password);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/\/home/);

    await page.evaluate(() => fetch("/api/auth/logout", { method: "POST" }).then(() => undefined));
    await page.goto("/home");
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("Authenticated session (shared storageState — read-only tests only)", () => {
  test.use({ storageState: USERS.admin.storageState });

  test("reuses the saved session without being asked to log in again", async ({ page }) => {
    await page.goto("/home");
    await expect(page).toHaveURL(/\/home/);
  });
});
