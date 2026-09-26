import type {
  HseSeverity,
  HseObservationType,
  HseObservationStatus,
  HseIncidentType,
  HseIncidentStatus,
  HseNearMissStatus,
  HseHazardStatus,
  HseRiskAssessmentStatus,
  HseControlHierarchy,
  HseControlStatus,
  HseInspectionStatus,
  HseActionPriority,
  HseCorrectiveActionStatus,
  HsePermitType,
  HsePermitStatus,
  HseEquipmentStatus,
  HseEquipmentInspectionResult,
  HseChecklistResult,
  HseEmergencyProcedureStatus,
  HseEmergencyEventStatus,
  HseEmergencyDrillStatus,
  HseEmergencyDrillResult,
} from "@prisma/client";

export const SEVERITY_LABELS: Record<HseSeverity, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  CRITICAL: "Critical",
};

export const SEVERITY_BADGE_CLASSES: Record<HseSeverity, string> = {
  LOW: "bg-emerald-100 text-emerald-800",
  MEDIUM: "bg-amber-100 text-amber-800",
  HIGH: "bg-orange-100 text-orange-800",
  CRITICAL: "bg-red-100 text-red-800",
};

export const OBSERVATION_TYPE_LABELS: Record<HseObservationType, string> = {
  UNSAFE_ACT: "Unsafe Act",
  UNSAFE_CONDITION: "Unsafe Condition",
  POSITIVE_OBSERVATION: "Positive Observation",
  SAFETY_IMPROVEMENT: "Safety Improvement",
};

export const OBSERVATION_STATUS_LABELS: Record<HseObservationStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  CLOSED: "Closed",
};
export const OBSERVATION_STATUS_BADGE_CLASSES: Record<HseObservationStatus, string> = {
  OPEN: "bg-amber-100 text-amber-800",
  IN_PROGRESS: "bg-blue-100 text-blue-800",
  CLOSED: "bg-emerald-100 text-emerald-800",
};

export const INCIDENT_TYPE_LABELS: Record<HseIncidentType, string> = {
  INJURY: "Injury",
  ILLNESS: "Illness",
  PROPERTY_DAMAGE: "Property Damage",
  ENVIRONMENTAL: "Environmental",
  SECURITY: "Security",
  OTHER: "Other",
};

export const INCIDENT_STATUS_LABELS: Record<HseIncidentStatus, string> = {
  REPORTED: "Reported",
  TRIAGED: "Triaged",
  UNDER_INVESTIGATION: "Under Investigation",
  CORRECTIVE_ACTION: "Corrective Action",
  VERIFICATION: "Verification",
  CLOSED: "Closed",
};
export const INCIDENT_STATUS_BADGE_CLASSES: Record<HseIncidentStatus, string> = {
  REPORTED: "bg-amber-100 text-amber-800",
  TRIAGED: "bg-blue-100 text-blue-800",
  UNDER_INVESTIGATION: "bg-orange-100 text-orange-800",
  CORRECTIVE_ACTION: "bg-blue-100 text-blue-800",
  VERIFICATION: "bg-blue-100 text-blue-800",
  CLOSED: "bg-emerald-100 text-emerald-800",
};
export const INCIDENT_STATUS_ORDER: HseIncidentStatus[] = [
  "REPORTED",
  "TRIAGED",
  "UNDER_INVESTIGATION",
  "CORRECTIVE_ACTION",
  "VERIFICATION",
  "CLOSED",
];

export const NEAR_MISS_STATUS_LABELS: Record<HseNearMissStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  CLOSED: "Closed",
};
export const NEAR_MISS_STATUS_BADGE_CLASSES: Record<HseNearMissStatus, string> = {
  OPEN: "bg-amber-100 text-amber-800",
  IN_PROGRESS: "bg-blue-100 text-blue-800",
  CLOSED: "bg-emerald-100 text-emerald-800",
};

export const HAZARD_STATUS_LABELS: Record<HseHazardStatus, string> = {
  OPEN: "Open",
  CONTROLLED: "Controlled",
  CLOSED: "Closed",
};
export const HAZARD_STATUS_BADGE_CLASSES: Record<HseHazardStatus, string> = {
  OPEN: "bg-amber-100 text-amber-800",
  CONTROLLED: "bg-blue-100 text-blue-800",
  CLOSED: "bg-emerald-100 text-emerald-800",
};

