import type { WorkflowStatus, WorkflowStepInstanceStatus } from "@prisma/client";

export const WORKFLOW_STATUS_LABELS: Record<WorkflowStatus, string> = {
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  REJECTED: "Rejected",
  TERMINATED: "Terminated",
};

export const WORKFLOW_STATUS_BADGE_CLASSES: Record<WorkflowStatus, string> = {
  IN_PROGRESS: "bg-amber-100 text-amber-800",
  COMPLETED: "bg-emerald-100 text-emerald-800",
  REJECTED: "bg-red-100 text-red-800",
  TERMINATED: "bg-gray-200 text-gray-700",
};

export const WORKFLOW_STEP_STATUS_LABELS: Record<WorkflowStepInstanceStatus, string> = {
  PENDING: "Pending",
  ACTIVE: "Active",
  COMPLETED: "Completed",
  SKIPPED: "Skipped",
  TERMINATED: "Terminated",
};

export const WORKFLOW_STEP_STATUS_BADGE_CLASSES: Record<WorkflowStepInstanceStatus, string> = {
  PENDING: "bg-gray-200 text-gray-700",
  ACTIVE: "bg-amber-100 text-amber-800",
  COMPLETED: "bg-emerald-100 text-emerald-800",
  SKIPPED: "bg-gray-200 text-gray-700",
  TERMINATED: "bg-gray-200 text-gray-700",
};
