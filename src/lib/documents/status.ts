import type { DocumentStatus, DocumentReviewStatus } from "@prisma/client";

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
  { value: "NO_LONGER_IN_USE", label: "No Longer in Use" },
  { value: "FOR_ACTION", label: "For Action" },
  { value: "FOR_INFORMATION", label: "For Information" },
  { value: "NO_OBJECTION", label: "No Objection" },
  { value: "NO_OBJECTION_WITH_COMMENTS", label: "No Objection With Comments" },
  { value: "NO_STATUS", label: "No Status" },
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
  NO_LONGER_IN_USE: "bg-gray-200 text-gray-700",
  FOR_ACTION: "bg-amber-100 text-amber-800",
  FOR_INFORMATION: "bg-brand-100 text-brand-800",
  NO_OBJECTION: "bg-emerald-100 text-emerald-800",
  NO_OBJECTION_WITH_COMMENTS: "bg-emerald-100 text-emerald-800",
  NO_STATUS: "bg-gray-200 text-gray-700",
};

export function isDocumentStatus(value: string): value is DocumentStatus {
  return DOCUMENT_STATUS_OPTIONS.some((o) => o.value === value);
}

/** Reviewer's disposition on the current revision — distinct from the
 * document's own lifecycle `status` above. Null/absent means "None". */
export const DOCUMENT_REVIEW_STATUS_OPTIONS: { value: DocumentReviewStatus; label: string }[] = [
  { value: "A_NO_OBJECTION", label: "A - No Objection" },
  { value: "B_NO_OBJECTION_WITH_COMMENTS", label: "B - No Objection With Comments" },
  { value: "C_REVISE_RESUBMIT", label: "C - Correction, Revise & Resubmit" },
];

export const DOCUMENT_REVIEW_STATUS_LABELS: Record<DocumentReviewStatus, string> = DOCUMENT_REVIEW_STATUS_OPTIONS.reduce(
  (acc, o) => ({ ...acc, [o.value]: o.label }),
  {} as Record<DocumentReviewStatus, string>,
);

export function isDocumentReviewStatus(value: string): value is DocumentReviewStatus {
  return DOCUMENT_REVIEW_STATUS_OPTIONS.some((o) => o.value === value);
}

/** Sentinel filter value meaning "documents with no Document Type set" —
 * used by the Drawings Type multi-select alongside real DocumentType ids. */
export const NO_DOCUMENT_TYPE_VALUE = "__none__";
