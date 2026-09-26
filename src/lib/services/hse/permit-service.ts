import "server-only";

import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { requirePermission } from "@/lib/auth/permissions";
import { computeNextNumber, hseNumberPrefix } from "@/lib/hse/numbering";
import type { HsePermitType, HsePermitStatus } from "@prisma/client";

export class PermitError extends Error {}

export const PERMIT_FORWARD_TRANSITIONS: Record<HsePermitStatus, HsePermitStatus[]> = {
  DRAFT: ["SUBMITTED"],
  SUBMITTED: ["UNDER_REVIEW", "REJECTED"],
  UNDER_REVIEW: ["APPROVED", "REJECTED"],
  APPROVED: ["ACTIVE"],
  ACTIVE: ["SUSPENDED", "CLOSED", "EXPIRED"],
  SUSPENDED: ["ACTIVE", "CLOSED"],
  REJECTED: ["DRAFT"],
  EXPIRED: [],
  CLOSED: [],
};

export async function createPermit(params: {
  projectId: string;
  requestedById: string;
  type: HsePermitType;
  location: string;
  workDescription: string;
  contractorOrg?: string;
  startDate: Date;
  endDate: Date;
  hazards?: string;
  controls?: string;
  requiredPpe?: string;
  precautions?: string;
}) {
  const { projectId, requestedById } = params;
  await requirePermission(requestedById, "HSE_MANAGE_PERMITS", { projectId });

  if (!params.location.trim()) throw new PermitError("Location is required.");
  if (!params.workDescription.trim()) throw new PermitError("Work description is required.");
  if (Number.isNaN(params.startDate.getTime()) || Number.isNaN(params.endDate.getTime())) {
    throw new PermitError("Valid start and end dates are required.");
  }
  if (params.endDate < params.startDate) throw new PermitError("End date cannot be before the start date.");

  const prefix = hseNumberPrefix("PTW");
  const existing = await prisma.hsePermit.findMany({
    where: { projectId, permitNumber: { startsWith: prefix } },
    select: { permitNumber: true },
  });
  const permitNumber = computeNextNumber(existing.map((e) => e.permitNumber), prefix);

  const permit = await prisma.hsePermit.create({
    data: {
      projectId,
      permitNumber,
      type: params.type,
      location: params.location.trim(),
      workDescription: params.workDescription.trim(),
      contractorOrg: params.contractorOrg?.trim() || null,
      requestedById,
      startDate: params.startDate,
      endDate: params.endDate,
      hazards: params.hazards?.trim() || null,
      controls: params.controls?.trim() || null,
      requiredPpe: params.requiredPpe?.trim() || null,
      precautions: params.precautions?.trim() || null,
    },
  });

  await logAudit({
    userId: requestedById,
    projectId,
    action: "HSE_PERMIT_CREATED",
    entityType: "HsePermit",
    entityId: permit.id,
    metadata: { permitNumber, type: params.type },
  });

  return permit;
}

export async function updatePermitStatus(params: {
  id: string;
  projectId: string;
  actingUserId: string;
  status: HsePermitStatus;
  comment?: string;
}) {
  const { id, projectId, actingUserId, status } = params;
  await requirePermission(actingUserId, "HSE_MANAGE_PERMITS", { projectId });

  const existing = await prisma.hsePermit.findFirst({ where: { id, projectId } });
  if (!existing) throw new PermitError("Permit not found.");

  const allowed = PERMIT_FORWARD_TRANSITIONS[existing.status] ?? [];
  if (!allowed.includes(status)) {
    throw new PermitError(`A permit in "${existing.status}" cannot move to "${status}".`);
  }

  const [permit] = await prisma.$transaction([
    prisma.hsePermit.update({ where: { id }, data: { status } }),
    prisma.hsePermitApproval.create({
      data: {
        permitId: id,
        approverId: actingUserId,
        decision: status,
        comment: params.comment?.trim() || null,
        decidedAt: new Date(),
      },
    }),
  ]);

  await logAudit({
    userId: actingUserId,
    projectId,
    action: "HSE_PERMIT_STATUS_CHANGED",
    entityType: "HsePermit",
    entityId: id,
    metadata: { from: existing.status, to: status },
  });

  return permit;
}
