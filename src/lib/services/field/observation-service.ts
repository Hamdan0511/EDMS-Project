import "server-only";

import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { requirePermission } from "@/lib/auth/permissions";
import { computeNextNumber, fieldNumberPrefix } from "@/lib/field/numbering";
import { OBSERVATION_STATUS_ORDER } from "@/lib/field/status";
import { createIssue } from "@/lib/services/field/issue-service";
import { assertActiveSiteWalk } from "@/lib/services/field/site-walk-service";
import type { FieldObservationStatus, FieldPriority } from "@prisma/client";

export class ObservationError extends Error {}

const PERMISSION = "FIELD_MANAGE_OBSERVATIONS";

/** Observation Type is a project-configurable FieldLookup (kind
 * "OBSERVATION_TYPE"), upserted by name exactly like DocumentType is
 * upserted elsewhere in this app — never a hardcoded enum, never a second
 * "manage types" admin screen. */
async function resolveObservationTypeId(projectId: string, typeName: string | undefined): Promise<string | undefined> {
  const name = typeName?.trim();
  if (!name) return undefined;
  const lookup = await prisma.fieldLookup.upsert({
    where: { projectId_kind_name: { projectId, kind: "OBSERVATION_TYPE", name } },
    update: {},
    create: { projectId, kind: "OBSERVATION_TYPE", name },
  });
  return lookup.id;
}

export async function createObservation(params: {
  projectId: string;
  createdById: string;
  areaId?: string;
  siteWalkId?: string;
  title: string;
  description: string;
  typeName?: string;
  priority?: FieldPriority;
  isPositive?: boolean;
  responsibleOrgId?: string;
  responsibleUserId?: string;
  dueDate?: Date;
}) {
  const { projectId, createdById } = params;
  await requirePermission(createdById, PERMISSION, { projectId });

  if (!params.title.trim()) throw new ObservationError("Title is required.");
  if (!params.description.trim()) throw new ObservationError("Description is required.");

  if (params.areaId) {
    const area = await prisma.fieldArea.findFirst({ where: { id: params.areaId, projectId } });
    if (!area) throw new ObservationError("Selected location does not belong to this project.");
  }
  if (params.siteWalkId) {
    await assertActiveSiteWalk(params.siteWalkId, projectId);
  }
  if (params.responsibleUserId) {
    const member = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: params.responsibleUserId } },
    });
    if (!member) throw new ObservationError("Responsible user is not a member of this project.");
  }

  const typeId = await resolveObservationTypeId(projectId, params.typeName);

  const prefix = fieldNumberPrefix("OBS");
  const existing = await prisma.fieldObservation.findMany({
    where: { projectId, observationNumber: { startsWith: prefix } },
    select: { observationNumber: true },
  });
  const observationNumber = computeNextNumber(existing.map((e) => e.observationNumber), prefix);

  const observation = await prisma.fieldObservation.create({
    data: {
      projectId,
      observationNumber,
      areaId: params.areaId ?? null,
      siteWalkId: params.siteWalkId ?? null,
      title: params.title.trim(),
      description: params.description.trim(),
      typeId: typeId ?? null,
      priority: params.priority ?? "MEDIUM",
      isPositive: params.isPositive ?? false,
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
    action: "FIELD_OBSERVATION_CREATED",
    entityType: "FieldObservation",
    entityId: observation.id,
    metadata: { observationNumber, priority: observation.priority },
  });

  return observation;
}

export async function updateObservationStatus(params: {
  id: string;
  projectId: string;
  actingUserId: string;
  status: FieldObservationStatus;
}) {
  const { id, projectId, actingUserId, status } = params;
  await requirePermission(actingUserId, PERMISSION, { projectId });

  const existing = await prisma.fieldObservation.findFirst({ where: { id, projectId } });
  if (!existing) throw new ObservationError("Observation not found.");

  const fromIdx = OBSERVATION_STATUS_ORDER.indexOf(existing.status);
  const toIdx = OBSERVATION_STATUS_ORDER.indexOf(status);
  if (toIdx === -1) throw new ObservationError("Invalid status.");
  const isReopeningFromClosed = existing.status === "CLOSED" && status !== "CLOSED";
  if (toIdx < fromIdx && !isReopeningFromClosed) {
    throw new ObservationError(`An observation already in "${existing.status}" cannot move backward to an earlier stage.`);
  }

  const updated = await prisma.fieldObservation.update({
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
    action: "FIELD_OBSERVATION_STATUS_CHANGED",
    entityType: "FieldObservation",
    entityId: id,
    metadata: { from: existing.status, to: status },
  });

  return updated;
}

/** An observation is informational by default — this is the one real
 * conversion path into an actionable Issue, carrying over location,
 * description, and responsible party so the user only confirms details
 * rather than re-typing everything. */
export async function convertObservationToIssue(params: {
  id: string;
  projectId: string;
  actingUserId: string;
  priority?: FieldPriority;
  dueDate?: Date;
}) {
  const { id, projectId, actingUserId } = params;
  await requirePermission(actingUserId, PERMISSION, { projectId });

  const observation = await prisma.fieldObservation.findFirst({ where: { id, projectId }, include: { type: true } });
  if (!observation) throw new ObservationError("Observation not found.");

  const issue = await createIssue({
    projectId,
    createdById: actingUserId,
    areaId: observation.areaId ?? undefined,
    title: observation.title,
    description: observation.description,
    typeName: observation.type?.name,
    priority: params.priority ?? observation.priority,
    responsibleOrgId: observation.responsibleOrgId ?? undefined,
    responsibleUserId: observation.responsibleUserId ?? undefined,
    dueDate: params.dueDate ?? observation.dueDate ?? undefined,
    sourceType: "FieldObservation",
    sourceId: observation.id,
  });

  await logAudit({
    userId: actingUserId,
    projectId,
    action: "FIELD_OBSERVATION_CONVERTED_TO_ISSUE",
    entityType: "FieldObservation",
    entityId: id,
    metadata: { issueId: issue.id, issueNumber: issue.issueNumber },
  });

  return issue;
}
