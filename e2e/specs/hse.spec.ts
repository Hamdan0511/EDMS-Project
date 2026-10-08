import { test, expect } from "@playwright/test";
import { apiContextFor, createCorrectiveAction, getUserId, transitionCorrectiveAction } from "../helpers/api";
import { USERS } from "../constants";

test.use({ storageState: USERS.admin.storageState });

test.describe("HSE Corrective Actions", () => {
  test("rejects an invalid skip-ahead, then completes the real lifecycle end to end", async ({ page }) => {
    const api = await apiContextFor("admin");
    const action = await createCorrectiveAction(api, { description: `E2E corrective action ${Date.now()}` });

    const skip = await transitionCorrectiveAction(api, action.id, "VERIFIED");
    expect(skip.status).toBe(400);

    for (const status of ["IN_PROGRESS", "PENDING_VERIFICATION", "VERIFIED", "CLOSED"]) {
      const step = await transitionCorrectiveAction(api, action.id, status);
      expect(step.status, `transition to ${status}`).toBe(200);
    }

    await page.goto(`/hse/corrective-actions/${action.id}`);
    await expect(page.getByText("Closed").first()).toBeVisible();

    await api.dispose();
  });

  test("the assignee cannot verify their own corrective action", async ({}) => {
    const api = await apiContextFor("admin");
    const adminApi = await apiContextFor("admin");
    const assigneeId = await getUserId(adminApi, USERS.member.email);

    const action = await createCorrectiveAction(api, {
      description: `E2E self-verify guard ${Date.now()}`,
      assignedToId: assigneeId,
    });
    await transitionCorrectiveAction(api, action.id, "IN_PROGRESS");
    await transitionCorrectiveAction(api, action.id, "PENDING_VERIFICATION");

    const memberApi = await apiContextFor("member");
    const selfVerify = await transitionCorrectiveAction(memberApi, action.id, "VERIFIED");
    expect(selfVerify.status).toBe(400);

    const independentVerify = await transitionCorrectiveAction(api, action.id, "VERIFIED");
    expect(independentVerify.status).toBe(200);

    await api.dispose();
    await adminApi.dispose();
    await memberApi.dispose();
  });
});
