import "server-only";

import { prisma } from "@/lib/prisma";

/** Human-readable labels for every Field audit action code actually emitted
 * by the Field services — kept in sync with logAudit() call sites. Anything
 * not in this map falls back to a de-slugged version of the raw code, so a
 * newly added action is never silently invisible on the trail. */
export const ACTION_LABELS: Record<string, string> = {
  FIELD_ATTACHMENT_UPLOADED: "Evidence uploaded",
  FIELD_ATTACHMENT_DELETED: "Evidence removed",
  FIELD_AREA_CREATED: "Location created",
  FIELD_OBSERVATION_CREATED: "Observation reported",
  FIELD_OBSERVATION_STATUS_CHANGED: "Status changed",
  FIELD_OBSERVATION_CONVERTED_TO_ISSUE: "Converted to issue",
  FIELD_COMMENT_ADDED: "Comment added",
  FIELD_INSPECTION_TEMPLATE_CREATED: "Template created",
  FIELD_INSPECTION_SCHEDULED: "Inspection scheduled",
  FIELD_INSPECTION_STARTED: "Inspection started",
  FIELD_INSPECTION_COMPLETED: "Inspection completed",
  FIELD_ISSUE_CREATED: "Issue raised",
  FIELD_ISSUE_STATUS_CHANGED: "Status changed",
  FIELD_PUNCHLIST_CREATED: "Punchlist created",
  FIELD_PUNCH_ITEM_CREATED: "Punch item created",
  FIELD_PUNCH_ITEM_STATUS_CHANGED: "Status changed",
  FIELD_PUNCHLIST_ISSUE_ATTACHED: "Issue attached",
  FIELD_ITP_CREATED: "ITP created",
  FIELD_ITP_APPROVED: "ITP approved",
  FIELD_ITP_REJECTED: "ITP rejected",
  FIELD_ITP_INSPECTION_REQUESTED: "Inspection requested",
  FIELD_ITP_HOLD_POINT_RELEASED: "Hold point released",
  FIELD_ITP_HOLD_POINT_REJECTED: "Hold point rejected — rework required",
  FIELD_TEST_CREATED: "Test recorded",
  FIELD_TEST_RETEST_CREATED: "Retest recorded",
  FIELD_PHOTO_UPLOADED: "Photo uploaded",
  FIELD_SITE_WALK_STARTED: "Site walk started",
  FIELD_SITE_WALK_ENDED: "Site walk ended",
  FIELD_DOCUMENT_LINKED: "Document linked",
};

export type FieldAuditEvent = {
  id: string;
  actorName: string;
  label: string;
  detail: string | null;
  createdAt: Date;
};

function summarizeMetadata(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object") return null;
  const m = metadata as Record<string, unknown>;
  if (typeof m.from === "string" && typeof m.to === "string") {
    return `${m.from.replaceAll("_", " ")} → ${m.to.replaceAll("_", " ")}`;
  }
  if (typeof m.fileName === "string") return m.fileName;
  if (typeof m.issueNumber === "string") return m.issueNumber;
  return null;
}

/** Every Field detail page's Activity/Audit section reads this — real,
 * persisted AuditLog rows scoped to the exact record and project, never a
 * fabricated narrative. Reuses the existing AuditLog table directly — no
 * second audit system. */
export async function getFieldAuditTrail(entityType: string, entityId: string, projectId: string): Promise<FieldAuditEvent[]> {
  const rows = await prisma.auditLog.findMany({
    where: { entityType, entityId, projectId },
    include: { user: true },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((r) => ({
    id: r.id,
    actorName: r.user?.name ?? "System",
    label: ACTION_LABELS[r.action] ?? r.action.replaceAll("_", " ").toLowerCase(),
    detail: summarizeMetadata(r.metadata),
    createdAt: r.createdAt,
  }));
}
