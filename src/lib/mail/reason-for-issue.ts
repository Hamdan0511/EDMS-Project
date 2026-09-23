import type { MailReasonForIssue } from "@prisma/client";

export const REASON_FOR_ISSUE_LABELS: Record<MailReasonForIssue, string> = {
  FOR_APPROVAL: "For Approval",
  FOR_INFORMATION: "For Information",
  FOR_CONSTRUCTION: "For Construction",
  FOR_REVIEW_COMMENT: "For Review & Comment",
  FOR_TENDER: "For Tender",
  FOR_RECORD: "For Record",
  AS_BUILT: "As Built",
  SUPERSEDED: "Superseded",
};

export const REASON_FOR_ISSUE_OPTIONS: { value: MailReasonForIssue; label: string }[] = (
  Object.keys(REASON_FOR_ISSUE_LABELS) as MailReasonForIssue[]
).map((value) => ({ value, label: REASON_FOR_ISSUE_LABELS[value] }));
