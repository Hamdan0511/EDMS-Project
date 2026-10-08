import { test, expect } from "@playwright/test";
import { apiContextFor, createWorkflowTemplate, searchDirectory } from "../helpers/api";
import { USERS } from "../constants";

test.use({ storageState: USERS.admin.storageState });

test.describe("Directory", () => {
  test("search finds a real seeded project member by name or email", async ({ page }) => {
    const api = await apiContextFor("admin");
    const results = await searchDirectory(api, USERS.member.email);
    expect(results.some((r) => r.kind === "user" && r.email === USERS.member.email)).toBe(true);

    await page.goto(`/directory?name=${encodeURIComponent("E2E Member")}`);
    await expect(page.getByText(USERS.member.email)).toBeVisible();

    await api.dispose();
  });

  test("role assignment drives real permission behavior: Viewer is rejected, Member is allowed", async () => {
    const viewerApi = await apiContextFor("viewer");
    const viewerResult = await createWorkflowTemplate(viewerApi, {
      name: `E2E Viewer-Attempt ${Date.now()}`,
      reviewerUserId: "irrelevant-should-403-first",
    }).catch((err: Error) => err);
    expect(viewerResult).toBeInstanceOf(Error);
    expect((viewerResult as Error).message).toMatch(/403/);

    const memberApi = await apiContextFor("member");
    const reviewerUserId = await (async () => {
      const adminApi = await apiContextFor("admin");
      const results = await searchDirectory(adminApi, USERS.verifier.email);
      await adminApi.dispose();
      const match = results.find((r) => r.kind === "user" && r.email === USERS.verifier.email);
      if (!match?.userId) throw new Error("verifier user not found");
      return match.userId;
    })();
    const memberTemplate = await createWorkflowTemplate(memberApi, {
      name: `E2E Member-Attempt ${Date.now()}`,
      reviewerUserId,
    });
    expect(memberTemplate.id).toBeTruthy();

    await viewerApi.dispose();
    await memberApi.dispose();
  });
});
