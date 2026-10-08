import { afterEach, describe, expect, it, vi } from "vitest";

const findFirst = vi.fn();
const update = vi.fn();
const auditCreate = vi.fn().mockResolvedValue(undefined);

vi.mock("@/lib/prisma", () => ({
  prisma: {
    hseEmergencyEvent: { findFirst: (...a: unknown[]) => findFirst(...a), update: (...a: unknown[]) => update(...a) },
    auditLog: { create: (...a: unknown[]) => auditCreate(...a) },
  },
}));
vi.mock("@/lib/auth/permissions", () => ({
  requirePermission: vi.fn().mockResolvedValue(undefined),
}));

const { updateEmergencyEventStatus, EmergencyError } = await import("@/lib/services/hse/emergency-service");

afterEach(() => {
  findFirst.mockReset();
  update.mockReset();
  auditCreate.mockClear();
});

const BASE_PARAMS = { id: "evt-1", projectId: "project-1", actingUserId: "user-1" };

describe("updateEmergencyEventStatus", () => {
  it("rejects skipping ahead from REPORTED straight to CLOSED", async () => {
    findFirst.mockResolvedValue({ id: "evt-1", status: "REPORTED" });
    await expect(updateEmergencyEventStatus({ ...BASE_PARAMS, status: "CLOSED" })).rejects.toThrow(EmergencyError);
    await expect(updateEmergencyEventStatus({ ...BASE_PARAMS, status: "CLOSED" })).rejects.toThrow(/must move to/);
    expect(update).not.toHaveBeenCalled();
  });

  it("rejects moving backward to an earlier stage", async () => {
    findFirst.mockResolvedValue({ id: "evt-1", status: "FOLLOW_UP" });
    await expect(updateEmergencyEventStatus({ ...BASE_PARAMS, status: "RESPONDING" })).rejects.toThrow(/cannot move backward/);
    expect(update).not.toHaveBeenCalled();
  });

  it("allows the single next forward step", async () => {
    findFirst.mockResolvedValue({ id: "evt-1", status: "REPORTED" });
    update.mockResolvedValue({ id: "evt-1", status: "RESPONDING" });
    await updateEmergencyEventStatus({ ...BASE_PARAMS, status: "RESPONDING" });
    expect(update).toHaveBeenCalledTimes(1);
  });

  it("allows reopening a CLOSED event backward", async () => {
    findFirst.mockResolvedValue({ id: "evt-1", status: "CLOSED" });
    update.mockResolvedValue({ id: "evt-1", status: "FOLLOW_UP" });
    await updateEmergencyEventStatus({ ...BASE_PARAMS, status: "FOLLOW_UP" });
    expect(update).toHaveBeenCalledTimes(1);
  });

  it("throws when the emergency event does not exist in this project", async () => {
    findFirst.mockResolvedValue(null);
    await expect(updateEmergencyEventStatus({ ...BASE_PARAMS, status: "RESPONDING" })).rejects.toThrow(
      "Emergency event not found.",
    );
  });

  it("rejects an invalid/unknown target status", async () => {
    findFirst.mockResolvedValue({ id: "evt-1", status: "REPORTED" });
    await expect(updateEmergencyEventStatus({ ...BASE_PARAMS, status: "NOT_REAL" as never })).rejects.toThrow("Invalid status.");
  });
});
