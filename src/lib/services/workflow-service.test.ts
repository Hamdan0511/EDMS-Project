import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * submitStepReview is the single most complex piece of business logic in
 * this codebase: completion rules (ALL_REVIEWERS/ANY_REVIEWER/
 * REJECT_ON_ANY_REJECTION), "worst outcome wins" severity ranking when
 * reviewers disagree, and outcome rules (FINAL_STEP_OUTCOME vs
 * LOWEST_OF_ALL_STEP_OUTCOMES) are all exercised here against a small,
 * mutable in-memory fake of the rows a real $transaction would read/write —
 * not a re-implementation of Prisma's query engine, just enough state to
 * prove the real function's branching is correct.
 */

const OUTCOME_OPTIONS = [
  { projectId: "p1", code: "A", severityRank: 1, isRejection: false },
  { projectId: "p1", code: "B", severityRank: 2, isRejection: false },
  { projectId: "p1", code: "C", severityRank: 3, isRejection: true },
  { projectId: "p1", code: "D", severityRank: 4, isRejection: true },
];

type MockState = {
  workflow: { id: string; projectId: string; status: string; outcomeRule: string; finalOutcomeCode: string | null };
  steps: { id: string; workflowId: string; groupNo: number; status: string; completionRule: string; commentsRequired: boolean; outcomeCode: string | null; name: string; durationDays: number }[];
  reviewers: { id: string; stepInstanceId: string; userId: string; outcomeCode: string | null; comments: string | null; reviewedAt: Date | null }[];
};

function buildMockPrisma(state: MockState) {
  const tx = {
    workflowStepReviewer: {
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const row = state.reviewers.find((r) => r.id === where.id)!;
        Object.assign(row, data);
        return row;
      }),
      findMany: vi.fn(async ({ where }: { where: { stepInstanceId: string } }) =>
        state.reviewers.filter((r) => r.stepInstanceId === where.stepInstanceId),
      ),
    },
    workflowOutcomeOption: {
      findMany: vi.fn(async () => OUTCOME_OPTIONS),
    },
    workflowStepInstance: {
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const row = state.steps.find((s) => s.id === where.id)!;
        Object.assign(row, data);
        return row;
      }),
      updateMany: vi.fn(async ({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
        const statusIn = (where.status as { in: string[] } | undefined)?.in;
        const excludeId = (where.id as { not: string } | undefined)?.not;
        let count = 0;
        for (const s of state.steps) {
          if (s.workflowId !== where.workflowId) continue;
          if (excludeId && s.id === excludeId) continue;
          if (statusIn && !statusIn.includes(s.status)) continue;
          Object.assign(s, data);
          count++;
        }
        return { count };
      }),
      findMany: vi.fn(async ({ where }: { where: Record<string, unknown> }) => {
        return state.steps.filter((s) => {
          if (s.workflowId !== where.workflowId) return false;
          if (where.groupNo !== undefined && typeof where.groupNo === "number" && s.groupNo !== where.groupNo) return false;
          if (where.groupNo && typeof where.groupNo === "object" && "gt" in (where.groupNo as object)) {
            if (!(s.groupNo > (where.groupNo as { gt: number }).gt)) return false;
          }
          if (where.status !== undefined && s.status !== where.status) return false;
          return true;
        });
      }),
    },
    workflow: {
      update: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        Object.assign(state.workflow, data);
        return state.workflow;
      }),
    },
    workflowEvent: {
      create: vi.fn(async () => ({})),
    },
  };

  return {
    _state: state,
    workflow: { findFirst: vi.fn(async () => state.workflow), findUniqueOrThrow: vi.fn(async () => state.workflow) },
    workflowStepInstance: {
      findFirst: vi.fn(async ({ where }: { where: { id: string } }) => {
        const step = state.steps.find((s) => s.id === where.id);
        if (!step) return null;
        return { ...step, reviewers: state.reviewers.filter((r) => r.stepInstanceId === step.id) };
      }),
    },
    workflowOutcomeOption: {
      findUnique: vi.fn(async ({ where }: { where: { projectId_code: { projectId: string; code: string } } }) =>
        OUTCOME_OPTIONS.find((o) => o.code === where.projectId_code.code) ?? null,
      ),
    },
    auditLog: { create: vi.fn(async () => ({})) },
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(tx)),
  };
}

let mockPrisma: ReturnType<typeof buildMockPrisma>;

vi.mock("@/lib/prisma", () => ({
  get prisma() {
    return mockPrisma;
  },
}));

const { submitStepReview } = await import("@/lib/services/workflow-service");

afterEach(() => {
  vi.clearAllMocks();
});

const BASE = { workflowId: "wf-1", stepInstanceId: "step-1", projectId: "p1", userId: "reviewer-1" };

