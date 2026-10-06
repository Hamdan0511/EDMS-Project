import "server-only";

import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { requirePermission } from "@/lib/auth/permissions";
import { computeNextNumber, fieldNumberPrefix } from "@/lib/field/numbering";
import { PUNCH_ITEM_STATUS_ORDER } from "@/lib/field/status";
import { assertActiveSiteWalk } from "@/lib/services/field/site-walk-service";
import type { FieldPunchItem, FieldPunchItemStatus, FieldPriority } from "@prisma/client";

export class PunchError extends Error {}

const PERMISSION = "FIELD_MANAGE_PUNCH";

async function resolveTradeId(projectId: string, tradeName: string | undefined): Promise<string | undefined> {
  const name = tradeName?.trim();
  if (!name) return undefined;
  const lookup = await prisma.fieldLookup.upsert({
    where: { projectId_kind_name: { projectId, kind: "PUNCH_TRADE", name } },
    update: {},
    create: { projectId, kind: "PUNCH_TRADE", name },
  });
  return lookup.id;
}

export async function createPunchlist(params: {
  projectId: string;
  createdById: string;
  title: string;
  areaId?: string;
  description?: string;
  dueDate?: Date;
  ownerId?: string;
}) {
  const { projectId, createdById } = params;
  await requirePermission(createdById, PERMISSION, { projectId });

  if (!params.title.trim()) throw new PunchError("Title is required.");

  const prefix = fieldNumberPrefix("PL");
  const existing = await prisma.fieldPunchlist.findMany({
    where: { projectId, punchlistNumber: { startsWith: prefix } },
    select: { punchlistNumber: true },
  });
  const punchlistNumber = computeNextNumber(existing.map((e) => e.punchlistNumber), prefix);

  const punchlist = await prisma.fieldPunchlist.create({
    data: {
      projectId,
      punchlistNumber,
      title: params.title.trim(),
      areaId: params.areaId ?? null,
      description: params.description?.trim() || null,
      dueDate: params.dueDate ?? null,
      ownerId: params.ownerId ?? null,
      createdById,
    },
  });

  await logAudit({
    userId: createdById,
    projectId,
    action: "FIELD_PUNCHLIST_CREATED",
    entityType: "FieldPunchlist",
    entityId: punchlist.id,
    metadata: { punchlistNumber },
  });

  return punchlist;
}

export async function createPunchItem(params: {
  projectId: string;
  createdById: string;
  punchlistId?: string;
  title: string;
  description: string;
  areaId?: string;
  siteWalkId?: string;
  tradeName?: string;
  priority?: FieldPriority;
  responsibleOrgId?: string;
  responsibleUserId?: string;
  dueDate?: Date;
}) {
  const { projectId, createdById } = params;
  await requirePermission(createdById, PERMISSION, { projectId });

  if (!params.title.trim()) throw new PunchError("Title is required.");
  if (!params.description.trim()) throw new PunchError("Description is required.");

  if (params.punchlistId) {
    const punchlist = await prisma.fieldPunchlist.findFirst({ where: { id: params.punchlistId, projectId } });
    if (!punchlist) throw new PunchError("Punchlist not found in this project.");
  }
  if (params.areaId) {
    const area = await prisma.fieldArea.findFirst({ where: { id: params.areaId, projectId } });
    if (!area) throw new PunchError("Selected location does not belong to this project.");
  }
  if (params.siteWalkId) {
    await assertActiveSiteWalk(params.siteWalkId, projectId);
  }
  if (params.responsibleUserId) {
    const member = await prisma.projectMember.findUnique({ where: { projectId_userId: { projectId, userId: params.responsibleUserId } } });
    if (!member) throw new PunchError("Responsible user is not a member of this project.");
  }

  const tradeId = await resolveTradeId(projectId, params.tradeName);

  const prefix = fieldNumberPrefix("SNAG");
  const existing = await prisma.fieldPunchItem.findMany({
    where: { projectId, punchItemNumber: { startsWith: prefix } },
    select: { punchItemNumber: true },
  });
  const punchItemNumber = computeNextNumber(existing.map((e) => e.punchItemNumber), prefix);

  const item = await prisma.fieldPunchItem.create({
    data: {
      projectId,
      punchlistId: params.punchlistId ?? null,
      punchItemNumber,
      title: params.title.trim(),
      description: params.description.trim(),
      areaId: params.areaId ?? null,
      siteWalkId: params.siteWalkId ?? null,
      tradeId: tradeId ?? null,
      priority: params.priority ?? "MEDIUM",
      responsibleOrgId: params.responsibleOrgId ?? null,
      responsibleUserId: params.responsibleUserId ?? null,
      dueDate: params.dueDate ?? null,
      status: params.responsibleUserId ? "ASSIGNED" : "OPEN",
      createdById,
    },
  });

  await logAudit({
    userId: createdById,
    projectId,
    action: "FIELD_PUNCH_ITEM_CREATED",
    entityType: "FieldPunchItem",
    entityId: item.id,
    metadata: { punchItemNumber },
  });

  return item;
}

