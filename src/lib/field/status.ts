import type { FieldObservationStatus, FieldPriority, FieldInspectionStatus, FieldChecklistResult, FieldIssueStatus, FieldPunchItemStatus, FieldItpStatus, FieldItpItemStatus, FieldInspectionClassification, FieldTestResult } from "@prisma/client";

export const PRIORITY_LABELS: Record<FieldPriority, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  CRITICAL: "Critical",
};
export const PRIORITY_BADGE_CLASSES: Record<FieldPriority, string> = {
  LOW: "bg-emerald-100 text-emerald-800",
  MEDIUM: "bg-amber-100 text-amber-800",
  HIGH: "bg-orange-100 text-orange-800",
  CRITICAL: "bg-red-100 text-red-800",
};

export const OBSERVATION_STATUS_LABELS: Record<FieldObservationStatus, string> = {
  OPEN: "Open",
  ASSIGNED: "Assigned",
  IN_PROGRESS: "In Progress",
  RESOLVED: "Resolved",
  VERIFICATION_REQUIRED: "Verification Required",
  VERIFIED: "Verified",
  CLOSED: "Closed",
};
export const OBSERVATION_STATUS_BADGE_CLASSES: Record<FieldObservationStatus, string> = {
  OPEN: "bg-amber-100 text-amber-800",
  ASSIGNED: "bg-blue-100 text-blue-800",
  IN_PROGRESS: "bg-blue-100 text-blue-800",
  RESOLVED: "bg-emerald-100 text-emerald-800",
  VERIFICATION_REQUIRED: "bg-orange-100 text-orange-800",
  VERIFIED: "bg-emerald-100 text-emerald-800",
  CLOSED: "bg-gray-200 text-gray-700",
};
export const OBSERVATION_STATUS_ORDER: FieldObservationStatus[] = [
  "OPEN",
  "ASSIGNED",
  "IN_PROGRESS",
  "RESOLVED",
  "VERIFICATION_REQUIRED",
  "VERIFIED",
  "CLOSED",
];

export const INSPECTION_STATUS_LABELS: Record<FieldInspectionStatus, string> = {
  DRAFT: "Draft",
  ASSIGNED: "Assigned",
  IN_PROGRESS: "In Progress",
  SUBMITTED: "Submitted",
  PASSED: "Passed",
  FAILED: "Failed",
  CLOSED: "Closed",
};
export const INSPECTION_STATUS_BADGE_CLASSES: Record<FieldInspectionStatus, string> = {
  DRAFT: "bg-gray-200 text-gray-700",
  ASSIGNED: "bg-blue-100 text-blue-800",
  IN_PROGRESS: "bg-blue-100 text-blue-800",
  SUBMITTED: "bg-amber-100 text-amber-800",
  PASSED: "bg-emerald-100 text-emerald-800",
  FAILED: "bg-red-100 text-red-800",
  CLOSED: "bg-gray-200 text-gray-700",
};

export const CHECKLIST_RESULT_LABELS: Record<FieldChecklistResult, string> = {
  PASS: "Pass",
  FAIL: "Fail",
  NA: "N/A",
  YES: "Yes",
  NO: "No",
};
export const CHECKLIST_RESULT_BADGE_CLASSES: Record<FieldChecklistResult, string> = {
  PASS: "bg-emerald-100 text-emerald-800",
  FAIL: "bg-red-100 text-red-800",
  NA: "bg-gray-200 text-gray-700",
  YES: "bg-emerald-100 text-emerald-800",
  NO: "bg-red-100 text-red-800",
};

export const ISSUE_STATUS_LABELS: Record<FieldIssueStatus, string> = {
  OPEN: "Open",
  ASSIGNED: "Assigned",
  IN_PROGRESS: "In Progress",
  WORK_DONE: "Work Done",
  READY_FOR_VERIFICATION: "Ready for Verification",
  REJECTED: "Rejected",
  VERIFIED: "Verified",
  CLOSED: "Closed",
  DISPUTED: "Disputed",
};
export const ISSUE_STATUS_BADGE_CLASSES: Record<FieldIssueStatus, string> = {
  OPEN: "bg-amber-100 text-amber-800",
  ASSIGNED: "bg-blue-100 text-blue-800",
  IN_PROGRESS: "bg-blue-100 text-blue-800",
  WORK_DONE: "bg-orange-100 text-orange-800",
  READY_FOR_VERIFICATION: "bg-orange-100 text-orange-800",
  REJECTED: "bg-red-100 text-red-800",
  VERIFIED: "bg-emerald-100 text-emerald-800",
  CLOSED: "bg-gray-200 text-gray-700",
  DISPUTED: "bg-red-100 text-red-800",
};
/// Forward progression only — REJECTED is a real exception handled
/// separately in the service (sends a READY_FOR_VERIFICATION issue back to
/// IN_PROGRESS), not part of this linear order.
export const ISSUE_STATUS_ORDER: FieldIssueStatus[] = [
  "OPEN",
  "ASSIGNED",
  "IN_PROGRESS",
  "WORK_DONE",
  "READY_FOR_VERIFICATION",
  "VERIFIED",
  "CLOSED",
];

