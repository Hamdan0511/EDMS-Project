import "server-only";

import { prisma } from "@/lib/prisma";

/** Human-readable labels for every HSE audit action code actually emitted
 * by the HSE services — kept in sync with logAudit() call sites. Anything
 * not in this map falls back to a de-slugged version of the raw code, so a
 * newly added action is never silently invisible on the trail. */
const ACTION_LABELS: Record<string, string> = {
  HSE_OBSERVATION_CREATED: "Observation reported",
  HSE_OBSERVATION_STATUS_CHANGED: "Status changed",
  HSE_INCIDENT_CREATED: "Incident reported",
  HSE_INCIDENT_STATUS_CHANGED: "Status changed",
  HSE_INCIDENT_INVESTIGATION_UPDATED: "Investigation updated",
  HSE_INCIDENT_PERSON_ADDED: "Person recorded",
  HSE_NEAR_MISS_CREATED: "Near miss reported",
  HSE_NEAR_MISS_STATUS_CHANGED: "Status changed",
  HSE_HAZARD_CREATED: "Hazard identified",
  HSE_HAZARD_CONTROL_ADDED: "Control measure added",
  HSE_HAZARD_CONTROL_STATUS_CHANGED: "Control status updated",
  HSE_HAZARD_RESIDUAL_RISK_SET: "Residual risk assessed",
  HSE_HAZARD_STATUS_CHANGED: "Status changed",
  HSE_RISK_ASSESSMENT_CREATED: "Risk assessment created",
  HSE_RISK_ASSESSMENT_CONTROL_ADDED: "Control measure added",
  HSE_RISK_ASSESSMENT_CONTROL_STATUS_CHANGED: "Control status updated",
  HSE_RISK_ASSESSMENT_RESIDUAL_RISK_SET: "Residual risk assessed",
  HSE_RISK_ASSESSMENT_STATUS_CHANGED: "Status changed",
  HSE_INSPECTION_SCHEDULED: "Inspection scheduled",
  HSE_INSPECTION_STARTED: "Inspection started",
  HSE_INSPECTION_COMPLETED: "Inspection completed",
  HSE_CORRECTIVE_ACTION_CREATED: "Corrective action raised",
  HSE_CORRECTIVE_ACTION_STATUS_CHANGED: "Status changed",
  HSE_PERMIT_CREATED: "Permit created",
  HSE_PERMIT_STATUS_CHANGED: "Status changed",
  HSE_ATTACHMENT_UPLOADED: "Evidence uploaded",
  HSE_ATTACHMENT_DELETED: "Evidence removed",
  HSE_EQUIPMENT_CREATED: "Equipment registered",
  HSE_EQUIPMENT_UPDATED: "Equipment details updated",
  HSE_EQUIPMENT_STATUS_CHANGED: "Status changed",
  HSE_EQUIPMENT_INSPECTION_PASSED: "Inspection passed",
  HSE_EQUIPMENT_INSPECTION_FAILED: "Inspection failed",
  HSE_EMERGENCY_CONTACT_CREATED: "Emergency contact added",
  HSE_EMERGENCY_CONTACT_UPDATED: "Emergency contact updated",
  HSE_EMERGENCY_CONTACT_DELETED: "Emergency contact removed",
  HSE_EMERGENCY_PROCEDURE_CREATED: "Procedure created",
  HSE_EMERGENCY_PROCEDURE_UPDATED: "Procedure updated",
  HSE_EMERGENCY_PROCEDURE_STATUS_CHANGED: "Procedure status changed",
  HSE_EMERGENCY_EVENT_CREATED: "Emergency event reported",
  HSE_EMERGENCY_EVENT_STATUS_CHANGED: "Status changed",
  HSE_EMERGENCY_DRILL_SCHEDULED: "Drill scheduled",
  HSE_EMERGENCY_DRILL_COMPLETED: "Drill completed",
  HSE_EMERGENCY_DRILL_ATTENDANCE_RECORDED: "Attendance recorded",
  HSE_EMERGENCY_DRILL_FINDING_ADDED: "Finding added",
};

export type HseAuditEvent = {
  id: string;
  actorName: string;
  label: string;
  detail: string | null;
  createdAt: Date;
};

function summarizeMetadata(action: string, metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object") return null;
  const m = metadata as Record<string, unknown>;
  if (typeof m.from === "string" && typeof m.to === "string") {
    return `${m.from.replaceAll("_", " ")} → ${m.to.replaceAll("_", " ")}`;
  }
  if (typeof m.fileName === "string") return m.fileName;
  if (typeof m.hierarchy === "string") return m.hierarchy.replaceAll("_", " ");
  if (typeof m.residualRisk === "string") return `Residual risk: ${m.residualRisk}`;
  if (typeof m.result === "string") return m.result;
  return null;
}

/** Every HSE detail page's Timeline/Audit section reads this — real,
 * persisted AuditLog rows scoped to the exact record and project, never a
 * fabricated narrative. */
export async function getHseAuditTrail(entityType: string, entityId: string, projectId: string): Promise<HseAuditEvent[]> {
  const rows = await prisma.auditLog.findMany({
    where: { entityType, entityId, projectId },
    include: { user: true },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((r) => ({
    id: r.id,
    actorName: r.user?.name ?? "System",
    label: ACTION_LABELS[r.action] ?? r.action.replaceAll("_", " ").toLowerCase(),
    detail: summarizeMetadata(r.action, r.metadata),
    createdAt: r.createdAt,
  }));
}
