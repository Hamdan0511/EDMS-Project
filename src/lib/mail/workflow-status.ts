import type { MailWorkflowStatus } from "@prisma/client";

export const WORKFLOW_STATUS_LABELS: Record<MailWorkflowStatus, string> = {
  NA: "N/A",
  OUTSTANDING: "Outstanding",
  OVERDUE: "Overdue",
  RESPONDED: "Responded",
  NO_ACTION_REQUIRED: "No Action Required",
  CLOSED_OUT: "Closed-Out",
};

export const WORKFLOW_STATUS_OPTIONS: { value: MailWorkflowStatus; label: string }[] = (
  Object.keys(WORKFLOW_STATUS_LABELS) as MailWorkflowStatus[]
).map((value) => ({ value, label: WORKFLOW_STATUS_LABELS[value] }));
