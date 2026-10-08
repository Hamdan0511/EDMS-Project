import { afterEach, describe, expect, it, vi } from "vitest";

const findFirst = vi.fn();
const update = vi.fn();
const auditCreate = vi.fn().mockResolvedValue(undefined);

vi.mock("@/lib/prisma", () => ({
  prisma: {
    fieldObservation: { findFirst: (...a: unknown[]) => findFirst(...a), update: (...a: unknown[]) => update(...a) },
    auditLog: { create: (...a: unknown[]) => auditCreate(...a) },
  },
}));
vi.mock("@/lib/auth/permissions", () => ({
  requirePermission: vi.fn().mockResolvedValue(undefined),
}));

const { updateObservationStatus, ObservationError } = await import("@/lib/services/field/observation-service");

afterEach(() => {
  findFirst.mockReset();
  update.mockReset();
  auditCreate.mockClear();
});

const BASE_PARAMS = { id: "obs-1", projectId: "project-1", actingUserId: "user-1" };

describe("updateObservationStatus", () => {
  it("rejects skipping ahead from OPEN straight to CLOSED", async () => {
    findFirst.mockResolvedValue({ id: "obs-1", status: "OPEN" });
    await expect(updateObservationStatus({ ...BASE_PARAMS, status: "CLOSED" })).rejects.toThrow(ObservationError);
    await expect(updateObservationStatus({ ...BASE_PARAMS, status: "CLOSED" })).rejects.toThrow(/must move to/);
    expect(update).not.toHaveBeenCalled();
  });

  it("rejects moving backward to an earlier stage", async () => {
    findFirst.mockResolvedValue({ id: "obs-1", status: "RESOLVED" });
    await expect(updateObservationStatus({ ...BASE_PARAMS, status: "ASSIGNED" })).rejects.toThrow(/cannot move backward/);
    expect(update).not.toHaveBeenCalled();
  });

  it("allows the single next forward step", async () => {
    findFirst.mockResolvedValue({ id: "obs-1", status: "OPEN" });
    update.mockResolvedValue({ id: "obs-1", status: "ASSIGNED" });
    await updateObservationStatus({ ...BASE_PARAMS, status: "ASSIGNED" });
    expect(update).toHaveBeenCalledTimes(1);
    expect(update.mock.calls[0][0].data.status).toBe("ASSIGNED");
  });

  it("allows reopening a CLOSED observation backward", async () => {
    findFirst.mockResolvedValue({ id: "obs-1", status: "CLOSED" });
    update.mockResolvedValue({ id: "obs-1", status: "IN_PROGRESS" });
    await updateObservationStatus({ ...BASE_PARAMS, status: "IN_PROGRESS" });
    expect(update).toHaveBeenCalledTimes(1);
  });

  it("logs an audit entry recording the from/to transition on success", async () => {
    findFirst.mockResolvedValue({ id: "obs-1", status: "OPEN" });
    update.mockResolvedValue({ id: "obs-1", status: "ASSIGNED" });
    await updateObservationStatus({ ...BASE_PARAMS, status: "ASSIGNED" });
    expect(auditCreate).toHaveBeenCalledTimes(1);
    expect(auditCreate.mock.calls[0][0].data.metadata).toEqual({ from: "OPEN", to: "ASSIGNED" });
  });

  it("throws when the observation does not exist in this project", async () => {
    findFirst.mockResolvedValue(null);
    await expect(updateObservationStatus({ ...BASE_PARAMS, status: "ASSIGNED" })).rejects.toThrow("Observation not found.");
  });
});
