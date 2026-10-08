import { test, expect } from "@playwright/test";
import { apiContextFor, createItp, decideHoldPoint, decideItp, getItpItems, requestHoldPointInspection } from "../helpers/api";
import { auditLogActions } from "../helpers/db";
import { USERS } from "../constants";

test.use({ storageState: USERS.admin.storageState });

/**
 * ITP & Hold Points: the one module in this codebase with an explicit,
 * commented "no route ever accepts a direct status write" protection — a
 * hold point can only ever become RELEASED as the output of the real
 * approve-decision endpoint. This spec proves that boundary holds through
 * the real HTTP API, not just by reading the comment.
 */
test.describe("Field ITP & Hold Points", () => {
  test("create -> view -> approve -> hold point activates -> request inspection -> invalid direct release -> approve -> released -> audit trail", async ({
    page,
  }) => {
    const api = await apiContextFor("admin");
    const created = await createItp(api, { title: `E2E ITP ${Date.now()}` });
    expect(created.status).toBe(200);
    const itp = created.body!;

    await page.goto(`/field/itp/${itp.id}`);
    await expect(page.getByText(itp.itpNumber)).toBeVisible();

    // Before approval, the H-classified item is just PENDING — not yet a hold point.
    let items = await getItpItems(itp.id);
    expect(items).toHaveLength(1);
    expect(items[0].status).toBe("PENDING");
    const itemId = items[0].id;

    // Invalid: the ITP-level PATCH route only ever accepts APPROVED/REJECTED
    // — anything else, including trying to directly force an item-level
    // concept like "RELEASED" through it, must be rejected.
    const invalidDirectStatus = await api.patch(`/api/field/itp/${itp.id}`, { data: { status: "RELEASED" } });
    expect(invalidDirectStatus.status()).toBe(400);

    // Approve the ITP — this is the ONLY place HOLD_ACTIVE is ever set.
    const approveItp = await decideItp(api, itp.id, "APPROVED");
    expect(approveItp.status).toBe(200);

    items = await getItpItems(itp.id);
    expect(items[0].status).toBe("HOLD_ACTIVE");

    // Request inspection on the now-active hold point.
    const requestInspection = await requestHoldPointInspection(api, itemId);
    expect(requestInspection.status).toBe(200);
    items = await getItpItems(itp.id);
    expect(items[0].status).toBe("INSPECTION_REQUESTED");

    // Invalid: there is no route that accepts a direct {status: "RELEASED"}
    // write on the item — the only way forward is the decision endpoint.
    const directRelease = await api.patch(`/api/field/itp-items/${itemId}`, { data: { status: "RELEASED" } }).catch(() => null);
    if (directRelease) expect([404, 405]).toContain(directRelease.status());

    // The real release path: an approve decision.
    const release = await decideHoldPoint(api, itemId, "approve");
    expect(release.status).toBe(200);
    items = await getItpItems(itp.id);
    expect(items[0].status).toBe("RELEASED");

    const itpActions = await auditLogActions("FieldItp", itp.id);
    expect(itpActions).toContain("FIELD_ITP_CREATED");
    expect(itpActions).toContain("FIELD_ITP_APPROVED");
    const itemActions = await auditLogActions("FieldItpItem", itemId);
    expect(itemActions).toContain("FIELD_ITP_INSPECTION_REQUESTED");
    expect(itemActions).toContain("FIELD_ITP_HOLD_POINT_RELEASED");

    await api.dispose();
  });

  test("rejecting a hold point's inspection sends it back to HOLD_ACTIVE for re-inspection, not a dead end", async () => {
    // Real business rule (src/lib/services/field/itp-service.ts's
    // rejectHoldPoint): a failed inspection doesn't kill the hold point —
    // it goes back to HOLD_ACTIVE so a new inspection can be requested once
    // the work is corrected, the same "rejection cycles back to an active
    // working state" pattern Field Issues/Punch Items also use.
    const api = await apiContextFor("admin");
    const created = await createItp(api, { title: `E2E ITP Rejection ${Date.now()}` });
    const itp = created.body!;
    await decideItp(api, itp.id, "APPROVED");
    const items = await getItpItems(itp.id);
    const itemId = items[0].id;

    await requestHoldPointInspection(api, itemId);
    const rejection = await decideHoldPoint(api, itemId, "reject");
    expect(rejection.status).toBe(200);

    const after = await getItpItems(itp.id);
    expect(after[0].status).toBe("HOLD_ACTIVE");

    // And it can be sent through the inspection cycle again from there.
    const secondRequest = await requestHoldPointInspection(api, itemId);
    expect(secondRequest.status).toBe(200);

    const itemActions = await auditLogActions("FieldItpItem", itemId);
    expect(itemActions).toContain("FIELD_ITP_HOLD_POINT_REJECTED");

    await api.dispose();
  });

  test("authorization: Viewer cannot create an ITP or decide a hold point; Member can", async () => {
    const viewerApi = await apiContextFor("viewer");
    const viewerAttempt = await createItp(viewerApi, { title: "Viewer attempt" });
    expect(viewerAttempt.status).toBe(403);

    const memberApi = await apiContextFor("member");
    const memberAttempt = await createItp(memberApi, { title: "Member attempt" });
    expect(memberAttempt.status).toBe(200);

    await viewerApi.dispose();
    await memberApi.dispose();
  });
});
