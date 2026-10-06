import "server-only";

import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { requirePermission } from "@/lib/auth/permissions";
import { computeNextNumber, fieldNumberPrefix } from "@/lib/field/numbering";
import { ISSUE_STATUS_ORDER } from "@/lib/field/status";
import { assertActiveSiteWalk } from "@/lib/services/field/site-walk-service";
import type { FieldIssue, FieldIssueStatus, FieldPriority } from "@prisma/client";

export class IssueError extends Error {}

const MANAGE_PERMISSION = "FIELD_MANAGE_ISSUES";
const VERIFY_PERMISSION = "FIELD_ISSUE_VERIFY";

const VALID_SOURCE_TYPES = [
  "manual",
  "FieldObservation",
  "FieldInspectionResponse",
  "FieldTest",
  "FieldPunchItem",
  "FieldPhoto",
] as const;

async function resolveIssueTypeId(projectId: string, typeName: string | undefined): Promise<string | undefined> {
  const name = typeName?.trim();
  if (!name) return undefined;
  const lookup = await prisma.fieldLookup.upsert({
    where: { projectId_kind_name: { projectId, kind: "ISSUE_TYPE", name } },
    update: {},
    create: { projectId, kind: "ISSUE_TYPE", name },
  });
  return lookup.id;
}

export async function createIssue(params: {
  projectId: string;
  createdById: string;
  areaId?: string;
  siteWalkId?: string;
  title: string;
  description: string;
  typeName?: string;
  priority?: FieldPriority;
  responsibleOrgId?: string;
  responsibleUserId?: string;
  dueDate?: Date;
  sourceType?: string;
  sourceId?: string;
}) {
  const { projectId, createdById } = params;
  await requirePermission(createdById, MANAGE_PERMISSION, { projectId });

  if (!params.title.trim()) throw new IssueError("Title is required.");
  if (!params.description.trim()) throw new IssueError("Description is required.");
  const sourceType = params.sourceType ?? "manual";
  if (!VALID_SOURCE_TYPES.includes(sourceType as (typeof VALID_SOURCE_TYPES)[number])) {
    throw new IssueError("Invalid source type.");
  }

  if (params.areaId) {
    const area = await prisma.fieldArea.findFirst({ where: { id: params.areaId, projectId } });
    if (!area) throw new IssueError("Selected location does not belong to this project.");
  }
  if (params.siteWalkId) {
    await assertActiveSiteWalk(params.siteWalkId, projectId);
  }
  if (params.responsibleUserId) {
    const member = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: params.responsibleUserId } },
    });
    if (!member) throw new IssueError("Responsible user is not a member of this project.");
  }

  const typeId = await resolveIssueTypeId(projectId, params.typeName);

  const prefix = fieldNumberPrefix("ISS");
  const existing = await prisma.fieldIssue.findMany({
    where: { projectId, issueNumber: { startsWith: prefix } },
    select: { issueNumber: true },
  });
  const issueNumber = computeNextNumber(existing.map((e) => e.issueNumber), prefix);

  const issue = await prisma.fieldIssue.create({
    data: {
      projectId,
      issueNumber,
      areaId: params.areaId ?? null,
      siteWalkId: params.siteWalkId ?? null,
      title: params.title.trim(),
      description: params.description.trim(),
      typeId: typeId ?? null,
      priority: params.priority ?? "MEDIUM",
      responsibleOrgId: params.responsibleOrgId ?? null,
      responsibleUserId: params.responsibleUserId ?? null,
      dueDate: params.dueDate ?? null,
      sourceType,
      sourceId: params.sourceId ?? null,
      status: params.responsibleUserId ? "ASSIGNED" : "OPEN",
      createdById,
    },
  });

  await logAudit({
    userId: createdById,
    projectId,
    action: "FIELD_ISSUE_CREATED",
    entityType: "FieldIssue",
    entityId: issue.id,
    metadata: { issueNumber, sourceType, sourceId: params.sourceId },
  });

  return issue;
}

/** Pure decision function, reused by transitionIssueStatus and by any
 * caller that needs to know in advance whether a transition is allowed
 * (e.g. to disable a UI control) — the single source of truth for Issue
 * status rules, never duplicated inline. */
export function canTransitionIssueStatus(params: {
  existing: Pick<FieldIssue, "status" | "responsibleUserId">;
  to: FieldIssueStatus;
  actingUserId: string;
}): { allowed: boolean; reason?: string } {
  const { existing, to, actingUserId } = params;

  // REJECTED is a real exception to forward-only progression: it sends a
  // READY_FOR_VERIFICATION issue back into rework.
  if (to === "REJECTED") {
    if (existing.status !== "READY_FOR_VERIFICATION") {
      return { allowed: false, reason: "Only an issue awaiting verification can be rejected." };
    }
    return { allowed: true };
  }
  if (existing.status === "REJECTED" && to === "IN_PROGRESS") {
    return { allowed: true };
  }

  const fromIdx = ISSUE_STATUS_ORDER.indexOf(existing.status === "REJECTED" ? "IN_PROGRESS" : existing.status);
  const toIdx = ISSUE_STATUS_ORDER.indexOf(to);
  if (toIdx === -1) return { allowed: false, reason: "Invalid status." };

  const isReopeningFromClosed = existing.status === "CLOSED" && to !== "CLOSED";
  if (toIdx < fromIdx && !isReopeningFromClosed) {
    return { allowed: false, reason: `An issue already in "${existing.status}" cannot move backward to an earlier stage.` };
  }

  // Independent verification: the assignee can never verify their own work.
  if (to === "VERIFIED" && existing.responsibleUserId === actingUserId) {
    return { allowed: false, reason: "The responsible person cannot verify their own issue. Ask another team member to verify." };
  }

  return { allowed: true };
}

export async function transitionIssueStatus(params: {
  id: string;
  projectId: string;
  actingUserId: string;
  status: FieldIssueStatus;
}) {
  const { id, projectId, actingUserId, status } = params;
  const governingPermission = status === "VERIFIED" ? VERIFY_PERMISSION : MANAGE_PERMISSION;
  await requirePermission(actingUserId, governingPermission, { projectId });

  const existing = await prisma.fieldIssue.findFirst({ where: { id, projectId } });
  if (!existing) throw new IssueError("Issue not found.");

  const decision = canTransitionIssueStatus({ existing, to: status, actingUserId });
  if (!decision.allowed) throw new IssueError(decision.reason ?? "This status change is not allowed.");

  const updated = await prisma.fieldIssue.update({
    where: { id },
    data: {
      status,
      verifiedById: status === "VERIFIED" ? actingUserId : existing.verifiedById,
      verifiedAt: status === "VERIFIED" ? new Date() : existing.verifiedAt,
      closedById: status === "CLOSED" ? actingUserId : existing.closedById,
      closedAt: status === "CLOSED" ? new Date() : existing.closedAt,
    },
  });

  await logAudit({
    userId: actingUserId,
    projectId,
    action: "FIELD_ISSUE_STATUS_CHANGED",
    entityType: "FieldIssue",
    entityId: id,
    metadata: { from: existing.status, to: status },
  });

  return updated;
}
