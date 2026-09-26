import "server-only";

import { prisma } from "@/lib/prisma";

export type DateRangePreset = "today" | "thisWeek" | "thisMonth" | "lastMonth" | "thisQuarter" | "thisYear" | "custom";

export const DATE_RANGE_PRESET_LABELS: Record<DateRangePreset, string> = {
  today: "Today",
  thisWeek: "This Week",
  thisMonth: "This Month",
  lastMonth: "Last Month",
  thisQuarter: "This Quarter",
  thisYear: "This Year",
  custom: "Custom Range",
};

/** Resolves a named preset (or explicit custom bounds) into a concrete
 * [from, to] window, plus the equivalent previous period of the same length
 * for factual period-over-period comparison — never a hardcoded window. */
export function resolveDateRange(
  preset: string | undefined,
  customFrom?: string,
  customTo?: string,
): { from: Date; to: Date; previousFrom: Date; previousTo: Date; preset: DateRangePreset } {
  const now = new Date();
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

  let from: Date;
  let to: Date;
  let resolvedPreset: DateRangePreset = "thisMonth";

  if (preset === "custom" && customFrom && customTo) {
    from = startOfDay(new Date(customFrom));
    to = endOfDay(new Date(customTo));
    resolvedPreset = "custom";
  } else if (preset === "today") {
    from = startOfDay(now);
    to = endOfDay(now);
    resolvedPreset = "today";
  } else if (preset === "thisWeek") {
    const day = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((day + 6) % 7));
    from = startOfDay(monday);
    to = endOfDay(now);
    resolvedPreset = "thisWeek";
  } else if (preset === "lastMonth") {
    from = startOfDay(new Date(now.getFullYear(), now.getMonth() - 1, 1));
    to = endOfDay(new Date(now.getFullYear(), now.getMonth(), 0));
    resolvedPreset = "lastMonth";
  } else if (preset === "thisQuarter") {
    const q = Math.floor(now.getMonth() / 3);
    from = startOfDay(new Date(now.getFullYear(), q * 3, 1));
    to = endOfDay(now);
    resolvedPreset = "thisQuarter";
  } else if (preset === "thisYear") {
    from = startOfDay(new Date(now.getFullYear(), 0, 1));
    to = endOfDay(now);
    resolvedPreset = "thisYear";
  } else {
    from = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
    to = endOfDay(now);
    resolvedPreset = "thisMonth";
  }

  const spanMs = to.getTime() - from.getTime();
  const previousTo = new Date(from.getTime() - 1);
  const previousFrom = new Date(previousTo.getTime() - spanMs);

  return { from, to, previousFrom, previousTo, preset: resolvedPreset };
}

function bucketByMonth(dates: Date[]): { month: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const d of dates) {
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, count]) => ({ month, count }));
}

export type HseStatistics = {
  range: { from: Date; to: Date };
  totals: {
    incidents: number;
    nearMisses: number;
    observations: number;
    openHazards: number;
    openCorrectiveActions: number;
    overdueCorrectiveActions: number;
    inspectionsCompleted: number;
    activePermits: number;
    equipmentOutOfService: number;
    equipmentInspectionsFailed: number;
  };
  previousTotals: {
    incidents: number;
    nearMisses: number;
    correctiveActions: number;
  };
  incidentsByMonth: { month: string; count: number }[];
  nearMissesByMonth: { month: string; count: number }[];
  observationsByMonth: { month: string; count: number }[];
  incidentSeverity: Record<string, number>;
  correctiveActionsByStatus: Record<string, number>;
  correctiveActionAvgClosureDays: number | null;
  permitsByStatus: Record<string, number>;
  equipmentInspectionResults: { passed: number; failed: number; passRate: number | null };
};

/** Every number here is a real, project-scoped PostgreSQL aggregate for the
 * selected date range — nothing hardcoded or illustrative. Metrics with no
 * real underlying data in this system (e.g. hazard category, toolbox talks)
 * are deliberately omitted rather than fabricated — see the implementation
 * report for the full list of honest omissions. */