/** Same forward-only + REWORK_REQUIRED-exception + independent-verification
 * rules as Issues (canTransitionIssueStatus), expressed for Punch Items'
 * own status set — kept as its own function since the two enums/business
 * contexts are distinct, even though the shape of the rule is identical. */
export function canTransitionPunchItemStatus(params: {
  existing: Pick<FieldPunchItem, "status" | "responsibleUserId">;
  to: FieldPunchItemStatus;
  actingUserId: string;
}): { allowed: boolean; reason?: string } {
  const { existing, to, actingUserId } = params;

  if (to === "REWORK_REQUIRED") {
    if (existing.status !== "READY_FOR_VERIFICATION") {
      return { allowed: false, reason: "Only a punch item awaiting verification can be sent back for rework." };
    }
    return { allowed: true };
  }
  if (existing.status === "REWORK_REQUIRED" && to === "IN_PROGRESS") {
    return { allowed: true };
  }

  const fromIdx = PUNCH_ITEM_STATUS_ORDER.indexOf(existing.status === "REWORK_REQUIRED" ? "IN_PROGRESS" : existing.status);
  const toIdx = PUNCH_ITEM_STATUS_ORDER.indexOf(to);
  if (toIdx === -1) return { allowed: false, reason: "Invalid status." };

  const isReopeningFromClosed = existing.status === "CLOSED" && to !== "CLOSED";
  if (toIdx < fromIdx && !isReopeningFromClosed) {
    return { allowed: false, reason: `A punch item already in "${existing.status}" cannot move backward to an earlier stage.` };
  }

  if (to === "VERIFIED" && existing.responsibleUserId === actingUserId) {
    return { allowed: false, reason: "The responsible person cannot verify their own punch item. Ask another team member to verify." };
  }

  return { allowed: true };
}

export async function transitionPunchItemStatus(params: {
  id: string;
  projectId: string;
  actingUserId: string;
  status: FieldPunchItemStatus;
}) {
  const { id, projectId, actingUserId, status } = params;
  await requirePermission(actingUserId, PERMISSION, { projectId });

  const existing = await prisma.fieldPunchItem.findFirst({ where: { id, projectId } });
  if (!existing) throw new PunchError("Punch item not found.");

  const decision = canTransitionPunchItemStatus({ existing, to: status, actingUserId });
  if (!decision.allowed) throw new PunchError(decision.reason ?? "This status change is not allowed.");

  const updated = await prisma.fieldPunchItem.update({
    where: { id },
    data: {
      status,
      closedById: status === "CLOSED" ? actingUserId : existing.closedById,
      closedAt: status === "CLOSED" ? new Date() : existing.closedAt,
    },
  });

  await logAudit({
    userId: actingUserId,
    projectId,
    action: "FIELD_PUNCH_ITEM_STATUS_CHANGED",
    entityType: "FieldPunchItem",
    entityId: id,
    metadata: { from: existing.status, to: status },
  });

  return updated;
}

/** Attaches an EXISTING Issue to a punchlist — never re-created as a
 * separate punch item, per the brief's explicit "must not duplicate the
 * same underlying issue" requirement. */
export async function attachIssueToPunchlist(params: { punchlistId: string; issueId: string; projectId: string; actingUserId: string }) {
  const { punchlistId, issueId, projectId, actingUserId } = params;
  await requirePermission(actingUserId, PERMISSION, { projectId });

  const punchlist = await prisma.fieldPunchlist.findFirst({ where: { id: punchlistId, projectId } });
  if (!punchlist) throw new PunchError("Punchlist not found.");
  const issue = await prisma.fieldIssue.findFirst({ where: { id: issueId, projectId } });
  if (!issue) throw new PunchError("Issue not found in this project.");

  const link = await prisma.fieldPunchlistIssue.upsert({
    where: { punchlistId_issueId: { punchlistId, issueId } },
    update: {},
    create: { punchlistId, issueId },
  });

  await logAudit({
    userId: actingUserId,
    projectId,
    action: "FIELD_PUNCHLIST_ISSUE_ATTACHED",
    entityType: "FieldPunchlist",
    entityId: punchlistId,
    metadata: { issueId },
  });

  return link;
}

/** Real computed aggregate — never stored/stale. */
export async function computePunchlistCompletion(punchlistId: string): Promise<{ total: number; done: number; percent: number }> {
  const items = await prisma.fieldPunchItem.findMany({ where: { punchlistId }, select: { status: true } });
  const total = items.length;
  const done = items.filter((i) => i.status === "VERIFIED" || i.status === "CLOSED").length;
  return { total, done, percent: total === 0 ? 0 : Math.round((done / total) * 100) };
}
