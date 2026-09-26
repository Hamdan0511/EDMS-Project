import "server-only";

import { prisma } from "@/lib/prisma";

export type RecentActivityRow = {
  id: string;
  refNo: string;
  kind: "Incident" | "Near Miss" | "Observation" | "Hazard" | "Inspection" | "Corrective Action" | "Permit";
  title: string;
  location: string;
  date: Date;
  status: string;
  href: string;
};

export type HseDashboardData = {
  counts: {
    incidents: number;
    nearMisses: number;
    observations: number;
    hazards: number;
    inspections: number;
    correctiveActions: number;
    permits: number;
  };
  openItems: {
    openHazards: number;
    openIncidents: number;
    openNearMisses: number;
    openObservations: number;
    pendingInspections: number;
    overdueActions: number;
    permitsExpiringSoon: number;
  };
  myActions: {
    id: string;
    actionNumber: string;
    description: string;
    dueDate: Date | null;
    status: string;
  }[];
  recentActivity: RecentActivityRow[];
  attentionRequired: AttentionRow[];
};

export type AttentionRow = {
  id: string;
  kind: "Critical Incident" | "High-Risk Hazard" | "Overdue Action" | "Permit Expiring";
  title: string;
  detail: string;
  date: Date;
  href: string;
};

/** Every number here is a real, project-scoped, optionally date-ranged
 * PostgreSQL aggregate — never a hardcoded/illustrative value. */
