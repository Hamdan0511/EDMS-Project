import type { DocumentStatus } from "@prisma/client";

export const DOCUMENT_STATUS_OPTIONS: { value: DocumentStatus; label: string }[] = [
  { value: "DRAFT", label: "Draft" },
  { value: "FOR_REVIEW", label: "For Review" },
  { value: "UNDER_REVIEW", label: "Under Review" },
  { value: "APPROVED", label: "Approved" },
  { value: "APPROVED_WITH_COMMENTS", label: "Approved with Comments" },
  { value: "REJECTED", label: "Rejected" },
  { value: "REVISE_RESUBMIT", label: "Revise & Resubmit" },
  { value: "SUPERSEDED", label: "Superseded" },
  { value: "WITHDRAWN", label: "Withdrawn" },
  { value: "CLOSED", label: "Closed" },
];

export const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = DOCUMENT_STATUS_OPTIONS.reduce(
  (acc, o) => ({ ...acc, [o.value]: o.label }),
  {} as Record<DocumentStatus, string>,
);

export const DOCUMENT_STATUS_BADGE_CLASSES: Record<DocumentStatus, string> = {
  DRAFT: "bg-brand-100 text-brand-800",
  FOR_REVIEW: "bg-amber-100 text-amber-800",
  UNDER_REVIEW: "bg-amber-100 text-amber-800",
  APPROVED: "bg-emerald-100 text-emerald-800",
  APPROVED_WITH_COMMENTS: "bg-emerald-100 text-emerald-800",
  REJECTED: "bg-red-100 text-red-800",
  REVISE_RESUBMIT: "bg-red-100 text-red-800",
  SUPERSEDED: "bg-gray-200 text-gray-700",
  WITHDRAWN: "bg-gray-200 text-gray-700",
  CLOSED: "bg-gray-200 text-gray-700",
};

export const DISCIPLINE_OPTIONS = [
  "Architectural",
  "Structural",
  "Civil",
  "Mechanical",
  "Electrical",
  "Plumbing",
  "General",
];

export function isDocumentStatus(value: string): value is DocumentStatus {
  return DOCUMENT_STATUS_OPTIONS.some((o) => o.value === value);
}
