import "server-only";

import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { requireAnyPermission } from "@/lib/auth/permissions";

export class SiteWalkError extends Error {}

/** Starting a walk requires at least one real Field "manage" permission —
 * mirrors the Site Areas convention exactly, since a walk is shared
 * infrastructure that spans whichever record types get captured during it. */
export const START_WALK_PERMISSIONS = [
  "FIELD_MANAGE_OBSERVATIONS",
  "FIELD_MANAGE_ISSUES",
  "FIELD_MANAGE_PUNCH",
  "FIELD_MANAGE_PHOTOS",
];

export async function startSiteWalk(params: {
  projectId: string;
  actingUserId: string;
  purpose: string;
  areaId?: string;
}) {
  const { projectId, actingUserId } = params;
  await requireAnyPermission(actingUserId, START_WALK_PERMISSIONS, { projectId });

  if (!params.purpose.trim()) throw new SiteWalkError("Purpose is required.");

  if (params.areaId) {
    const area = await prisma.fieldArea.findFirst({ where: { id: params.areaId, projectId } });
    if (!area) throw new SiteWalkError("Selected location does not belong to this project.");
  }

  const walk = await prisma.fieldSiteWalk.create({
    data: {
      projectId,
      purpose: params.purpose.trim(),
      areaId: params.areaId ?? null,
      startedById: actingUserId,
    },
  });

  await logAudit({
    userId: actingUserId,
    projectId,
    action: "FIELD_SITE_WALK_STARTED",
    entityType: "FieldSiteWalk",
    entityId: walk.id,
    metadata: { purpose: walk.purpose },
  });

  return walk;
}

export async function endSiteWalk(params: { id: string; projectId: string; actingUserId: string }) {
  const { id, projectId, actingUserId } = params;
  await requireAnyPermission(actingUserId, START_WALK_PERMISSIONS, { projectId });

  const existing = await prisma.fieldSiteWalk.findFirst({ where: { id, projectId } });
  if (!existing) throw new SiteWalkError("Site walk not found.");
  if (existing.endedAt) throw new SiteWalkError("This site walk has already ended.");

  const walk = await prisma.fieldSiteWalk.update({ where: { id }, data: { endedAt: new Date() } });

  await logAudit({
    userId: actingUserId,
    projectId,
    action: "FIELD_SITE_WALK_ENDED",
    entityType: "FieldSiteWalk",
    entityId: walk.id,
    metadata: {},
  });

  return walk;
}

/** Real counts of everything captured while this walk was active — used by
 * both the walk summary page and (once built) the Site Walk report. */
export async function getSiteWalkSummary(id: string, projectId: string) {
  const walk = await prisma.fieldSiteWalk.findFirst({
    where: { id, projectId },
    include: { area: true, startedBy: true },
  });
  if (!walk) throw new SiteWalkError("Site walk not found.");

  const [observations, issues, punchItems, photos] = await Promise.all([
    prisma.fieldObservation.findMany({ where: { siteWalkId: id }, include: { area: true }, orderBy: { createdAt: "desc" } }),
    prisma.fieldIssue.findMany({ where: { siteWalkId: id }, include: { area: true }, orderBy: { createdAt: "desc" } }),
    prisma.fieldPunchItem.findMany({ where: { siteWalkId: id }, include: { area: true }, orderBy: { createdAt: "desc" } }),
    prisma.fieldPhoto.findMany({ where: { siteWalkId: id }, include: { attachment: true, area: true }, orderBy: { createdAt: "desc" } }),
  ]);

  return { walk, observations, issues, punchItems, photos };
}

export async function listSiteWalks(projectId: string) {
  return prisma.fieldSiteWalk.findMany({
    where: { projectId },
    include: {
      area: true,
      startedBy: true,
      _count: { select: { observations: true, issues: true, punchItems: true, photos: true } },
    },
    orderBy: { startedAt: "desc" },
  });
}

/** Validates a client-supplied siteWalkId belongs to this project and is
 * still active before letting a create-service attach a new record to it —
 * never trust the id blindly, and never allow tagging a walk that already
 * ended. */
export async function assertActiveSiteWalk(siteWalkId: string, projectId: string) {
  const walk = await prisma.fieldSiteWalk.findFirst({ where: { id: siteWalkId, projectId } });
  if (!walk) throw new SiteWalkError("Site walk not found in this project.");
  if (walk.endedAt) throw new SiteWalkError("This site walk has already ended and can no longer capture new records.");
  return walk;
}