export const RISK_ASSESSMENT_STATUS_LABELS: Record<HseRiskAssessmentStatus, string> = {
  DRAFT: "Draft",
  ACTIVE: "Active",
  UNDER_REVIEW: "Under Review",
  ARCHIVED: "Archived",
};
export const RISK_ASSESSMENT_STATUS_BADGE_CLASSES: Record<HseRiskAssessmentStatus, string> = {
  DRAFT: "bg-gray-200 text-gray-700",
  ACTIVE: "bg-emerald-100 text-emerald-800",
  UNDER_REVIEW: "bg-amber-100 text-amber-800",
  ARCHIVED: "bg-gray-200 text-gray-700",
};

export const CONTROL_HIERARCHY_LABELS: Record<HseControlHierarchy, string> = {
  ELIMINATION: "Elimination",
  SUBSTITUTION: "Substitution",
  ENGINEERING: "Engineering Control",
  ADMINISTRATIVE: "Administrative Control",
  PPE: "PPE",
};

export const CONTROL_STATUS_LABELS: Record<HseControlStatus, string> = {
  PLANNED: "Planned",
  IN_PROGRESS: "In Progress",
  IMPLEMENTED: "Implemented",
  VERIFIED: "Verified",
};
export const CONTROL_STATUS_BADGE_CLASSES: Record<HseControlStatus, string> = {
  PLANNED: "bg-gray-200 text-gray-700",
  IN_PROGRESS: "bg-blue-100 text-blue-800",
  IMPLEMENTED: "bg-amber-100 text-amber-800",
  VERIFIED: "bg-emerald-100 text-emerald-800",
};

export const INSPECTION_STATUS_LABELS: Record<HseInspectionStatus, string> = {
  SCHEDULED: "Scheduled",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
};
export const INSPECTION_STATUS_BADGE_CLASSES: Record<HseInspectionStatus, string> = {
  SCHEDULED: "bg-gray-200 text-gray-700",
  IN_PROGRESS: "bg-blue-100 text-blue-800",
  COMPLETED: "bg-emerald-100 text-emerald-800",
};

export const ACTION_PRIORITY_LABELS: Record<HseActionPriority, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  CRITICAL: "Critical",
};
export const ACTION_PRIORITY_BADGE_CLASSES: Record<HseActionPriority, string> = {
  LOW: "bg-emerald-100 text-emerald-800",
  MEDIUM: "bg-amber-100 text-amber-800",
  HIGH: "bg-orange-100 text-orange-800",
  CRITICAL: "bg-red-100 text-red-800",
};

export const ACTION_STATUS_LABELS: Record<HseCorrectiveActionStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  PENDING_VERIFICATION: "Pending Verification",
  VERIFIED: "Verified",
  CLOSED: "Closed",
};
export const ACTION_STATUS_BADGE_CLASSES: Record<HseCorrectiveActionStatus, string> = {
  OPEN: "bg-amber-100 text-amber-800",
  IN_PROGRESS: "bg-blue-100 text-blue-800",
  PENDING_VERIFICATION: "bg-orange-100 text-orange-800",
  VERIFIED: "bg-emerald-100 text-emerald-800",
  CLOSED: "bg-gray-200 text-gray-700",
};
export const ACTION_STATUS_ORDER: HseCorrectiveActionStatus[] = [
  "OPEN",
  "IN_PROGRESS",
  "PENDING_VERIFICATION",
  "VERIFIED",
  "CLOSED",
];

export const PERMIT_TYPE_LABELS: Record<HsePermitType, string> = {
  HOT_WORK: "Hot Work",
  WORK_AT_HEIGHT: "Work at Height",
  ELECTRICAL: "Electrical Work",
  CONFINED_SPACE: "Confined Space",
  OTHER: "Other",
};

export const PERMIT_STATUS_LABELS: Record<HsePermitStatus, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under Review",
  APPROVED: "Approved",
  ACTIVE: "Active",
  REJECTED: "Rejected",
  SUSPENDED: "Suspended",
  EXPIRED: "Expired",
  CLOSED: "Closed",
};
export const PERMIT_STATUS_BADGE_CLASSES: Record<HsePermitStatus, string> = {
  DRAFT: "bg-gray-200 text-gray-700",
  SUBMITTED: "bg-amber-100 text-amber-800",
  UNDER_REVIEW: "bg-blue-100 text-blue-800",
  APPROVED: "bg-emerald-100 text-emerald-800",
  ACTIVE: "bg-emerald-100 text-emerald-800",
  REJECTED: "bg-red-100 text-red-800",
  SUSPENDED: "bg-orange-100 text-orange-800",
  EXPIRED: "bg-gray-200 text-gray-700",
  CLOSED: "bg-gray-200 text-gray-700",
};

