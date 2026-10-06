import "server-only";

import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { requirePermission } from "@/lib/auth/permissions";
import { computeNextNumber, fieldNumberPrefix } from "@/lib/field/numbering";

export class ItpError extends Error {}

const MANAGE_PERMISSION = "FIELD_MANAGE_ITP";
const APPROVE_PERMISSION = "FIELD_ITP_APPROVE";

export async function createItp(params: {
  projectId: string;
  createdById: string;
  title: string;
  revision?: string;
  discipline?: string;
  activity?: string;
  description?: string;
  areaId?: string;
  responsibleOrgId?: string;
  items: { activity: string; inspectionType: string; responsibleOrgId?: string; acceptanceCriteria?: string }[];
}) {
  const { projectId, createdById } = params;
  await requirePermission(createdById, MANAGE_PERMISSION, { projectId });

  if (!params.title.trim()) throw new ItpError("Title is required.");
  if (params.items.length === 0) throw new ItpError("At least one ITP activity is required.");
  for (const item of params.items) {
    if (!item.activity.trim()) throw new ItpError("Every ITP activity requires a description.");
    if (!["R", "S", "W", "H"].includes(item.inspectionType)) throw new ItpError("Invalid inspection classification.");
  }
  if (params.areaId) {
    const area = await prisma.fieldArea.findFirst({ where: { id: params.areaId, projectId } });
    if (!area) throw new ItpError("Selected location does not belong to this project.");
  }

  const prefix = fieldNumberPrefix("ITP");
  const existing = await prisma.fieldItp.findMany({
    where: { projectId, itpNumber: { startsWith: prefix } },
    select: { itpNumber: true },
  });
  const itpNumber = computeNextNumber(existing.map((e) => e.itpNumber), prefix);

  const itp = await prisma.fieldItp.create({
    data: {
      projectId,
      itpNumber,
      title: params.title.trim(),
      revision: params.revision?.trim() || "A",
      discipline: params.discipline?.trim() || null,
      activity: params.activity?.trim() || null,
      description: params.description?.trim() || null,
      areaId: params.areaId ?? null,
      responsibleOrgId: params.responsibleOrgId ?? null,
      createdById,
      items: {
        create: params.items.map((it, i) => ({
          sequence: i + 1,
          activity: it.activity.trim(),
          inspectionType: it.inspectionType as never,
          responsibleOrgId: it.responsibleOrgId ?? null,
          acceptanceCriteria: it.acceptanceCriteria?.trim() || null,
        })),
      },
    },
    include: { items: true },
  });

  await logAudit({
    userId: createdById,
    projectId,
    action: "FIELD_ITP_CREATED",
    entityType: "FieldItp",
    entityId: itp.id,
    metadata: { itpNumber, itemCount: itp.items.length },
  });

  return itp;
}

/** Approving the ITP document is the ONLY place HOLD_ACTIVE is ever set —
 * and only on H-classified items, never any other classification. This is
 * the real "hold point active" moment, not a cosmetic badge. */
export async function approveItp(params: { id: string; projectId: string; actingUserId: string }) {
  const { id, projectId, actingUserId } = params;
  await requirePermission(actingUserId, APPROVE_PERMISSION, { projectId });

  const itp = await prisma.fieldItp.findFirst({ where: { id, projectId }, include: { items: true } });
  if (!itp) throw new ItpError("ITP not found.");
  if (itp.status === "APPROVED") throw new ItpError("This ITP has already been approved.");

  await prisma.$transaction([
    prisma.fieldItp.update({ where: { id }, data: { status: "APPROVED" } }),
    prisma.fieldItpItem.updateMany({
      where: { itpId: id, inspectionType: "H", status: "PENDING" },
      data: { status: "HOLD_ACTIVE" },
    }),
  ]);

  await logAudit({
    userId: actingUserId,
    projectId,
    action: "FIELD_ITP_APPROVED",
    entityType: "FieldItp",
    entityId: id,
  });

  return prisma.fieldItp.findUnique({ where: { id }, include: { items: true } });
}

