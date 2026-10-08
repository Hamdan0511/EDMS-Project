import { test, expect } from "@playwright/test";
import { apiContextFor, createPermit, transitionPermit } from "../helpers/api";
import { auditLogActions } from "../helpers/db";
import { USERS } from "../constants";

test.use({ storageState: USERS.admin.storageState });

/**
 * Permits to Work use an explicit allow-list transition map
 * (PERMIT_FORWARD_TRANSITIONS), not the ordered-array-with-skip-guard
 * pattern every other entity in this codebase uses — a genuinely different
 * implementation for the same "don't skip required steps" business rule.
 * This spec proves that map is enforced through the real API.
 */
test.describe("HSE Permits to Work", () => {
  test("create -> view -> lifecycle (DRAFT -> SUBMITTED -> UNDER_REVIEW -> APPROVED -> ACTIVE -> CLOSED) -> invalid transition -> audit trail", async ({
    page,
  }) => {
    const api = await apiContextFor("admin");
    const created = await createPermit(api, { workDescription: `E2E hot work ${Date.now()}` });
    expect(created.status).toBe(200);
    const permit = created.body!;

    await page.goto(`/hse/permits/${permit.id}`);
    await expect(page.getByText(permit.permitNumber)).toBeVisible();

    // Invalid transition: DRAFT -> ACTIVE directly, skipping required
    // SUBMITTED/UNDER_REVIEW/APPROVED steps — not in the allow-list.
    const invalid = await transitionPermit(api, permit.id, "ACTIVE");
    expect(invalid.status).toBe(400);
    expect(JSON.stringify(invalid.body)).toMatch(/cannot move to/);

    // Full legitimate lifecycle, one allowed step at a time.
    for (const status of ["SUBMITTED", "UNDER_REVIEW", "APPROVED", "ACTIVE", "CLOSED"]) {
      const step = await transitionPermit(api, permit.id, status);
      expect(step.status, `transition to ${status}`).toBe(200);
    }

    // CLOSED has no further allowed transitions at all.
    const terminal = await transitionPermit(api, permit.id, "ACTIVE");
    expect(terminal.status).toBe(400);

    const actions = await auditLogActions("HsePermit", permit.id);
    expect(actions).toContain("HSE_PERMIT_CREATED");
    expect(actions.filter((a) => a === "HSE_PERMIT_STATUS_CHANGED").length).toBe(5);

    await api.dispose();
  });

  test("a rejected permit can return to DRAFT for resubmission", async () => {
    const api = await apiContextFor("admin");
    const created = await createPermit(api, { workDescription: `E2E rejection path ${Date.now()}` });
    const permit = created.body!;

    await transitionPermit(api, permit.id, "SUBMITTED");
    const rejected = await transitionPermit(api, permit.id, "REJECTED");
    expect(rejected.status).toBe(200);

    const backToDraft = await transitionPermit(api, permit.id, "DRAFT");
    expect(backToDraft.status).toBe(200);

    await api.dispose();
  });

  test("authorization: Viewer cannot request a permit; Member can", async () => {
    const viewerApi = await apiContextFor("viewer");
    const viewerAttempt = await createPermit(viewerApi, { workDescription: "Viewer attempt" });
    expect(viewerAttempt.status).toBe(403);

    const memberApi = await apiContextFor("member");
    const memberAttempt = await createPermit(memberApi, { workDescription: "Member attempt" });
    expect(memberAttempt.status).toBe(200);

    await viewerApi.dispose();
    await memberApi.dispose();
  });
});
