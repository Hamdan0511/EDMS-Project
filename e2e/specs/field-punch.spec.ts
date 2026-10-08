import { test, expect } from "@playwright/test";
import { apiContextFor, createPunchItem, getUserId, transitionPunchItem } from "../helpers/api";
import { auditLogActions } from "../helpers/db";
import { USERS } from "../constants";

test.use({ storageState: USERS.admin.storageState });

test.describe("Field Punch / Snagging", () => {
  test("create -> view -> lifecycle -> invalid skip-ahead -> independent verification -> final state -> audit trail", async ({
    page,
  }) => {
    const adminApi = await apiContextFor("admin");
    const responsibleUserId = await getUserId(adminApi, USERS.member.email);

    const created = await createPunchItem(adminApi, {
      title: `E2E Punch Item ${Date.now()}`,
      description: "Paint touch-up required on corridor wall.",
      responsibleUserId,
    });
    expect(created.status).toBe(200);
    const item = created.body!;

    await page.goto(`/field/punch/${item.id}`);
    await expect(page.getByText(item.punchItemNumber)).toBeVisible();

    // Invalid: OPEN -> CLOSED directly
    const skip = await transitionPunchItem(adminApi, item.id, "CLOSED");
    expect(skip.status).toBe(400);
    expect(JSON.stringify(skip.body)).toMatch(/must move to/);

    for (const status of ["ASSIGNED", "IN_PROGRESS", "WORK_DONE", "READY_FOR_VERIFICATION"]) {
      const step = await transitionPunchItem(adminApi, item.id, status);
      expect(step.status, `transition to ${status}`).toBe(200);
    }

    // The responsible person cannot verify their own punch item.
    const memberApi = await apiContextFor("member");
    const selfVerify = await transitionPunchItem(memberApi, item.id, "VERIFIED");
    expect(selfVerify.status).toBe(400);
    expect(JSON.stringify(selfVerify.body)).toMatch(/cannot verify their own/);

    // An independent reviewer can.
    const verify = await transitionPunchItem(adminApi, item.id, "VERIFIED");
    expect(verify.status).toBe(200);

    const close = await transitionPunchItem(adminApi, item.id, "CLOSED");
    expect(close.status).toBe(200);

    const actions = await auditLogActions("FieldPunchItem", item.id);
    expect(actions).toContain("FIELD_PUNCH_ITEM_CREATED");
    // ASSIGNED, IN_PROGRESS, WORK_DONE, READY_FOR_VERIFICATION, VERIFIED, CLOSED
    // — 6 successful transitions; the rejected self-verify attempt never logs.
    expect(actions.filter((a) => a === "FIELD_PUNCH_ITEM_STATUS_CHANGED").length).toBe(6);

    await adminApi.dispose();
    await memberApi.dispose();
  });

  test("REWORK_REQUIRED sends a punch item back to IN_PROGRESS, not an arbitrary earlier stage", async () => {
    const api = await apiContextFor("admin");
    const created = await createPunchItem(api, { title: `E2E Rework ${Date.now()}`, description: "Rework path check." });
    const item = created.body!;

    for (const status of ["ASSIGNED", "IN_PROGRESS", "WORK_DONE", "READY_FOR_VERIFICATION"]) {
      await transitionPunchItem(api, item.id, status);
    }

    const rework = await transitionPunchItem(api, item.id, "REWORK_REQUIRED");
    expect(rework.status).toBe(200);

    // REWORK_REQUIRED only reachable from READY_FOR_VERIFICATION, never OPEN.
    const freshItem = await createPunchItem(api, { title: `E2E Rework Guard ${Date.now()}`, description: "Guard check." });
    const invalidRework = await transitionPunchItem(api, freshItem.body!.id, "REWORK_REQUIRED");
    expect(invalidRework.status).toBe(400);

    const backToProgress = await transitionPunchItem(api, item.id, "IN_PROGRESS");
    expect(backToProgress.status).toBe(200);

    await api.dispose();
  });

  test("authorization: Viewer cannot create a punch item; Member can", async () => {
    const viewerApi = await apiContextFor("viewer");
    const viewerAttempt = await createPunchItem(viewerApi, { title: "Viewer attempt", description: "Should be rejected." });
    expect(viewerAttempt.status).toBe(403);

    const memberApi = await apiContextFor("member");
    const memberAttempt = await createPunchItem(memberApi, { title: "Member attempt", description: "Should succeed." });
    expect(memberAttempt.status).toBe(200);

    await viewerApi.dispose();
    await memberApi.dispose();
  });
});
