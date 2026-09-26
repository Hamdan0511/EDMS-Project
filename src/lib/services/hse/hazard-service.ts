import "server-only";

import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { requirePermission } from "@/lib/auth/permissions";
import { computeNextNumber, hseNumberPrefix } from "@/lib/hse/numbering";
import { calculateRiskLevel } from "@/lib/hse/risk-matrix";
import type { HseLikelihood, HseSeverity, HseHazardStatus, HseControlHierarchy, HseControlStatus } from "@prisma/client";

export class HazardError extends Error {}

export async function createHazard(params: {
  projectId: string;
  createdById: string;
  hazard: string;
  activity?: string;
  location: string;
  initialLikelihood: HseLikelihood;
  initialSeverity: HseSeverity;
  responsibleId?: string;
  reviewDate?: Date;
}) {
  const { projectId, createdById } = params;
  await requirePermission(createdById, "HSE_REPORT", { projectId });

  if (!params.hazard.trim()) throw new HazardError("Hazard description is required.");
  if (!params.location.trim()) throw new HazardError("Location is required.");
  if (params.responsibleId) {
    const member = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: params.responsibleId } },
    });
    if (!member) throw new HazardError("Responsible person is not a member of this project.");
  }

  const prefix = hseNumberPrefix("HAZ");
  const existing = await prisma.hseHazard.findMany({
    where: { projectId, hazardNumber: { startsWith: prefix } },
    select: { hazardNumber: true },
  });
  const hazardNumber = computeNextNumber(existing.map((e) => e.hazardNumber), prefix);
  const initialRisk = calculateRiskLevel(params.initialLikelihood, params.initialSeverity);

  const hazard = await prisma.hseHazard.create({
    data: {
      projectId,
      hazardNumber,
      hazard: params.hazard.trim(),
      activity: params.activity?.trim() || null,
      location: params.location.trim(),
      initialLikelihood: params.initialLikelihood,
      initialSeverity: params.initialSeverity,
      initialRisk,
      responsibleId: params.responsibleId ?? null,
      reviewDate: params.reviewDate ?? null,
      createdById,
    },
  });

  await logAudit({
    userId: createdById,
    projectId,
    action: "HSE_HAZARD_CREATED",
    entityType: "HseHazard",
    entityId: hazard.id,
    metadata: { hazardNumber, initialRisk },
  });

  return hazard;
}

export async function addHazardControl(params: {
  hazardId: string;
  projectId: string;
  actingUserId: string;
  hierarchy: HseControlHierarchy;
  description: string;
  ownerId?: string;
  dueDate?: Date;
}) {
  const { hazardId, projectId, actingUserId } = params;
  await requirePermission(actingUserId, "HSE_MANAGE_HAZARDS", { projectId });

  const hazard = await prisma.hseHazard.findFirst({ where: { id: hazardId, projectId }, include: { controls: true } });
  if (!hazard) throw new HazardError("Hazard not found.");
  if (!params.description.trim()) throw new HazardError("Control description is required.");
  if (params.ownerId) {
    const member = await prisma.projectMember.findUnique({ where: { projectId_userId: { projectId, userId: params.ownerId } } });
    if (!member) throw new HazardError("Control owner is not a member of this project.");
  }

  const control = await prisma.hseControl.create({
    data: {
      hazardId,
      hierarchy: params.hierarchy,
      description: params.description.trim(),
      ownerId: params.ownerId ?? null,
      dueDate: params.dueDate ?? null,
    },
  });

  await logAudit({
    userId: actingUserId,
    projectId,
    action: "HSE_HAZARD_CONTROL_ADDED",
    entityType: "HseHazard",
    entityId: hazardId,
    metadata: { hierarchy: params.hierarchy },
  });

  // A hazard with at least one implemented control moves from OPEN to
  // CONTROLLED — a real, derived state, not free text.
  if (hazard.status === "OPEN") {
    await prisma.hseHazard.update({ where: { id: hazardId }, data: { status: "CONTROLLED" } });
  }

  return control;
}

export async function updateHazardControlStatus(params: {
  controlId: string;
  projectId: string;
  actingUserId: string;
  status: HseControlStatus;
}) {
  const { controlId, projectId, actingUserId, status } = params;
  await requirePermission(actingUserId, "HSE_MANAGE_HAZARDS", { projectId });

  const control = await prisma.hseControl.findFirst({
    where: { id: controlId, hazard: { projectId } },
    include: { hazard: true },
  });
  if (!control || !control.hazard) throw new HazardError("Control not found.");

  const updated = await prisma.hseControl.update({
    where: { id: controlId },
    data: { status, verifiedAt: status === "VERIFIED" ? new Date() : control.verifiedAt },
  });

  await logAudit({
    userId: actingUserId,
    projectId,
    action: "HSE_HAZARD_CONTROL_STATUS_CHANGED",
    entityType: "HseHazard",
    entityId: control.hazardId!,
    metadata: { controlId, from: control.status, to: status },
  });

  return updated;
}

export async function setHazardResidualRisk(params: {
  hazardId: string;
  projectId: string;
  actingUserId: string;
  residualLikelihood: HseLikelihood;
  residualSeverity: HseSeverity;
}) {
  const { hazardId, projectId, actingUserId } = params;
  await requirePermission(actingUserId, "HSE_MANAGE_HAZARDS", { projectId });

  const hazard = await prisma.hseHazard.findFirst({ where: { id: hazardId, projectId } });
  if (!hazard) throw new HazardError("Hazard not found.");

  const residualRisk = calculateRiskLevel(params.residualLikelihood, params.residualSeverity);
  const updated = await prisma.hseHazard.update({
    where: { id: hazardId },
    data: { residualLikelihood: params.residualLikelihood, residualSeverity: params.residualSeverity, residualRisk },
  });

  await logAudit({
    userId: actingUserId,
    projectId,
    action: "HSE_HAZARD_RESIDUAL_RISK_SET",
    entityType: "HseHazard",
    entityId: hazardId,
    metadata: { residualRisk },
  });

  return updated;
}

export async function updateHazardStatus(params: {
  id: string;
  projectId: string;
  actingUserId: string;
  status: HseHazardStatus;
}) {
  const { id, projectId, actingUserId, status } = params;
  await requirePermission(actingUserId, "HSE_MANAGE_HAZARDS", { projectId });

  const existing = await prisma.hseHazard.findFirst({ where: { id, projectId } });
  if (!existing) throw new HazardError("Hazard not found.");

  const updated = await prisma.hseHazard.update({ where: { id }, data: { status } });

  await logAudit({
    userId: actingUserId,
    projectId,
    action: "HSE_HAZARD_STATUS_CHANGED",
    entityType: "HseHazard",
    entityId: id,
    metadata: { from: existing.status, to: status },
  });

  return updated;
}