describe("submitStepReview — completion rules", () => {
  it("rejects a user who is not a reviewer on this step", async () => {
    mockPrisma = buildMockPrisma({
      workflow: { id: "wf-1", projectId: "p1", status: "IN_PROGRESS", outcomeRule: "FINAL_STEP_OUTCOME", finalOutcomeCode: null },
      steps: [{ id: "step-1", workflowId: "wf-1", groupNo: 1, status: "ACTIVE", completionRule: "ALL_REVIEWERS", commentsRequired: false, outcomeCode: null, name: "Review", durationDays: 5 }],
      reviewers: [{ id: "rv-1", stepInstanceId: "step-1", userId: "someone-else", outcomeCode: null, comments: null, reviewedAt: null }],
    });
    await expect(submitStepReview({ ...BASE, outcomeCode: "A" })).rejects.toThrow(/not a reviewer/);
  });

  it("rejects submitting a review twice", async () => {
    mockPrisma = buildMockPrisma({
      workflow: { id: "wf-1", projectId: "p1", status: "IN_PROGRESS", outcomeRule: "FINAL_STEP_OUTCOME", finalOutcomeCode: null },
      steps: [{ id: "step-1", workflowId: "wf-1", groupNo: 1, status: "ACTIVE", completionRule: "ALL_REVIEWERS", commentsRequired: false, outcomeCode: null, name: "Review", durationDays: 5 }],
      reviewers: [{ id: "rv-1", stepInstanceId: "step-1", userId: "reviewer-1", outcomeCode: "A", comments: null, reviewedAt: new Date() }],
    });
    await expect(submitStepReview({ ...BASE, outcomeCode: "A" })).rejects.toThrow(/already submitted/);
  });

  it("ALL_REVIEWERS: does not complete the step until every reviewer has submitted", async () => {
    mockPrisma = buildMockPrisma({
      workflow: { id: "wf-1", projectId: "p1", status: "IN_PROGRESS", outcomeRule: "FINAL_STEP_OUTCOME", finalOutcomeCode: null },
      steps: [{ id: "step-1", workflowId: "wf-1", groupNo: 1, status: "ACTIVE", completionRule: "ALL_REVIEWERS", commentsRequired: false, outcomeCode: null, name: "Review", durationDays: 5 }],
      reviewers: [
        { id: "rv-1", stepInstanceId: "step-1", userId: "reviewer-1", outcomeCode: null, comments: null, reviewedAt: null },
        { id: "rv-2", stepInstanceId: "step-1", userId: "reviewer-2", outcomeCode: null, comments: null, reviewedAt: null },
      ],
    });
    const result = await submitStepReview({ ...BASE, outcomeCode: "A" });
    expect(result.stepCompleted).toBe(false);
    expect(result.workflowCompleted).toBe(false);
  });

  it("ANY_REVIEWER: completes as soon as the first reviewer submits", async () => {
    mockPrisma = buildMockPrisma({
      workflow: { id: "wf-1", projectId: "p1", status: "IN_PROGRESS", outcomeRule: "FINAL_STEP_OUTCOME", finalOutcomeCode: null },
      steps: [{ id: "step-1", workflowId: "wf-1", groupNo: 1, status: "ACTIVE", completionRule: "ANY_REVIEWER", commentsRequired: false, outcomeCode: null, name: "Review", durationDays: 5 }],
      reviewers: [
        { id: "rv-1", stepInstanceId: "step-1", userId: "reviewer-1", outcomeCode: null, comments: null, reviewedAt: null },
        { id: "rv-2", stepInstanceId: "step-1", userId: "reviewer-2", outcomeCode: null, comments: null, reviewedAt: null },
      ],
    });
    const result = await submitStepReview({ ...BASE, outcomeCode: "A" });
    expect(result.stepCompleted).toBe(true);
    expect(result.workflowCompleted).toBe(true);
  });

  it("worst outcome wins: the step's recorded outcome is the most severe among disagreeing reviewers", async () => {
    mockPrisma = buildMockPrisma({
      workflow: { id: "wf-1", projectId: "p1", status: "IN_PROGRESS", outcomeRule: "FINAL_STEP_OUTCOME", finalOutcomeCode: null },
      steps: [{ id: "step-1", workflowId: "wf-1", groupNo: 1, status: "ACTIVE", completionRule: "ALL_REVIEWERS", commentsRequired: false, outcomeCode: null, name: "Review", durationDays: 5 }],
      reviewers: [
        { id: "rv-1", stepInstanceId: "step-1", userId: "reviewer-1", outcomeCode: null, comments: null, reviewedAt: null },
        { id: "rv-2", stepInstanceId: "step-1", userId: "reviewer-2", outcomeCode: "B", comments: null, reviewedAt: new Date() },
      ],
    });
    // reviewer-1 submits "A" (less severe) after reviewer-2 already submitted "B" (more severe, same non-rejection group)
    await submitStepReview({ ...BASE, outcomeCode: "A" });
    expect(mockPrisma._state.steps[0].outcomeCode).toBe("B");
  });
});

