import "server-only";

import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { requirePermission } from "@/lib/auth/permissions";
import { computeNextNumber, hseNumberPrefix } from "@/lib/hse/numbering";
import type { HseChecklistResult, HseRiskLevel } from "@prisma/client";

export class EquipmentError extends Error {}

export async function createEquipment(params: {
  projectId: string;
  createdById: string;
  equipmentType: string;
  description: string;
  makeModel?: string;
  serialNumber?: string;
  location?: string;
  organizationId?: string;
  responsiblePersonId?: string;
  riskLevel?: HseRiskLevel;
}) {
  const { projectId, createdById } = params;
  await requirePermission(createdById, "HSE_MANAGE_EQUIPMENT", { projectId });

  if (!params.equipmentType.trim()) throw new EquipmentError("Equipment type is required.");
  if (!params.description.trim()) throw new EquipmentError("Description is required.");

  if (params.responsiblePersonId) {
    const member = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: params.responsiblePersonId } },
    });
    if (!member) throw new EquipmentError("Responsible person is not a member of this project.");
  }

  const prefix = hseNumberPrefix("EQP");
  const existing = await prisma.hseEquipment.findMany({
    where: { projectId, equipmentNumber: { startsWith: prefix } },
    select: { equipmentNumber: true },
  });
  const equipmentNumber = computeNextNumber(existing.map((e) => e.equipmentNumber), prefix);

  const equipment = await prisma.hseEquipment.create({
    data: {
      projectId,
      equipmentNumber,
      equipmentType: params.equipmentType.trim(),
      description: params.description.trim(),
      makeModel: params.makeModel?.trim() || null,
      serialNumber: params.serialNumber?.trim() || null,
      location: params.location?.trim() || null,
      organizationId: params.organizationId || null,
      responsiblePersonId: params.responsiblePersonId || null,
      riskLevel: params.riskLevel ?? null,
      createdById,
    },
  });

  await logAudit({
    userId: createdById,
    projectId,
    action: "HSE_EQUIPMENT_CREATED",
    entityType: "HseEquipment",
    entityId: equipment.id,
    metadata: { equipmentNumber, equipmentType: equipment.equipmentType },
  });

  return equipment;
}

export async function updateEquipment(params: {
  id: string;
  projectId: string;
  actingUserId: string;
  equipmentType?: string;
  description?: string;
  makeModel?: string;
  serialNumber?: string;
  location?: string;
  organizationId?: string | null;
  responsiblePersonId?: string | null;
  riskLevel?: HseRiskLevel | null;
}) {
  const { id, projectId, actingUserId } = params;
  await requirePermission(actingUserId, "HSE_MANAGE_EQUIPMENT", { projectId });

  const existing = await prisma.hseEquipment.findFirst({ where: { id, projectId } });
  if (!existing) throw new EquipmentError("Equipment not found.");

  if (params.responsiblePersonId) {
    const member = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: params.responsiblePersonId } },
    });
    if (!member) throw new EquipmentError("Responsible person is not a member of this project.");
  }

  // Deliberately no `status` field accepted here — equipment status only
  // ever changes as the server-computed result of an inspection (see
  // runInspection below). This is the actual protection for Part 26, not
  // frontend button-hiding.
  const updated = await prisma.hseEquipment.update({
    where: { id },
    data: {
      equipmentType: params.equipmentType?.trim() || existing.equipmentType,
      description: params.description?.trim() || existing.description,
      makeModel: params.makeModel !== undefined ? params.makeModel?.trim() || null : existing.makeModel,
      serialNumber: params.serialNumber !== undefined ? params.serialNumber?.trim() || null : existing.serialNumber,
      location: params.location !== undefined ? params.location?.trim() || null : existing.location,
      organizationId: params.organizationId !== undefined ? params.organizationId : existing.organizationId,
      responsiblePersonId: params.responsiblePersonId !== undefined ? params.responsiblePersonId : existing.responsiblePersonId,
      riskLevel: params.riskLevel !== undefined ? params.riskLevel : existing.riskLevel,
    },
  });

  await logAudit({
    userId: actingUserId,
    projectId,
    action: "HSE_EQUIPMENT_UPDATED",
    entityType: "HseEquipment",
    entityId: id,
  });

  return updated;
}

export type EquipmentChecklistItemInput = {
  label: string;
  result: HseChecklistResult;
  comment?: string;
};

/** The one and only place equipment.status is ever written after creation.
 * Any FAIL item fails the whole inspection and puts the equipment
 * OUT_OF_SERVICE, auto-raising a linked HseCorrectiveAction (reusing the
 * existing corrective-action infrastructure, not a parallel one). Every
 * inspection — first-time or reinspection — chains to the equipment's prior
 * inspection via previousInspectionId, forming a full real history. */