export const PUNCH_ITEM_STATUS_LABELS: Record<FieldPunchItemStatus, string> = {
  OPEN: "Open",
  ASSIGNED: "Assigned",
  IN_PROGRESS: "In Progress",
  WORK_DONE: "Work Done",
  READY_FOR_VERIFICATION: "Ready for Verification",
  REWORK_REQUIRED: "Rework Required",
  VERIFIED: "Verified",
  CLOSED: "Closed",
};
export const PUNCH_ITEM_STATUS_BADGE_CLASSES: Record<FieldPunchItemStatus, string> = {
  OPEN: "bg-amber-100 text-amber-800",
  ASSIGNED: "bg-blue-100 text-blue-800",
  IN_PROGRESS: "bg-blue-100 text-blue-800",
  WORK_DONE: "bg-orange-100 text-orange-800",
  READY_FOR_VERIFICATION: "bg-orange-100 text-orange-800",
  REWORK_REQUIRED: "bg-red-100 text-red-800",
  VERIFIED: "bg-emerald-100 text-emerald-800",
  CLOSED: "bg-gray-200 text-gray-700",
};
export const PUNCH_ITEM_STATUS_ORDER: FieldPunchItemStatus[] = [
  "OPEN",
  "ASSIGNED",
  "IN_PROGRESS",
  "WORK_DONE",
  "READY_FOR_VERIFICATION",
  "VERIFIED",
  "CLOSED",
];

export const ITP_STATUS_LABELS: Record<FieldItpStatus, string> = {
  DRAFT: "Draft",
  PENDING_APPROVAL: "Pending Approval",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  SUPERSEDED: "Superseded",
};
export const ITP_STATUS_BADGE_CLASSES: Record<FieldItpStatus, string> = {
  DRAFT: "bg-gray-200 text-gray-700",
  PENDING_APPROVAL: "bg-amber-100 text-amber-800",
  APPROVED: "bg-emerald-100 text-emerald-800",
  REJECTED: "bg-red-100 text-red-800",
  SUPERSEDED: "bg-gray-200 text-gray-700",
};

export const ITP_CLASSIFICATION_LABELS: Record<FieldInspectionClassification, string> = {
  R: "Review",
  S: "Surveillance",
  W: "Witness",
  H: "Hold Point",
};

export const ITP_ITEM_STATUS_LABELS: Record<FieldItpItemStatus, string> = {
  PENDING: "Pending",
  HOLD_ACTIVE: "Hold Point Active",
  INSPECTION_REQUESTED: "Inspection Requested",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  RELEASED: "Released",
};
export const ITP_ITEM_STATUS_BADGE_CLASSES: Record<FieldItpItemStatus, string> = {
  PENDING: "bg-gray-200 text-gray-700",
  HOLD_ACTIVE: "bg-red-100 text-red-800",
  INSPECTION_REQUESTED: "bg-amber-100 text-amber-800",
  APPROVED: "bg-blue-100 text-blue-800",
  REJECTED: "bg-red-100 text-red-800",
  RELEASED: "bg-emerald-100 text-emerald-800",
};

export const PHOTO_CATEGORIES = ["Progress", "Quality", "Defect", "Inspection", "Before", "After", "General", "Other"] as const;

export const TEST_RESULT_LABELS: Record<FieldTestResult, string> = {
  PASS: "Pass",
  FAIL: "Fail",
  PENDING: "Pending",
  NOT_APPLICABLE: "N/A",
};
export const TEST_RESULT_BADGE_CLASSES: Record<FieldTestResult, string> = {
  PASS: "bg-emerald-100 text-emerald-800",
  FAIL: "bg-red-100 text-red-800",
  PENDING: "bg-amber-100 text-amber-800",
  NOT_APPLICABLE: "bg-gray-200 text-gray-700",
};