export async function getHseDashboardData(params: {
  projectId: string;
  userId: string;
  dateFrom?: Date;
  dateTo?: Date;
}): Promise<HseDashboardData> {
  const { projectId, userId, dateFrom, dateTo } = params;
  const range = dateFrom && dateTo ? { gte: dateFrom, lte: dateTo } : undefined;
  const now = new Date();
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [incidents, nearMisses, observations, hazards, inspections, correctiveActions, permits] = await Promise.all([
    prisma.hseIncident.count({ where: { projectId, ...(range ? { incidentDate: range } : {}) } }),
    prisma.hseNearMiss.count({ where: { projectId, ...(range ? { reportedAt: range } : {}) } }),
    prisma.hseObservation.count({ where: { projectId, ...(range ? { reportedAt: range } : {}) } }),
    prisma.hseHazard.count({ where: { projectId, ...(range ? { createdAt: range } : {}) } }),
    prisma.hseInspection.count({ where: { projectId, ...(range ? { createdAt: range } : {}) } }),
    prisma.hseCorrectiveAction.count({ where: { projectId, ...(range ? { createdAt: range } : {}) } }),
    prisma.hsePermit.count({ where: { projectId, ...(range ? { createdAt: range } : {}) } }),
  ]);

  const [openHazards, openIncidents, openNearMisses, openObservations, pendingInspections, overdueActions, permitsExpiringSoon] =
    await Promise.all([
      prisma.hseHazard.count({ where: { projectId, status: { not: "CLOSED" } } }),
      prisma.hseIncident.count({ where: { projectId, status: { not: "CLOSED" } } }),
      prisma.hseNearMiss.count({ where: { projectId, status: { not: "CLOSED" } } }),
      prisma.hseObservation.count({ where: { projectId, status: { not: "CLOSED" } } }),
      prisma.hseInspection.count({ where: { projectId, status: { in: ["SCHEDULED", "IN_PROGRESS"] } } }),
      prisma.hseCorrectiveAction.count({
        where: { projectId, status: { notIn: ["VERIFIED", "CLOSED"] }, dueDate: { lt: now } },
      }),
      prisma.hsePermit.count({ where: { projectId, status: "ACTIVE", endDate: { gte: now, lte: in7Days } } }),
    ]);

  const myActionsRaw = await prisma.hseCorrectiveAction.findMany({
    where: { projectId, assignedToId: userId, status: { not: "CLOSED" } },
    orderBy: { dueDate: "asc" },
    take: 10,
  });

  const [criticalIncidents, highRiskHazards, overdueActionRows, expiringPermitRows] = await Promise.all([
    prisma.hseIncident.findMany({
      where: { projectId, severity: "CRITICAL", status: { not: "CLOSED" } },
      orderBy: { incidentDate: "desc" },
      take: 5,
    }),
    prisma.hseHazard.findMany({
      where: { projectId, status: { not: "CLOSED" }, initialRisk: { in: ["HIGH", "CRITICAL"] } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.hseCorrectiveAction.findMany({
      where: { projectId, status: { notIn: ["VERIFIED", "CLOSED"] }, dueDate: { lt: now } },
      orderBy: { dueDate: "asc" },
      take: 5,
    }),
    prisma.hsePermit.findMany({
      where: { projectId, status: "ACTIVE", endDate: { gte: now, lte: in7Days } },
      orderBy: { endDate: "asc" },
      take: 5,
    }),
  ]);

  function daysBetween(a: Date, b: Date): number {
    return Math.round(Math.abs(a.getTime() - b.getTime()) / (24 * 60 * 60 * 1000));
  }

  const attentionRequired: AttentionRow[] = [
    ...criticalIncidents.map((r) => ({
      id: r.id,
      kind: "Critical Incident" as const,
      title: r.title,
      detail: `${r.location} · ${daysBetween(now, r.incidentDate)}d ago`,
      date: r.incidentDate,
      href: `/hse/incidents/${r.id}`,
    })),
    ...highRiskHazards.map((r) => ({
      id: r.id,
      kind: "High-Risk Hazard" as const,
      title: r.hazard,
      detail: `${r.location} · ${r.initialRisk} risk`,
      date: r.createdAt,
      href: `/hse/hazards/${r.id}`,
    })),
    ...overdueActionRows.map((r) => ({
      id: r.id,
      kind: "Overdue Action" as const,
      title: r.description,
      detail: r.dueDate ? `Due ${r.dueDate.toLocaleDateString("en-GB")} · ${daysBetween(now, r.dueDate)}d overdue` : "Overdue",
      date: r.dueDate ?? r.createdAt,
      href: `/hse/corrective-actions/${r.id}`,
    })),
    ...expiringPermitRows.map((r) => ({
      id: r.id,
      kind: "Permit Expiring" as const,
      title: r.workDescription,
      detail: `${r.location} · Expires ${r.endDate.toLocaleDateString("en-GB")}`,
      date: r.endDate,
      href: `/hse/permits/${r.id}`,
    })),
  ].sort((a, b) => a.date.getTime() - b.date.getTime());

  const [recentIncidents, recentNearMisses, recentObservations, recentHazards, recentInspections, recentActions, recentPermits] =
    await Promise.all([
      prisma.hseIncident.findMany({ where: { projectId }, orderBy: { createdAt: "desc" }, take: 10 }),
      prisma.hseNearMiss.findMany({ where: { projectId }, orderBy: { createdAt: "desc" }, take: 10 }),
      prisma.hseObservation.findMany({ where: { projectId }, orderBy: { createdAt: "desc" }, take: 10 }),
      prisma.hseHazard.findMany({ where: { projectId }, orderBy: { createdAt: "desc" }, take: 10 }),
      prisma.hseInspection.findMany({ where: { projectId }, orderBy: { createdAt: "desc" }, take: 10, include: { template: true } }),
      prisma.hseCorrectiveAction.findMany({ where: { projectId }, orderBy: { createdAt: "desc" }, take: 10 }),
      prisma.hsePermit.findMany({ where: { projectId }, orderBy: { createdAt: "desc" }, take: 10 }),
    ]);

  const recentActivity: RecentActivityRow[] = [
    ...recentIncidents.map((r) => ({
      id: r.id,
      refNo: r.incidentNumber,
      kind: "Incident" as const,
      title: r.title,
      location: r.location,
      date: r.createdAt,
      status: r.status,
      href: `/hse/incidents/${r.id}`,
    })),
    ...recentNearMisses.map((r) => ({
      id: r.id,
      refNo: r.nearMissNumber,
      kind: "Near Miss" as const,
      title: r.title,
      location: r.location,
      date: r.createdAt,
      status: r.status,
      href: `/hse/near-misses/${r.id}`,
    })),
    ...recentObservations.map((r) => ({
      id: r.id,
      refNo: r.observationNumber,
      kind: "Observation" as const,
      title: r.title,
      location: r.location,
      date: r.createdAt,
      status: r.status,
      href: `/hse/observations/${r.id}`,
    })),
    ...recentHazards.map((r) => ({
      id: r.id,
      refNo: r.hazardNumber,
      kind: "Hazard" as const,
      title: r.hazard,
      location: r.location,
      date: r.createdAt,
      status: r.status,
      href: `/hse/hazards/${r.id}`,
    })),
    ...recentInspections.map((r) => ({
      id: r.id,
      refNo: r.inspectionNumber,
      kind: "Inspection" as const,
      title: r.template.name,
      location: r.location,
      date: r.createdAt,
      status: r.status,
      href: `/hse/inspections/${r.id}`,
    })),
    ...recentActions.map((r) => ({
      id: r.id,
      refNo: r.actionNumber,
      kind: "Corrective Action" as const,
      title: r.description,
      location: "",
      date: r.createdAt,
      status: r.status,
      href: `/hse/corrective-actions/${r.id}`,
    })),
    ...recentPermits.map((r) => ({
      id: r.id,
      refNo: r.permitNumber,
      kind: "Permit" as const,
      title: r.workDescription,
      location: r.location,
      date: r.createdAt,
      status: r.status,
      href: `/hse/permits/${r.id}`,
    })),
  ]
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 10);

  return {
    counts: { incidents, nearMisses, observations, hazards, inspections, correctiveActions, permits },
    openItems: { openHazards, openIncidents, openNearMisses, openObservations, pendingInspections, overdueActions, permitsExpiringSoon },
    myActions: myActionsRaw.map((a) => ({
      id: a.id,
      actionNumber: a.actionNumber,
      description: a.description,
      dueDate: a.dueDate,
      status: a.status,
    })),
    recentActivity,
    attentionRequired,
  };
}
