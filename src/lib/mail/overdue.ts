import type { MailWorkflowStatus } from "@prisma/client";

/**
 * OVERDUE is computed at read time rather than persisted — there is no
 * scheduled job in this app to flip workflowStatus in the database when a
 * due date passes, and adding one is out of scope for this feature. A mail
 * whose stored workflowStatus is still OUTSTANDING is treated as OVERDUE
 * for display purposes once its response due date is in the past.
 */
export function effectiveWorkflowStatus(mail: {
  workflowStatus: MailWorkflowStatus;
  responseDueDate: Date | null;
}): MailWorkflowStatus {
  if (mail.workflowStatus === "OUTSTANDING" && mail.responseDueDate && mail.responseDueDate.getTime() < Date.now()) {
    return "OVERDUE";
  }
  return mail.workflowStatus;
}