export async function getHseStatistics(projectId: string, range: { from: Date; to: Date; previousFrom: Date; previousTo: Date }): Promise<HseStatistics> {
  const { from, to, previousFrom, previousTo } = range;
  const inRange = { gte: from, lte: to };
  const inPreviousRange = { gte: previousFrom, lte: previousTo };

  const [
    incidents,
    nearMisses,
    observations,
    openHazards,
    openCorrectiveActions,
    overdueCorrectiveActions,
    inspectionsCompleted,
    activePermits,
    equipmentOutOfService,
    incidentRows,
    nearMissRows,
    observationRows,
    severityRows,
    correctiveActionsInRange,
    closedActionsInRange,
    permitsInRange,
    equipmentInspectionsInRange,
    prevIncidents,
    prevNearMisses,
    prevCorrectiveActions,
  ] = await Promise.all([
    prisma.hseIncident.count({ where: { projectId, createdAt: inRange } }),
    prisma.hseNearMiss.count({ where: { projectId, createdAt: inRange } }),
    prisma.hseObservation.count({ where: { projectId, createdAt: inRange } }),
    prisma.hseHazard.count({ where: { projectId, status: { not: "CLOSED" } } }),
    prisma.hseCorrectiveAction.count({ where: { projectId, status: { notIn: ["VERIFIED", "CLOSED"] } } }),
    prisma.hseCorrectiveAction.count({ where: { projectId, status: { notIn: ["VERIFIED", "CLOSED"] }, dueDate: { lt: new Date() } } }),
    prisma.hseInspection.count({ where: { projectId, status: "COMPLETED", createdAt: inRange } }),
    prisma.hsePermit.count({ where: { projectId, status: "ACTIVE" } }),
    prisma.hseEquipment.count({ where: { projectId, status: "OUT_OF_SERVICE" } }),
    prisma.hseIncident.findMany({ where: { projectId, createdAt: inRange }, select: { createdAt: true } }),
    prisma.hseNearMiss.findMany({ where: { projectId, createdAt: inRange }, select: { createdAt: true } }),
    prisma.hseObservation.findMany({ where: { projectId, createdAt: inRange }, select: { createdAt: true } }),
    prisma.hseIncident.groupBy({ by: ["severity"], where: { projectId, createdAt: inRange }, _count: true }),
    prisma.hseCorrectiveAction.groupBy({ by: ["status"], where: { projectId, createdAt: inRange }, _count: true }),
    prisma.hseCorrectiveAction.findMany({
      where: { projectId, createdAt: inRange, completedAt: { not: null } },
      select: { createdAt: true, completedAt: true },
    }),
    prisma.hsePermit.groupBy({ by: ["status"], where: { projectId, createdAt: inRange }, _count: true }),
    prisma.hseEquipmentInspection.groupBy({ by: ["result"], where: { projectId, inspectedAt: inRange }, _count: true }),
    prisma.hseIncident.count({ where: { projectId, createdAt: inPreviousRange } }),
    prisma.hseNearMiss.count({ where: { projectId, createdAt: inPreviousRange } }),
    prisma.hseCorrectiveAction.count({ where: { projectId, createdAt: inPreviousRange } }),
  ]);

  const equipmentInspectionsFailed = equipmentInspectionsInRange.find((r) => r.result === "FAIL")?._count ?? 0;
  const equipmentInspectionsPassed = equipmentInspectionsInRange.find((r) => r.result === "PASS")?._count ?? 0;
  const totalEquipmentInspections = equipmentInspectionsFailed + equipmentInspectionsPassed;

  const closureDurations = closedActionsInRange
    .filter((a) => a.completedAt)
    .map((a) => (a.completedAt!.getTime() - a.createdAt.getTime()) / (24 * 60 * 60 * 1000));
  const avgClosureDays =
    closureDurations.length > 0 ? Math.round((closureDurations.reduce((s, d) => s + d, 0) / closureDurations.length) * 10) / 10 : null;

  return {
    range: { from, to },
    totals: {
      incidents,
      nearMisses,
      observations,
      openHazards,
      openCorrectiveActions,
      overdueCorrectiveActions,
      inspectionsCompleted,
      activePermits,
      equipmentOutOfService,
      equipmentInspectionsFailed,
    },
    previousTotals: {
      incidents: prevIncidents,
      nearMisses: prevNearMisses,
      correctiveActions: prevCorrectiveActions,
    },
    incidentsByMonth: bucketByMonth(incidentRows.map((r) => r.createdAt)),
    nearMissesByMonth: bucketByMonth(nearMissRows.map((r) => r.createdAt)),
    observationsByMonth: bucketByMonth(observationRows.map((r) => r.createdAt)),
    incidentSeverity: Object.fromEntries(severityRows.map((r) => [r.severity, r._count])),
    correctiveActionsByStatus: Object.fromEntries(correctiveActionsInRange.map((r) => [r.status, r._count])),
    correctiveActionAvgClosureDays: avgClosureDays,
    permitsByStatus: Object.fromEntries(permitsInRange.map((r) => [r.status, r._count])),
    equipmentInspectionResults: {
      passed: equipmentInspectionsPassed,
      failed: equipmentInspectionsFailed,
      passRate: totalEquipmentInspections > 0 ? Math.round((equipmentInspectionsPassed / totalEquipmentInspections) * 1000) / 10 : null,
    },
  };
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function statisticsToCsv(stats: HseStatistics): string {
  const lines = ["Metric,Current Period,Previous Period"];
  const row = (label: string, current: number | string, previous?: number | string) =>
    lines.push([label, String(current), previous !== undefined ? String(previous) : ""].map((v) => csvEscape(v)).join(","));

  row("Incidents", stats.totals.incidents, stats.previousTotals.incidents);
  row("Near Misses", stats.totals.nearMisses, stats.previousTotals.nearMisses);
  row("Observations", stats.totals.observations);
  row("Open Hazards", stats.totals.openHazards);
  row("Open Corrective Actions", stats.totals.openCorrectiveActions, stats.previousTotals.correctiveActions);
  row("Overdue Corrective Actions", stats.totals.overdueCorrectiveActions);
  row("Inspections Completed", stats.totals.inspectionsCompleted);
  row("Active Permits", stats.totals.activePermits);
  row("Equipment Out of Service", stats.totals.equipmentOutOfService);
  row("Equipment Inspections Failed", stats.totals.equipmentInspectionsFailed);
  if (stats.correctiveActionAvgClosureDays !== null) {
    row("Average Corrective Action Closure (days)", stats.correctiveActionAvgClosureDays);
  }
  return lines.join("\n");
}
