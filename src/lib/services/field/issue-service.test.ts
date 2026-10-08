import { describe, expect, it } from "vitest";
import { canTransitionIssueStatus } from "@/lib/services/field/issue-service";

const ACTOR = "user-acting";
const RESPONSIBLE = "user-responsible";

describe("canTransitionIssueStatus", () => {
  it("allows the first forward step from OPEN to ASSIGNED", () => {
    const result = canTransitionIssueStatus({
      existing: { status: "OPEN", responsibleUserId: null },
      to: "ASSIGNED",
      actingUserId: ACTOR,
    });
    expect(result.allowed).toBe(true);
  });

  it("rejects skipping ahead past intermediate stages", () => {
    const result = canTransitionIssueStatus({
      existing: { status: "IN_PROGRESS", responsibleUserId: RESPONSIBLE },
      to: "CLOSED",
      actingUserId: ACTOR,
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/must move to/);
  });

  it("rejects the exact FIELD-001 regression: IN_PROGRESS straight to CLOSED", () => {
    const result = canTransitionIssueStatus({
      existing: { status: "IN_PROGRESS", responsibleUserId: RESPONSIBLE },
      to: "CLOSED",
      actingUserId: RESPONSIBLE,
    });
    expect(result.allowed).toBe(false);
  });

  it("rejects moving backward to an earlier stage", () => {
    const result = canTransitionIssueStatus({
      existing: { status: "WORK_DONE", responsibleUserId: RESPONSIBLE },
      to: "IN_PROGRESS",
      actingUserId: ACTOR,
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/cannot move backward/);
  });

  it("allows reopening a CLOSED issue backward to IN_PROGRESS", () => {
    const result = canTransitionIssueStatus({
      existing: { status: "CLOSED", responsibleUserId: RESPONSIBLE },
      to: "IN_PROGRESS",
      actingUserId: ACTOR,
    });
    expect(result.allowed).toBe(true);
  });

  it("rejects the responsible person verifying their own issue", () => {
    const result = canTransitionIssueStatus({
      existing: { status: "READY_FOR_VERIFICATION", responsibleUserId: RESPONSIBLE },
      to: "VERIFIED",
      actingUserId: RESPONSIBLE,
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/cannot verify their own/);
  });

  it("allows an independent user to verify", () => {
    const result = canTransitionIssueStatus({
      existing: { status: "READY_FOR_VERIFICATION", responsibleUserId: RESPONSIBLE },
      to: "VERIFIED",
      actingUserId: ACTOR,
    });
    expect(result.allowed).toBe(true);
  });

  it("allows REJECTED only from READY_FOR_VERIFICATION", () => {
    const fromReady = canTransitionIssueStatus({
      existing: { status: "READY_FOR_VERIFICATION", responsibleUserId: RESPONSIBLE },
      to: "REJECTED",
      actingUserId: ACTOR,
    });
    expect(fromReady.allowed).toBe(true);

    const fromOpen = canTransitionIssueStatus({
      existing: { status: "OPEN", responsibleUserId: null },
      to: "REJECTED",
      actingUserId: ACTOR,
    });
    expect(fromOpen.allowed).toBe(false);
  });

  it("allows REJECTED to flow back into IN_PROGRESS", () => {
    const result = canTransitionIssueStatus({
      existing: { status: "REJECTED", responsibleUserId: RESPONSIBLE },
      to: "IN_PROGRESS",
      actingUserId: ACTOR,
    });
    expect(result.allowed).toBe(true);
  });

  it("rejects an invalid/unknown target status", () => {
    const result = canTransitionIssueStatus({
      existing: { status: "OPEN", responsibleUserId: null },
      to: "NOT_A_REAL_STATUS" as never,
      actingUserId: ACTOR,
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/Invalid status/);
  });
});
