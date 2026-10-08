import { test, expect } from "@playwright/test";
import { apiContextFor, createIncident, transitionIncident } from "../helpers/api";
import { auditLogActions } from "../helpers/db";
import { USERS } from "../constants";

test.use({ storageState: USERS.admin.storageState });

/**
 * Incidents are the one entity in this codebase that deliberately ALLOWS
 * forward-skipping its status lifecycle (see docs/TEST_RESULTS.md's
 * state-machine follow-up — confirmed via a pre-existing code comment and
 * the absence of a verifiedById/verify-permission on this entity). This
 * spec exists specifically to prove that design holds through the real
 * HTTP API, not just the unit test — and that backward movement is still
 * rejected, which is the one rule that *does* still apply.
 */
test.describe("HSE Incidents", () => {
  test("create -> view -> investigation update -> forward-skip allowed -> backward rejected -> final state -> audit trail", async ({
    page,
  }) => {
    const api = await apiContextFor("admin");
    const title = `E2E Incident ${Date.now()}`;

    // Create
    const created = await createIncident(api, { title, description: "Worker reported minor hand injury." });
    expect(created.status).toBe(200);
    const incident = created.body!;

    // View (real UI)
    await page.goto(`/hse/incidents/${incident.id}`);
    await expect(page.getByText(incident.incidentNumber)).toBeVisible();

    // Update (investigation fields, not a status transition)
    const investigationRes = await api.patch(`/api/hse/incidents/${incident.id}`, {
      data: { immediateCause: "Unguarded sharp edge.", rootCause: "Missing edge protection in work method." },
    });
    expect(investigationRes.status()).toBe(200);

    // Lifecycle transition: deliberately skip TRIAGED and UNDER_INVESTIGATION,
    // going straight from REPORTED to CORRECTIVE_ACTION — must be ALLOWED here
    // (unlike every other entity in this codebase).
    const skipAhead = await transitionIncident(api, incident.id, "CORRECTIVE_ACTION");
    expect(skipAhead.status).toBe(200);

    // Invalid transition: backward movement is still rejected even though
    // forward-skipping is allowed — this is the one rule that doesn't relax.
    const backward = await transitionIncident(api, incident.id, "REPORTED");
    expect(backward.status).toBe(400);
    expect(JSON.stringify(backward.body)).toMatch(/cannot move backward/);

    // Final state
    const close = await transitionIncident(api, incident.id, "CLOSED");
    expect(close.status).toBe(200);

    // Audit trail
    const actions = await auditLogActions("HseIncident", incident.id);
    expect(actions).toContain("HSE_INCIDENT_CREATED");
    expect(actions).toContain("HSE_INCIDENT_INVESTIGATION_UPDATED");
    expect(actions.filter((a) => a === "HSE_INCIDENT_STATUS_CHANGED").length).toBeGreaterThanOrEqual(2);

    await api.dispose();
  });

  test("authorization: Viewer cannot report an incident; Member can", async () => {
    const viewerApi = await apiContextFor("viewer");
    const viewerAttempt = await createIncident(viewerApi, { title: "Viewer attempt", description: "Should be rejected." });
    expect(viewerAttempt.status).toBe(403);

    const memberApi = await apiContextFor("member");
    const memberAttempt = await createIncident(memberApi, { title: "Member attempt", description: "Should succeed." });
    expect(memberAttempt.status).toBe(200);

    await viewerApi.dispose();
    await memberApi.dispose();
  });
});