export const EQUIPMENT_STATUS_LABELS: Record<HseEquipmentStatus, string> = {
  AVAILABLE: "Available",
  INSPECTION_DUE: "Inspection Due",
  UNDER_INSPECTION: "Under Inspection",
  PASSED: "Passed",
  FAILED: "Failed",
  OUT_OF_SERVICE: "Out of Service",
  UNDER_REPAIR: "Under Repair",
  RELEASED: "Released",
};
export const EQUIPMENT_STATUS_BADGE_CLASSES: Record<HseEquipmentStatus, string> = {
  AVAILABLE: "bg-emerald-100 text-emerald-800",
  INSPECTION_DUE: "bg-amber-100 text-amber-800",
  UNDER_INSPECTION: "bg-blue-100 text-blue-800",
  PASSED: "bg-emerald-100 text-emerald-800",
  FAILED: "bg-red-100 text-red-800",
  OUT_OF_SERVICE: "bg-red-100 text-red-800",
  UNDER_REPAIR: "bg-orange-100 text-orange-800",
  RELEASED: "bg-emerald-100 text-emerald-800",
};

export const EQUIPMENT_INSPECTION_RESULT_LABELS: Record<HseEquipmentInspectionResult, string> = {
  PASS: "Pass",
  FAIL: "Fail",
};
export const EQUIPMENT_INSPECTION_RESULT_BADGE_CLASSES: Record<HseEquipmentInspectionResult, string> = {
  PASS: "bg-emerald-100 text-emerald-800",
  FAIL: "bg-red-100 text-red-800",
};

export const CHECKLIST_RESULT_LABELS: Record<HseChecklistResult, string> = {
  PASS: "Pass",
  FAIL: "Fail",
  NOT_APPLICABLE: "N/A",
};
export const CHECKLIST_RESULT_BADGE_CLASSES: Record<HseChecklistResult, string> = {
  PASS: "bg-emerald-100 text-emerald-800",
  FAIL: "bg-red-100 text-red-800",
  NOT_APPLICABLE: "bg-gray-200 text-gray-700",
};

export const EMERGENCY_PROCEDURE_STATUS_LABELS: Record<HseEmergencyProcedureStatus, string> = {
  DRAFT: "Draft",
  ACTIVE: "Active",
  ARCHIVED: "Archived",
};
export const EMERGENCY_PROCEDURE_STATUS_BADGE_CLASSES: Record<HseEmergencyProcedureStatus, string> = {
  DRAFT: "bg-gray-200 text-gray-700",
  ACTIVE: "bg-emerald-100 text-emerald-800",
  ARCHIVED: "bg-gray-200 text-gray-700",
};

export const EMERGENCY_EVENT_STATUS_LABELS: Record<HseEmergencyEventStatus, string> = {
  REPORTED: "Reported",
  RESPONDING: "Responding",
  UNDER_REVIEW: "Under Review",
  FOLLOW_UP: "Follow-Up",
  CLOSED: "Closed",
};
export const EMERGENCY_EVENT_STATUS_BADGE_CLASSES: Record<HseEmergencyEventStatus, string> = {
  REPORTED: "bg-amber-100 text-amber-800",
  RESPONDING: "bg-red-100 text-red-800",
  UNDER_REVIEW: "bg-blue-100 text-blue-800",
  FOLLOW_UP: "bg-blue-100 text-blue-800",
  CLOSED: "bg-emerald-100 text-emerald-800",
};
export const EMERGENCY_EVENT_STATUS_ORDER: HseEmergencyEventStatus[] = [
  "REPORTED",
  "RESPONDING",
  "UNDER_REVIEW",
  "FOLLOW_UP",
  "CLOSED",
];

export const EMERGENCY_DRILL_STATUS_LABELS: Record<HseEmergencyDrillStatus, string> = {
  SCHEDULED: "Scheduled",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
};
export const EMERGENCY_DRILL_STATUS_BADGE_CLASSES: Record<HseEmergencyDrillStatus, string> = {
  SCHEDULED: "bg-gray-200 text-gray-700",
  IN_PROGRESS: "bg-blue-100 text-blue-800",
  COMPLETED: "bg-emerald-100 text-emerald-800",
};

export const EMERGENCY_DRILL_RESULT_LABELS: Record<HseEmergencyDrillResult, string> = {
  SATISFACTORY: "Satisfactory",
  NEEDS_IMPROVEMENT: "Needs Improvement",
  UNSATISFACTORY: "Unsatisfactory",
};
export const EMERGENCY_DRILL_RESULT_BADGE_CLASSES: Record<HseEmergencyDrillResult, string> = {
  SATISFACTORY: "bg-emerald-100 text-emerald-800",
  NEEDS_IMPROVEMENT: "bg-amber-100 text-amber-800",
  UNSATISFACTORY: "bg-red-100 text-red-800",
};
