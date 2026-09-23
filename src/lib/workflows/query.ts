import "server-only";
import type { Prisma, WorkflowStatus } from "@prisma/client";
import type { WorkflowFilter } from "@/components/workflows/workflow-tabs";

const STATUS_VALUES: WorkflowStatus[] = ["IN_PROGRESS", "COMPLETED", "REJECTED", "TERMINATED"];

export function buildWorkflowWhere(params: {
  projectId: string;
  userId: string;
  filter: string;
  search?: string;
}): Prisma.WorkflowWhereInput {
  const { projectId, userId, filter, search } = params;
  const where: Prisma.WorkflowWhereInput = { projectId };

  if (search) {
    where.title = { contains: search, mode: "insensitive" };
  }

  if (STATUS_VALUES.includes(filter as WorkflowStatus)) {
    where.status = filter as WorkflowStatus;
  } else if (filter === "MY_WORKFLOWS") {
    where.initiatedById = userId;
  } else if (filter === "ASSIGNED_TO_ME") {
    where.status = "IN_PROGRESS";
    where.steps = { some: { status: "ACTIVE", reviewers: { some: { userId } } } };
  } else if (filter === "AWAITING_REVIEW") {
    where.status = "IN_PROGRESS";
    where.steps = { some: { status: "ACTIVE", reviewers: { some: { userId, reviewedAt: null } } } };
  } else if (filter === "OVERDUE") {
    where.status = "IN_PROGRESS";
    where.steps = { some: { status: "ACTIVE", dueDate: { lt: new Date() } } };
  }

  return where;
}

export type { WorkflowFilter };