export async function rejectItp(params: { id: string; projectId: string; actingUserId: string }) {
  const { id, projectId, actingUserId } = params;
  await requirePermission(actingUserId, APPROVE_PERMISSION, { projectId });

  const itp = await prisma.fieldItp.findFirst({ where: { id, projectId } });
  if (!itp) throw new ItpError("ITP not found.");

  const updated = await prisma.fieldItp.update({ where: { id }, data: { status: "REJECTED" } });

  await logAudit({
    userId: actingUserId,
    projectId,
    action: "FIELD_ITP_REJECTED",
    entityType: "FieldItp",
    entityId: id,
  });

  return updated;
}

/** Any project member with manage access can request inspection once a
 * hold point is active. */
export async function requestHoldPointInspection(params: { itemId: string; projectId: string; actingUserId: string }) {
  const { itemId, projectId, actingUserId } = params;
  await requirePermission(actingUserId, MANAGE_PERMISSION, { projectId });

  const item = await prisma.fieldItpItem.findFirst({ where: { id: itemId, itp: { projectId } } });
  if (!item) throw new ItpError("ITP activity not found.");
  if (item.status !== "HOLD_ACTIVE") {
    throw new ItpError("Inspection can only be requested while the hold point is active.");
  }

  const updated = await prisma.fieldItpItem.update({
    where: { id: itemId },
    data: { status: "INSPECTION_REQUESTED", requestedAt: new Date() },
  });

  await logAudit({
    userId: actingUserId,
    projectId,
    action: "FIELD_ITP_INSPECTION_REQUESTED",
    entityType: "FieldItpItem",
    entityId: itemId,
  });

  return updated;
}

/** The ONLY place a hold point ever becomes RELEASED — always as the direct
 * output of an authorized approval decision, atomic with the decision
 * record (decidedById/decidedAt/decisionNote). No route anywhere accepts a
 * direct `status: RELEASED` write. */
export async function approveHoldPoint(params: { itemId: string; projectId: string; actingUserId: string; note?: string }) {
  const { itemId, projectId, actingUserId } = params;
  await requirePermission(actingUserId, APPROVE_PERMISSION, { projectId });

  const item = await prisma.fieldItpItem.findFirst({ where: { id: itemId, itp: { projectId } } });
  if (!item) throw new ItpError("ITP activity not found.");
  if (item.status !== "INSPECTION_REQUESTED") {
    throw new ItpError("A hold point can only be released after an inspection has been requested.");
  }

  const updated = await prisma.fieldItpItem.update({
    where: { id: itemId },
    data: { status: "RELEASED", decidedById: actingUserId, decidedAt: new Date(), decisionNote: params.note?.trim() || null },
  });

  await logAudit({
    userId: actingUserId,
    projectId,
    action: "FIELD_ITP_HOLD_POINT_RELEASED",
    entityType: "FieldItpItem",
    entityId: itemId,
  });

  return updated;
}

/** Rejection sends the hold point back into rework — it does NOT close or
 * release anything, and a fresh inspection must be requested before release
 * can be attempted again. */
export async function rejectHoldPoint(params: { itemId: string; projectId: string; actingUserId: string; note?: string }) {
  const { itemId, projectId, actingUserId } = params;
  await requirePermission(actingUserId, APPROVE_PERMISSION, { projectId });

  const item = await prisma.fieldItpItem.findFirst({ where: { id: itemId, itp: { projectId } } });
  if (!item) throw new ItpError("ITP activity not found.");
  if (item.status !== "INSPECTION_REQUESTED") {
    throw new ItpError("Only an activity with a requested inspection can be rejected.");
  }

  const updated = await prisma.fieldItpItem.update({
    where: { id: itemId },
    data: { status: "HOLD_ACTIVE", decidedById: actingUserId, decidedAt: new Date(), decisionNote: params.note?.trim() || null },
  });

  await logAudit({
    userId: actingUserId,
    projectId,
    action: "FIELD_ITP_HOLD_POINT_REJECTED",
    entityType: "FieldItpItem",
    entityId: itemId,
  });

  return updated;
}
