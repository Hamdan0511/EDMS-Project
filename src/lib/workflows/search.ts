import "server-only";
import type { Prisma, WorkflowStatus } from "@prisma/client";
import { WORKFLOW_STATUS_VALUES, parseDateField, type StepStatusKey, type SortKey, type WorkflowSearchParams } from "./search-constants";

export * from "./search-constants";

function parseMultiValues(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

function dateRangeFilter(from: string | undefined, to: string | undefined): { gte?: Date; lte?: Date } | null {
  if (!from && !to) return null;
  const range: { gte?: Date; lte?: Date } = {};
  if (from) range.gte = new Date(`${from}T00:00:00.000Z`);
  if (to) range.lte = new Date(`${to}T23:59:59.999Z`);
  return range;
}

function stepStatusFilter(key: string, now: Date): Prisma.WorkflowStepInstanceWhereInput | null {
  switch (key as StepStatusKey) {
    case "Completed":
      return { status: "COMPLETED" };
    case "Current":
      return { status: "ACTIVE", OR: [{ dueDate: null }, { dueDate: { gte: now } }] };
    case "Forecast":
      return { status: "PENDING" };
    case "Overdue":
      return { status: "ACTIVE", dueDate: { lt: now } };
    case "Skipped":
      return { status: "SKIPPED" };
    case "Terminated":
      return { status: "TERMINATED" };
    default:
      return null;
  }
}

/** Builds the full Workflow search where-clause server-side from every
 * field on the Search Workflows form — every field here maps to a real
 * Prisma condition, never an in-memory/client-side filter. */
export function buildWorkflowSearchWhere(params: {
  projectId: string;
  userId: string;
  search: WorkflowSearchParams;
}): Prisma.WorkflowWhereInput {
  const { projectId, userId, search } = params;
  const filters: Prisma.WorkflowWhereInput[] = [];

  const statusValues = parseMultiValues(search.workflowStatus).filter((v) =>
    WORKFLOW_STATUS_VALUES.includes(v as WorkflowStatus),
  );
  if (statusValues.length > 0) {
    filters.push({ status: { in: statusValues as WorkflowStatus[] } });
  }

  if (search.templateId?.trim()) {
    filters.push({ templateId: search.templateId.trim() });
  }
  if (search.workflowNo?.trim()) {
    filters.push({ workflowNumber: { contains: search.workflowNo.trim(), mode: "insensitive" } });
  }
  if (search.initiator?.trim()) {
    filters.push({ initiatedBy: { name: { contains: search.initiator.trim(), mode: "insensitive" } } });
  }
  if (search.workflowName?.trim()) {
    filters.push({ title: { contains: search.workflowName.trim(), mode: "insensitive" } });
  }

  const dateField = parseDateField(search.dateField);
  const range = dateRangeFilter(search.dateFrom, search.dateTo);
  if (range) {
    if (dateField === "completed") filters.push({ completedAt: range });
    else if (dateField === "in") filters.push({ createdAt: range });
    else if (dateField === "original") filters.push({ originalDueDate: range });
    else filters.push({ steps: { some: { status: "ACTIVE", dueDate: range } } });
  }

  if (search.superSearch?.trim()) {
    const q = search.superSearch.trim();
    filters.push({
      OR: [
        { workflowNumber: { contains: q, mode: "insensitive" } },
        { title: { contains: q, mode: "insensitive" } },
        { initiatedBy: { name: { contains: q, mode: "insensitive" } } },
        { documents: { some: { document: { documentNo: { contains: q, mode: "insensitive" } } } } },
      ],
    });
  }

  const now = new Date();
  const stepStatusValues = parseMultiValues(search.stepStatus);
  if (stepStatusValues.length > 0) {
    const stepFilters = stepStatusValues.map((k) => stepStatusFilter(k, now)).filter((f): f is Prisma.WorkflowStepInstanceWhereInput => f !== null);
    if (stepFilters.length > 0) {
      filters.push({ steps: { some: { OR: stepFilters } } });
    }
  }

  if (search.stepOutcome?.trim()) {
    filters.push({ steps: { some: { outcomeCode: search.stepOutcome.trim() } } });
  }
  if (search.documentNo?.trim()) {
    filters.push({ documents: { some: { document: { documentNo: { contains: search.documentNo.trim(), mode: "insensitive" } } } } });
  }
  if (search.assignedTo?.trim()) {
    filters.push({ steps: { some: { reviewers: { some: { user: { name: { contains: search.assignedTo.trim(), mode: "insensitive" } } } } } } });
  }
  if (search.myTasksOnly === "1") {
    filters.push({ steps: { some: { status: "ACTIVE", reviewers: { some: { userId, reviewedAt: null } } } } });
  }

  return filters.length > 0 ? { projectId, AND: filters } : { projectId };
}

export function buildOrderBy(sort: SortKey): Prisma.WorkflowOrderByWithRelationInput {
  switch (sort) {
    case "dateIn":
      return { createdAt: "desc" };
    case "dateCompleted":
      return { completedAt: "desc" };
    case "workflowNo":
      return { workflowNumber: "asc" };
    case "workflowName":
      return { title: "asc" };
    case "dateDue":
    default:
      // No direct scalar column for "current step's due date" to sort on at
      // the DB level without a denormalized field; falls back to most
      // recently updated (which changes exactly when a step transitions),
      // the closest real proxy — actual per-row due dates are still shown
      // and remain filterable via the Date Range field above.
      return { updatedAt: "desc" };
  }
}
