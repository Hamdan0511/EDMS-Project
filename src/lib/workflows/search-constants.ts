import type { WorkflowStatus } from "@prisma/client";

export const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = 25;

export const WORKFLOW_STATUS_VALUES: WorkflowStatus[] = ["IN_PROGRESS", "COMPLETED", "REJECTED", "TERMINATED"];

export const STEP_STATUS_KEYS = ["Completed", "Current", "Forecast", "Overdue", "Skipped", "Terminated"] as const;
export type StepStatusKey = (typeof STEP_STATUS_KEYS)[number];

export const DATE_FIELD_OPTIONS = [
  { value: "completed", label: "Date Completed" },
  { value: "due", label: "Date Due" },
  { value: "in", label: "Date In" },
  { value: "original", label: "Original Due Date" },
] as const;
export type DateFieldKey = (typeof DATE_FIELD_OPTIONS)[number]["value"];

export const SORT_OPTIONS = [
  { value: "dateDue", label: "Date Due" },
  { value: "dateIn", label: "Date In" },
  { value: "dateCompleted", label: "Date Completed" },
  { value: "workflowNo", label: "Workflow No." },
  { value: "workflowName", label: "Workflow Name" },
] as const;
export type SortKey = (typeof SORT_OPTIONS)[number]["value"];

export const GROUP_BY_OPTIONS = [
  { value: "workflowNo", label: "Workflow No." },
  { value: "status", label: "Workflow Status" },
  { value: "template", label: "Template" },
  { value: "none", label: "None" },
] as const;
export type GroupByKey = (typeof GROUP_BY_OPTIONS)[number]["value"];

export type WorkflowSearchParams = {
  searched?: string;
  workflowStatus?: string;
  templateId?: string;
  workflowNo?: string;
  initiator?: string;
  workflowName?: string;
  dateField?: string;
  dateFrom?: string;
  dateTo?: string;
  superSearch?: string;
  stepStatus?: string;
  stepOutcome?: string;
  documentNo?: string;
  assignedTo?: string;
  myTasksOnly?: string;
  groupBy?: string;
  sort?: string;
  pageSize?: string;
  page?: string;
};

export function parsePage(pageParam: string | undefined): number {
  const n = Number(pageParam);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
}

export function parsePageSize(pageSizeParam: string | undefined): number {
  const n = Number(pageSizeParam);
  return (PAGE_SIZE_OPTIONS as readonly number[]).includes(n) ? n : DEFAULT_PAGE_SIZE;
}

export function parseSort(sortParam: string | undefined): SortKey {
  return (SORT_OPTIONS as readonly { value: string }[]).some((o) => o.value === sortParam)
    ? (sortParam as SortKey)
    : "dateDue";
}

export function parseGroupBy(groupByParam: string | undefined): GroupByKey {
  return (GROUP_BY_OPTIONS as readonly { value: string }[]).some((o) => o.value === groupByParam)
    ? (groupByParam as GroupByKey)
    : "workflowNo";
}

export function parseDateField(dateFieldParam: string | undefined): DateFieldKey {
  return (DATE_FIELD_OPTIONS as readonly { value: string }[]).some((o) => o.value === dateFieldParam)
    ? (dateFieldParam as DateFieldKey)
    : "due";
}
