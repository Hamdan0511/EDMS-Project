import { test, expect } from "@playwright/test";
import { apiContextFor, createFieldIssue, getUserId, transitionFieldIssue } from "../helpers/api";
import { USERS } from "../constants";

test.use({ storageState: USERS.admin.storageState });

test.describe("Field Issues — status lifecycle and the verification gate", () => {
  test("rejects skipping straight from OPEN to CLOSED (the FIELD-001 regression)", async () => {
    const api = await apiContextFor("admin");
    const issue = await createFieldIssue(api, { title: `E2E skip-ahead ${Date.now()}`, description: "Regression guard." });

    const skip = await transitionFieldIssue(api, issue.id, "CLOSED");
    expect(skip.status).toBe(400);
    expect(JSON.stringify(skip.body)).toMatch(/must move to/);

    await api.dispose();
  });

  test("the responsible person cannot verify their own issue; an independent reviewer can", async ({ page }) => {
    const adminApi = await apiContextFor("admin");
    const responsibleUserId = await getUserId(adminApi, USERS.member.email);

    const issue = await createFieldIssue(adminApi, {
      title: `E2E verification gate ${Date.now()}`,
      description: "Proves the independent-verification gate holds across real distinct user sessions.",
      responsibleUserId,
    });

    // Walk the real, legitimate lifecycle as the admin (manager role).
    for (const status of ["ASSIGNED", "IN_PROGRESS", "WORK_DONE", "READY_FOR_VERIFICATION"]) {
      const step = await transitionFieldIssue(adminApi, issue.id, status);
      expect(step.status, `transition to ${status}`).toBe(200);
    }

    // The responsible person (a genuinely separate authenticated session —
    // not just a different actingUserId in the same process) tries to
    // verify their own work and must be rejected.
    const memberApi = await apiContextFor("member");
    const selfVerify = await transitionFieldIssue(memberApi, issue.id, "VERIFIED");
    expect(selfVerify.status).toBe(400);
    expect(JSON.stringify(selfVerify.body)).toMatch(/cannot verify their own/);

    // A genuinely independent reviewer, in their own real session, can.
    const verifierApi = await apiContextFor("verifier");
    const independentVerify = await transitionFieldIssue(verifierApi, issue.id, "VERIFIED");
    expect(independentVerify.status).toBe(200);

    const close = await transitionFieldIssue(adminApi, issue.id, "CLOSED");
    expect(close.status).toBe(200);

    await page.goto(`/field/issues/${issue.id}`);
    await expect(page.getByRole("heading", { name: issue.issueNumber })).toBeVisible();
    await expect(page.getByText("Closed").first()).toBeVisible();

    await adminApi.dispose();
    await memberApi.dispose();
    await verifierApi.dispose();
  });

  test("rejects moving backward from a later stage to an earlier one", async () => {
    const api = await apiContextFor("admin");
    const issue = await createFieldIssue(api, { title: `E2E backward guard ${Date.now()}`, description: "Backward guard." });
    await transitionFieldIssue(api, issue.id, "ASSIGNED");
    await transitionFieldIssue(api, issue.id, "IN_PROGRESS");

    const backward = await transitionFieldIssue(api, issue.id, "ASSIGNED");
    expect(backward.status).toBe(400);
    expect(JSON.stringify(backward.body)).toMatch(/cannot move backward/);

    await api.dispose();
  });
});
