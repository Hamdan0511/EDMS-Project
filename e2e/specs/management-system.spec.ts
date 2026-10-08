import { test, expect } from "@playwright/test";
import { USERS } from "../constants";

test.use({ storageState: USERS.admin.storageState });

test.describe("Management System", () => {
  test("Doc Owner filter shows the full department vocabulary even for departments with zero documents", async ({ page }) => {
    await page.goto("/management-system");
    // These are static reference vocabulary (src/lib/management-system/status.ts),
    // not derived from existing records — the whole point of the earlier
    // "MASTER FIX" work this test guards against regressing. The options
    // only render once the MultiSelect's popover is open.
    await page.getByRole("button", { name: "All Owners" }).click();
    await expect(page.locator("label").filter({ hasText: "Health & Safety" })).toBeVisible();
    await expect(page.locator("label").filter({ hasText: "Plant&Logistics" })).toBeVisible();
  });

  test("switching category tabs is a fresh query, not an additive filter", async ({ page }) => {
    await page.goto("/management-system?managementSystem=HSE&documentNo=something-stale");
    // Scoped to the real StatusTabs tab specifically (label immediately
    // followed by its "(count)" span, with no space) — the page also has a
    // sidebar nav link and a certificate-card link that both also say
    // "Quality", which a plain name match would ambiguously hit instead.
    await page.getByRole("link", { name: /^Quality\(\d+\)$/ }).click();
    await expect(page).toHaveURL(/managementSystem=QUALITY/);
    // The stale documentNo filter from the HSE tab must not carry over.
    await expect(page).not.toHaveURL(/documentNo=something-stale/);
  });

  test("ISO Certificates page renders the certificate library", async ({ page }) => {
    await page.goto("/management-system/certificates");
    await expect(page.getByRole("heading", { name: /Certificate/i })).toBeVisible();
  });
});
