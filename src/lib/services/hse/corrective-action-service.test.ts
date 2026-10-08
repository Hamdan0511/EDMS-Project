import { afterEach, describe, expect, it, vi } from "vitest";

const findFirst = vi.fn();
const update = vi.fn();
const auditCreate = vi.fn().mockResolvedValue(undefined);

vi.mock("@/lib/prisma", () => ({
  prisma: {
    hseCorrectiveAction: { findFirst: (...a: unknown[]) => findFirst(...a), update: (...a: unknown[]) => update(...a) },
    auditLog: { create: (...a: unknown[]) => auditCreate(...a) },
  },
}));
vi.mock("@/lib/auth/permissions", () => ({
  requirePermission: vi.fn().mockResolvedValue(undefined),
}));

const { updateCorrectiveActionStatus, CorrectiveActionError } = await import("@/lib/services/hse/corrective-action-service");

afterEach(() => {
  findFirst.mockReset();
  update.mockReset();
  auditCreate.mockClear();
});

const BASE_PARAMS = { id: "act-1", projectId: "project-1" };
const ASSIGNEE = "user-assignee";
const OTHER_USER = "user-other";

describe("updateCorrectiveActionStatus", () => {
  it("rejects skipping ahead from OPEN straight to VERIFIED", async () => {
    findFirst.mockResolvedValue({ id: "act-1", status: "OPEN", assignedToId: ASSIGNEE });
    await expect(
      updateCorrectiveActionStatus({ ...BASE_PARAMS, actingUserId: OTHER_USER, status: "VERIFIED" }),
    ).rejects.toThrow(CorrectiveActionError);
    expect(update).not.toHaveBeenCalled();
  });

  it("rejects the assignee verifying their own corrective action", async () => {
    findFirst.mockResolvedValue({ id: "act-1", status: "PENDING_VERIFICATION", assignedToId: ASSIGNEE });
    await expect(
      updateCorrectiveActionStatus({ ...BASE_PARAMS, actingUserId: ASSIGNEE, status: "VERIFIED" }),
    ).rejects.toThrow(/cannot verify their own/);
    expect(update).not.toHaveBeenCalled();
  });

  it("allows an independent user to verify a completed action", async () => {
    findFirst.mockResolvedValue({ id: "act-1", status: "PENDING_VERIFICATION", assignedToId: ASSIGNEE, completedAt: new Date() });
    update.mockResolvedValue({ id: "act-1", status: "VERIFIED" });
    await updateCorrectiveActionStatus({ ...BASE_PARAMS, actingUserId: OTHER_USER, status: "VERIFIED" });
    expect(update).toHaveBeenCalledTimes(1);
    const data = update.mock.calls[0][0].data;
    expect(data.status).toBe("VERIFIED");
    expect(data.verifiedById).toBe(OTHER_USER);
  });

  it("stamps completedAt the first time an action reaches PENDING_VERIFICATION", async () => {
    findFirst.mockResolvedValue({ id: "act-1", status: "IN_PROGRESS", assignedToId: ASSIGNEE, completedAt: null });
    update.mockResolvedValue({ id: "act-1", status: "PENDING_VERIFICATION" });
    await updateCorrectiveActionStatus({ ...BASE_PARAMS, actingUserId: ASSIGNEE, status: "PENDING_VERIFICATION" });
    const data = update.mock.calls[0][0].data;
    expect(data.completedAt).toBeInstanceOf(Date);
  });

  it("allows reopening a CLOSED action backward", async () => {
    findFirst.mockResolvedValue({ id: "act-1", status: "CLOSED", assignedToId: ASSIGNEE });
    update.mockResolvedValue({ id: "act-1", status: "IN_PROGRESS" });
    await updateCorrectiveActionStatus({ ...BASE_PARAMS, actingUserId: ASSIGNEE, status: "IN_PROGRESS" });
    expect(update).toHaveBeenCalledTimes(1);
  });

  it("throws when the corrective action does not exist in this project", async () => {
    findFirst.mockResolvedValue(null);
    await expect(
      updateCorrectiveActionStatus({ ...BASE_PARAMS, actingUserId: ASSIGNEE, status: "IN_PROGRESS" }),
    ).rejects.toThrow("Corrective action not found.");
  });
});
