import "server-only";

import { prisma } from "@/lib/prisma";

export type FieldOpenItem = {
  id: string;
  kind: "Observation" | "Issue" | "Punch Item" | "Inspection";
  number: string;
  title: string;
  href: string;
  dueDate: Date | null;
};

/** Real, queried "assigned to me" list — not a notification system (none
 * exists in this app), just the honest set of records where this user is
 * the responsible/assigned party and the record is still open. */
export async function getMyOpenFieldItems(projectId: string, userId: string): Promise<FieldOpenItem[]> {
  const [observations, issues, punchItems, inspections] = await Promise.all([
    prisma.fieldObservation.findMany({
      where: { projectId, responsibleUserId: userId, status: { notIn: ["VERIFIED", "CLOSED"] } },
      orderBy: { dueDate: "asc" },
    }),
    prisma.fieldIssue.findMany({
      where: { projectId, responsibleUserId: userId, status: { notIn: ["VERIFIED", "CLOSED"] } },
      orderBy: { dueDate: "asc" },
    }),
    prisma.fieldPunchItem.findMany({
      where: { projectId, responsibleUserId: userId, status: { notIn: ["VERIFIED", "CLOSED"] } },
      orderBy: { dueDate: "asc" },
    }),
    prisma.fieldInspection.findMany({
      where: { projectId, assigneeId: userId, status: { in: ["ASSIGNED", "IN_PROGRESS"] } },
      include: { template: true },
      orderBy: { dueDate: "asc" },
    }),
  ]);

  const items: FieldOpenItem[] = [
    ...observations.map((o) => ({ id: o.id, kind: "Observation" as const, number: o.observationNumber, title: o.title, href: `/field/observations/${o.id}`, dueDate: o.dueDate })),
    ...issues.map((i) => ({ id: i.id, kind: "Issue" as const, number: i.issueNumber, title: i.title, href: `/field/issues/${i.id}`, dueDate: i.dueDate })),
    ...punchItems.map((p) => ({ id: p.id, kind: "Punch Item" as const, number: p.punchItemNumber, title: p.title, href: `/field/punch/${p.id}`, dueDate: p.dueDate })),
    ...inspections.map((i) => ({ id: i.id, kind: "Inspection" as const, number: i.inspectionNumber, title: i.template.name, href: `/field/inspections/${i.id}`, dueDate: i.dueDate })),
  ];

  return items.sort((a, b) => {
    if (!a.dueDate && !b.dueDate) return 0;
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return a.dueDate.getTime() - b.dueDate.getTime();
  });
}

export type FieldDashboardCounts = {
  myOpenItems: number;
  activeHoldPoints: number;
  pendingRetests: number;
  openIssues: number;
};

export async function getFieldDashboardCounts(projectId: string, userId: string): Promise<FieldDashboardCounts> {
  const [myOpen, activeHoldPoints, pendingRetests, openIssues] = await Promise.all([
    getMyOpenFieldItems(projectId, userId).then((items) => items.length),
    prisma.fieldItpItem.count({ where: { itp: { projectId }, status: { in: ["HOLD_ACTIVE", "INSPECTION_REQUESTED"] } } }),
    prisma.fieldTest.count({ where: { projectId, resultStatus: "FAIL", retest: null } }),
    prisma.fieldIssue.count({ where: { projectId, status: { notIn: ["VERIFIED", "CLOSED"] } } }),
  ]);

  return { myOpenItems: myOpen, activeHoldPoints, pendingRetests, openIssues };
}

export type FieldActivityEvent = {
  id: string;
  actorName: string;
  action: string;
  entityType: string;
  entityId: string;
  createdAt: Date;
};

/** Real recent activity across every Field record type in the project —
 * reuses the existing AuditLog table directly (same source as every
 * per-record Audit Trail tab), just unscoped from a single entity. */
export async function getRecentFieldActivity(projectId: string, limit = 15): Promise<FieldActivityEvent[]> {
  const rows = await prisma.auditLog.findMany({
    where: { projectId, action: { startsWith: "FIELD_" } },
    include: { user: true },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return rows.map((r) => ({
    id: r.id,
    actorName: r.user?.name ?? "System",
    action: r.action,
    entityType: r.entityType,
    entityId: r.entityId,
    createdAt: r.createdAt,
  }));
}

/** Maps an AuditLog entityType to the real detail-page href, so the
 * activity feed links somewhere genuine instead of being inert text. */
export function fieldActivityHref(entityType: string, entityId: string): string | null {
  switch (entityType) {
    case "FieldObservation":
      return `/field/observations/${entityId}`;
    case "FieldInspection":
      return `/field/inspections/${entityId}`;
    case "FieldIssue":
      return `/field/issues/${entityId}`;
    case "FieldPunchItem":
      return `/field/punch/${entityId}`;
    case "FieldPunchlist":
      return `/field/punch/lists/${entityId}`;
    case "FieldItp":
      return `/field/itp/${entityId}`;
    case "FieldTest":
      return `/field/tests/${entityId}`;
    case "FieldArea":
      return `/field/areas/${entityId}`;
    case "FieldSiteWalk":
      return `/field/site-walks/${entityId}`;
    default:
      return null;
  }
}
