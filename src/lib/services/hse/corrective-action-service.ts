import "server-only";

import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { requirePermission } from "@/lib/auth/permissions";
import { computeNextNumber, hseNumberPrefix } from "@/lib/hse/numbering";
import { ACTION_STATUS_ORDER, ACTION_STATUS_LABELS } from "@/lib/hse/status";
import type { HseActionPriority, HseCorrectiveActionStatus } from "@prisma/client";

export class CorrectiveActionError extends Error {}

const VALID_SOURCE_TYPES = [
  "manual",
  "HseObservation",
  "HseIncident",
  "HseNearMiss",
  "HseHazard",
  "HseInspection",
  "HseEquipmentInspection",
  "HseEmergencyDrillFinding",
  "HseEmergencyEvent",
  "FieldIssue",
] as const;

export async function createCorrectiveAction(params: {
  projectId: string;
  createdById: string;
  sourceType: string;
  sourceId?: string;
  description: string;
  assignedToId?: string;
  priority?: HseActionPriority;
  dueDate?: Date;
}) {
  const { projectId, createdById } = params;
  await requirePermission(createdById, "HSE_MANAGE_ACTIONS", { projectId });

  if (!params.description.trim()) throw new CorrectiveActionError("Description is required.");
  if (!VALID_SOURCE_TYPES.includes(params.sourceType as (typeof VALID_SOURCE_TYPES)[number])) {
    throw new CorrectiveActionError("Invalid source type.");
  }
  if (params.assignedToId) {
    const member = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: params.assignedToId } },
    });
    if (!member) throw new CorrectiveActionError("Assignee is not a member of this project.");
  }

  const prefix = hseNumberPrefix("ACT");
  const existing = await prisma.hseCorrectiveAction.findMany({
    where: { projectId, actionNumber: { startsWith: prefix } },
    select: { actionNumber: true },
  });
  const actionNumber = computeNextNumber(existing.map((e) => e.actionNumber), prefix);

  const action = await prisma.hseCorrectiveAction.create({
    data: {
      projectId,
      actionNumber,
      sourceType: params.sourceType,
      sourceId: params.sourceId ?? null,
      description: params.description.trim(),
      assignedToId: params.assignedToId ?? null,
      priority: params.priority ?? "MEDIUM",
      dueDate: params.dueDate ?? null,
      createdById,
    },
  });

  await logAudit({
    userId: createdById,
    projectId,
    action: "HSE_CORRECTIVE_ACTION_CREATED",
    entityType: "HseCorrectiveAction",
    entityId: action.id,
    metadata: { actionNumber, sourceType: params.sourceType, sourceId: params.sourceId },
  });

  return action;
}

export async function updateCorrectiveActionStatus(params: {
  id: string;
  projectId: string;
  actingUserId: string;
  status: HseCorrectiveActionStatus;
}) {
  const { id, projectId, actingUserId, status } = params;
  await requirePermission(actingUserId, "HSE_MANAGE_ACTIONS", { projectId });

  const existing = await prisma.hseCorrectiveAction.findFirst({ where: { id, projectId } });
  if (!existing) throw new CorrectiveActionError("Corrective action not found.");

  const fromIdx = ACTION_STATUS_ORDER.indexOf(existing.status);
  const toIdx = ACTION_STATUS_ORDER.indexOf(status);
  if (toIdx === -1) throw new CorrectiveActionError("Invalid status.");
  const isReopeningFromClosed = existing.status === "CLOSED" && status !== "CLOSED";
  if (toIdx < fromIdx && !isReopeningFromClosed) {
    throw new CorrectiveActionError(`An action already in "${existing.status}" cannot move backward to an earlier stage.`);
  }
  // Same skip-ahead gap originally found in Field Issues: forward-only
  // never meant forward-any-distance. Skipping straight to CLOSED/VERIFIED
  // would bypass the independent-verification check immediately below.
  if (!isReopeningFromClosed && toIdx > fromIdx + 1) {
    throw new CorrectiveActionError(
      `An action in "${existing.status}" must move to "${ACTION_STATUS_LABELS[ACTION_STATUS_ORDER[fromIdx + 1]]}" next, not skip ahead to "${ACTION_STATUS_LABELS[status]}".`,
    );
  }

  // Verification must come from someone other than the assignee — a
  // self-check is not an independent verification.
  if (status === "VERIFIED" && existing.assignedToId === actingUserId) {
    throw new CorrectiveActionError("The assignee cannot verify their own corrective action. Ask another team member to verify.");
  }

  const updated = await prisma.hseCorrectiveAction.update({
    where: { id },
    data: {
      status,
      completedAt: status === "PENDING_VERIFICATION" && !existing.completedAt ? new Date() : existing.completedAt,
      verifiedById: status === "VERIFIED" ? actingUserId : existing.verifiedById,
      verifiedAt: status === "VERIFIED" ? new Date() : existing.verifiedAt,
    },
  });

  await logAudit({
    userId: actingUserId,
    projectId,
    action: "HSE_CORRECTIVE_ACTION_STATUS_CHANGED",
    entityType: "HseCorrectiveAction",
    entityId: id,
    metadata: { from: existing.status, to: status },
  });

  return updated;
}
