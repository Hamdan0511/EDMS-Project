import { describe, expect, it } from "vitest";
import { canTransitionPunchItemStatus } from "@/lib/services/field/punch-service";

const ACTOR = "user-acting";
const RESPONSIBLE = "user-responsible";

describe("canTransitionPunchItemStatus", () => {
  it("allows the first forward step from OPEN to ASSIGNED", () => {
    const result = canTransitionPunchItemStatus({
      existing: { status: "OPEN", responsibleUserId: null },
      to: "ASSIGNED",
      actingUserId: ACTOR,
    });
    expect(result.allowed).toBe(true);
  });

  it("rejects skipping ahead from OPEN straight to CLOSED", () => {
    const result = canTransitionPunchItemStatus({
      existing: { status: "OPEN", responsibleUserId: null },
      to: "CLOSED",
      actingUserId: ACTOR,
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/must move to/);
  });

  it("rejects moving backward to an earlier stage", () => {
    const result = canTransitionPunchItemStatus({
      existing: { status: "WORK_DONE", responsibleUserId: RESPONSIBLE },
      to: "ASSIGNED",
      actingUserId: ACTOR,
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/cannot move backward/);
  });

  it("allows reopening a CLOSED punch item backward to IN_PROGRESS", () => {
    const result = canTransitionPunchItemStatus({
      existing: { status: "CLOSED", responsibleUserId: RESPONSIBLE },
      to: "IN_PROGRESS",
      actingUserId: ACTOR,
    });
    expect(result.allowed).toBe(true);
  });

  it("rejects the responsible person verifying their own punch item", () => {
    const result = canTransitionPunchItemStatus({
      existing: { status: "READY_FOR_VERIFICATION", responsibleUserId: RESPONSIBLE },
      to: "VERIFIED",
      actingUserId: RESPONSIBLE,
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/cannot verify their own/);
  });

  it("allows an independent user to verify", () => {
    const result = canTransitionPunchItemStatus({
      existing: { status: "READY_FOR_VERIFICATION", responsibleUserId: RESPONSIBLE },
      to: "VERIFIED",
      actingUserId: ACTOR,
    });
    expect(result.allowed).toBe(true);
  });

  it("allows REWORK_REQUIRED only from READY_FOR_VERIFICATION", () => {
    const fromReady = canTransitionPunchItemStatus({
      existing: { status: "READY_FOR_VERIFICATION", responsibleUserId: RESPONSIBLE },
      to: "REWORK_REQUIRED",
      actingUserId: ACTOR,
    });
    expect(fromReady.allowed).toBe(true);

    const fromOpen = canTransitionPunchItemStatus({
      existing: { status: "OPEN", responsibleUserId: null },
      to: "REWORK_REQUIRED",
      actingUserId: ACTOR,
    });
    expect(fromOpen.allowed).toBe(false);
  });

  it("allows REWORK_REQUIRED to flow back into IN_PROGRESS", () => {
    const result = canTransitionPunchItemStatus({
      existing: { status: "REWORK_REQUIRED", responsibleUserId: RESPONSIBLE },
      to: "IN_PROGRESS",
      actingUserId: ACTOR,
    });
    expect(result.allowed).toBe(true);
  });

  it("rejects an invalid/unknown target status", () => {
    const result = canTransitionPunchItemStatus({
      existing: { status: "OPEN", responsibleUserId: null },
      to: "NOT_A_REAL_STATUS" as never,
      actingUserId: ACTOR,
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/Invalid status/);
  });
});