describe("submitStepReview — outcome rules", () => {
  it("LOWEST_OF_ALL_STEP_OUTCOMES: a rejecting outcome on an early step immediately rejects the workflow and skips remaining steps", async () => {
    mockPrisma = buildMockPrisma({
      workflow: { id: "wf-1", projectId: "p1", status: "IN_PROGRESS", outcomeRule: "LOWEST_OF_ALL_STEP_OUTCOMES", finalOutcomeCode: null },
      steps: [
        { id: "step-1", workflowId: "wf-1", groupNo: 1, status: "ACTIVE", completionRule: "ALL_REVIEWERS", commentsRequired: false, outcomeCode: null, name: "Step 1", durationDays: 5 },
        { id: "step-2", workflowId: "wf-1", groupNo: 2, status: "PENDING", completionRule: "ALL_REVIEWERS", commentsRequired: false, outcomeCode: null, name: "Step 2", durationDays: 5 },
      ],
      reviewers: [{ id: "rv-1", stepInstanceId: "step-1", userId: "reviewer-1", outcomeCode: null, comments: null, reviewedAt: null }],
    });
    const result = await submitStepReview({ ...BASE, outcomeCode: "D" });
    expect(result.stepCompleted).toBe(true);
    expect(result.workflowCompleted).toBe(true);
    expect(mockPrisma._state.workflow.status).toBe("REJECTED");
    expect(mockPrisma._state.workflow.finalOutcomeCode).toBe("D");
    expect(mockPrisma._state.steps.find((s) => s.id === "step-2")!.status).toBe("SKIPPED");
  });

  it("FINAL_STEP_OUTCOME: a non-rejecting outcome completes the workflow as COMPLETED", async () => {
    mockPrisma = buildMockPrisma({
      workflow: { id: "wf-1", projectId: "p1", status: "IN_PROGRESS", outcomeRule: "FINAL_STEP_OUTCOME", finalOutcomeCode: null },
      steps: [{ id: "step-1", workflowId: "wf-1", groupNo: 1, status: "ACTIVE", completionRule: "ALL_REVIEWERS", commentsRequired: false, outcomeCode: null, name: "Step 1", durationDays: 5 }],
      reviewers: [{ id: "rv-1", stepInstanceId: "step-1", userId: "reviewer-1", outcomeCode: null, comments: null, reviewedAt: null }],
    });
    const result = await submitStepReview({ ...BASE, outcomeCode: "A" });
    expect(result.workflowCompleted).toBe(true);
    expect(mockPrisma._state.workflow.status).toBe("COMPLETED");
    expect(mockPrisma._state.workflow.finalOutcomeCode).toBe("A");
  });

  it("a rejecting final outcome completes the workflow as REJECTED, not COMPLETED", async () => {
    mockPrisma = buildMockPrisma({
      workflow: { id: "wf-1", projectId: "p1", status: "IN_PROGRESS", outcomeRule: "FINAL_STEP_OUTCOME", finalOutcomeCode: null },
      steps: [{ id: "step-1", workflowId: "wf-1", groupNo: 1, status: "ACTIVE", completionRule: "ALL_REVIEWERS", commentsRequired: false, outcomeCode: null, name: "Step 1", durationDays: 5 }],
      reviewers: [{ id: "rv-1", stepInstanceId: "step-1", userId: "reviewer-1", outcomeCode: null, comments: null, reviewedAt: null }],
    });
    const result = await submitStepReview({ ...BASE, outcomeCode: "C" });
    expect(result.workflowCompleted).toBe(true);
    expect(mockPrisma._state.workflow.status).toBe("REJECTED");
  });

  it("requires comments when the step mandates them", async () => {
    mockPrisma = buildMockPrisma({
      workflow: { id: "wf-1", projectId: "p1", status: "IN_PROGRESS", outcomeRule: "FINAL_STEP_OUTCOME", finalOutcomeCode: null },
      steps: [{ id: "step-1", workflowId: "wf-1", groupNo: 1, status: "ACTIVE", completionRule: "ALL_REVIEWERS", commentsRequired: true, outcomeCode: null, name: "Step 1", durationDays: 5 }],
      reviewers: [{ id: "rv-1", stepInstanceId: "step-1", userId: "reviewer-1", outcomeCode: null, comments: null, reviewedAt: null }],
    });
    await expect(submitStepReview({ ...BASE, outcomeCode: "A" })).rejects.toThrow(/Comments are required/);
  });
});
