import "server-only";

import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { requirePermission } from "@/lib/auth/permissions";
import { computeNextNumber, hseNumberPrefix } from "@/lib/hse/numbering";
import type { HseNearMissStatus, HseSeverity } from "@prisma/client";

export class NearMissError extends Error {}

export async function createNearMiss(params: {
  projectId: string;
  reportedById: string;
  title: string;
  description: string;
  whatHappened?: string;
  potentialConsequence?: string;
  potentialSeverity: HseSeverity;
  immediateAction?: string;
  location: string;
  building?: string;
  floor?: string;
  area?: string;
  latitude?: number;
  longitude?: number;
  assignedToId?: string;
  dueDate?: Date;
}) {
  const { projectId, reportedById } = params;
  await requirePermission(reportedById, "HSE_REPORT", { projectId });

  if (!params.title.trim()) throw new NearMissError("Title is required.");
  if (!params.description.trim()) throw new NearMissError("Description is required.");
  if (!params.location.trim()) throw new NearMissError("Location is required.");
  if (params.assignedToId) {
    const member = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: params.assignedToId } },
    });
    if (!member) throw new NearMissError("Assignee is not a member of this project.");
  }

  const prefix = hseNumberPrefix("NM");
  const existing = await prisma.hseNearMiss.findMany({
    where: { projectId, nearMissNumber: { startsWith: prefix } },
    select: { nearMissNumber: true },
  });
  const nearMissNumber = computeNextNumber(existing.map((e) => e.nearMissNumber), prefix);

  const nearMiss = await prisma.hseNearMiss.create({
    data: {
      projectId,
      nearMissNumber,
      title: params.title.trim(),
      description: params.description.trim(),
      whatHappened: params.whatHappened?.trim() || null,
      potentialConsequence: params.potentialConsequence?.trim() || null,
      potentialSeverity: params.potentialSeverity,
      immediateAction: params.immediateAction?.trim() || null,
      location: params.location.trim(),
      building: params.building?.trim() || null,
      floor: params.floor?.trim() || null,
      area: params.area?.trim() || null,
      latitude: params.latitude ?? null,
      longitude: params.longitude ?? null,
      assignedToId: params.assignedToId ?? null,
      dueDate: params.dueDate ?? null,
      reportedById,
    },
  });

  await logAudit({
    userId: reportedById,
    projectId,
    action: "HSE_NEAR_MISS_CREATED",
    entityType: "HseNearMiss",
    entityId: nearMiss.id,
    metadata: { nearMissNumber, potentialSeverity: params.potentialSeverity },
  });

  return nearMiss;
}

export async function updateNearMissStatus(params: {
  id: string;
  projectId: string;
  actingUserId: string;
  status: HseNearMissStatus;
}) {
  const { id, projectId, actingUserId, status } = params;
  await requirePermission(actingUserId, "HSE_MANAGE_NEAR_MISSES", { projectId });

  const existing = await prisma.hseNearMiss.findFirst({ where: { id, projectId } });
  if (!existing) throw new NearMissError("Near miss not found.");

  const updated = await prisma.hseNearMiss.update({ where: { id }, data: { status } });

  await logAudit({
    userId: actingUserId,
    projectId,
    action: "HSE_NEAR_MISS_STATUS_CHANGED",
    entityType: "HseNearMiss",
    entityId: id,
    metadata: { from: existing.status, to: status },
  });

  return updated;
}