async function runInspection(params: {
  projectId: string;
  equipmentId: string;
  actingUserId: string;
  items: EquipmentChecklistItemInput[];
  requireOutOfService?: boolean;
}) {
  const { projectId, equipmentId, actingUserId, items, requireOutOfService } = params;
  await requirePermission(actingUserId, "HSE_MANAGE_EQUIPMENT", { projectId });

  const equipment = await prisma.hseEquipment.findFirst({ where: { id: equipmentId, projectId } });
  if (!equipment) throw new EquipmentError("Equipment not found.");
  if (requireOutOfService && equipment.status !== "OUT_OF_SERVICE") {
    throw new EquipmentError("Reinspection can only be requested for equipment that is currently out of service.");
  }
  if (items.length === 0) throw new EquipmentError("At least one checklist item is required.");
  for (const item of items) {
    if (!item.label.trim()) throw new EquipmentError("Every checklist item requires a label.");
  }

  const failedItems = items.filter((i) => i.result === "FAIL");
  const result = failedItems.length > 0 ? "FAIL" : "PASS";

  const inspectionPrefix = hseNumberPrefix("EQI");
  const existingInspectionNumbers = await prisma.hseEquipmentInspection.findMany({
    where: { projectId, inspectionNumber: { startsWith: inspectionPrefix } },
    select: { inspectionNumber: true },
  });
  const inspectionNumber = computeNextNumber(existingInspectionNumbers.map((e) => e.inspectionNumber), inspectionPrefix);

  const lastInspection = await prisma.hseEquipmentInspection.findFirst({
    where: { equipmentId },
    orderBy: { inspectedAt: "desc" },
  });

  const { inspection, correctiveAction } = await prisma.$transaction(async (tx) => {
    const created = await tx.hseEquipmentInspection.create({
      data: {
        projectId,
        equipmentId,
        inspectionNumber,
        inspectorId: actingUserId,
        result,
        previousInspectionId: lastInspection?.id ?? null,
        items: {
          create: items.map((item, i) => ({
            label: item.label.trim(),
            result: item.result,
            comment: item.comment?.trim() || null,
            sortOrder: i,
          })),
        },
      },
      include: { items: true },
    });

    await tx.hseEquipment.update({
      where: { id: equipmentId },
      data: {
        status: result === "FAIL" ? "OUT_OF_SERVICE" : "AVAILABLE",
        lastInspectionAt: created.inspectedAt,
      },
    });

    let newCorrectiveAction: Awaited<ReturnType<typeof tx.hseCorrectiveAction.create>> | null = null;
    if (result === "FAIL") {
      const actionPrefix = hseNumberPrefix("ACT");
      const existingActions = await tx.hseCorrectiveAction.findMany({
        where: { projectId, actionNumber: { startsWith: actionPrefix } },
        select: { actionNumber: true },
      });
      const actionNumber = computeNextNumber(existingActions.map((a) => a.actionNumber), actionPrefix);
      newCorrectiveAction = await tx.hseCorrectiveAction.create({
        data: {
          projectId,
          actionNumber,
          sourceType: "HseEquipmentInspection",
          sourceId: created.id,
          description: `${equipment.equipmentNumber} failed inspection: ${failedItems.map((f) => f.label).join(", ")}`,
          assignedToId: equipment.responsiblePersonId ?? null,
          priority: "HIGH",
          createdById: actingUserId,
        },
      });
    }

    return { inspection: created, correctiveAction: newCorrectiveAction };
  });

  await logAudit({
    userId: actingUserId,
    projectId,
    action: result === "FAIL" ? "HSE_EQUIPMENT_INSPECTION_FAILED" : "HSE_EQUIPMENT_INSPECTION_PASSED",
    entityType: "HseEquipmentInspection",
    entityId: inspection.id,
    metadata: { equipmentId, inspectionNumber, result },
  });
  await logAudit({
    userId: actingUserId,
    projectId,
    action: "HSE_EQUIPMENT_STATUS_CHANGED",
    entityType: "HseEquipment",
    entityId: equipmentId,
    metadata: { from: equipment.status, to: result === "FAIL" ? "OUT_OF_SERVICE" : "AVAILABLE" },
  });
  if (correctiveAction) {
    await logAudit({
      userId: actingUserId,
      projectId,
      action: "HSE_CORRECTIVE_ACTION_CREATED",
      entityType: "HseCorrectiveAction",
      entityId: correctiveAction.id,
      metadata: { actionNumber: correctiveAction.actionNumber, sourceType: "HseEquipmentInspection", sourceId: inspection.id },
    });
  }

  return inspection;
}

export async function createEquipmentInspection(params: {
  projectId: string;
  equipmentId: string;
  actingUserId: string;
  items: EquipmentChecklistItemInput[];
}) {
  return runInspection(params);
}

export async function requestReinspection(params: {
  projectId: string;
  equipmentId: string;
  actingUserId: string;
  items: EquipmentChecklistItemInput[];
}) {
  return runInspection({ ...params, requireOutOfService: true });
}
