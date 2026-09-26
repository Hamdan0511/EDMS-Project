import "server-only";

import { prisma } from "@/lib/prisma";

export type HseReportType =
  | "observations"
  | "incidents"
  | "nearMisses"
  | "hazards"
  | "riskAssessments"
  | "inspections"
  | "correctiveActions"
  | "permits";

export const HSE_REPORT_TYPE_LABELS: Record<HseReportType, string> = {
  observations: "Observations",
  incidents: "Incidents",
  nearMisses: "Near Misses",
  hazards: "Hazards",
  riskAssessments: "Risk Assessments",
  inspections: "Inspections",
  correctiveActions: "Corrective Actions",
  permits: "Permits to Work",
};

export type HseReportRow = {
  refNo: string;
  title: string;
  location: string;
  date: Date;
  status: string;
  detailHref: string;
};

export type HseReportFilters = {
  status?: string;
  dateFrom?: Date;
  dateTo?: Date;
  q?: string;
};

/** Every report query is real, project-scoped Prisma data — never a
 * hardcoded or cached result set — filtered by the same params the page
 * and the CSV export both receive, so what you see is what you export. */
export async function queryHseReport(type: HseReportType, projectId: string, filters: HseReportFilters): Promise<HseReportRow[]> {
  const qWhere = filters.q?.trim() ? filters.q.trim() : undefined;

  switch (type) {
    case "observations": {
      const rows = await prisma.hseObservation.findMany({
        where: {
          projectId,
          ...(filters.status ? { status: filters.status as never } : {}),
          ...(filters.dateFrom || filters.dateTo
            ? { createdAt: { gte: filters.dateFrom, lte: filters.dateTo } }
            : {}),
          ...(qWhere ? { OR: [{ observationNumber: { contains: qWhere, mode: "insensitive" } }, { title: { contains: qWhere, mode: "insensitive" } }] } : {}),
        },
        orderBy: { createdAt: "desc" },
      });
      return rows.map((r) => ({
        refNo: r.observationNumber,
        title: r.title,
        location: r.location,
        date: r.createdAt,
        status: r.status,
        detailHref: `/hse/observations/${r.id}`,
      }));
    }
    case "incidents": {
      const rows = await prisma.hseIncident.findMany({
        where: {
          projectId,
          ...(filters.status ? { status: filters.status as never } : {}),
          ...(filters.dateFrom || filters.dateTo
            ? { incidentDate: { gte: filters.dateFrom, lte: filters.dateTo } }
            : {}),
          ...(qWhere ? { OR: [{ incidentNumber: { contains: qWhere, mode: "insensitive" } }, { title: { contains: qWhere, mode: "insensitive" } }] } : {}),
        },
        orderBy: { incidentDate: "desc" },
      });
      return rows.map((r) => ({
        refNo: r.incidentNumber,
        title: r.title,
        location: r.location,
        date: r.incidentDate,
        status: r.status,
        detailHref: `/hse/incidents/${r.id}`,
      }));
    }
    case "nearMisses": {
      const rows = await prisma.hseNearMiss.findMany({
        where: {
          projectId,
          ...(filters.status ? { status: filters.status as never } : {}),
          ...(filters.dateFrom || filters.dateTo
            ? { createdAt: { gte: filters.dateFrom, lte: filters.dateTo } }
            : {}),
          ...(qWhere ? { OR: [{ nearMissNumber: { contains: qWhere, mode: "insensitive" } }, { title: { contains: qWhere, mode: "insensitive" } }] } : {}),
        },
        orderBy: { createdAt: "desc" },
      });
      return rows.map((r) => ({
        refNo: r.nearMissNumber,
        title: r.title,
        location: r.location,
        date: r.createdAt,
        status: r.status,
        detailHref: `/hse/near-misses/${r.id}`,
      }));
    }
    case "hazards": {
      const rows = await prisma.hseHazard.findMany({
        where: {
          projectId,
          ...(filters.status ? { status: filters.status as never } : {}),
          ...(filters.dateFrom || filters.dateTo
            ? { createdAt: { gte: filters.dateFrom, lte: filters.dateTo } }
            : {}),
          ...(qWhere ? { OR: [{ hazardNumber: { contains: qWhere, mode: "insensitive" } }, { hazard: { contains: qWhere, mode: "insensitive" } }] } : {}),
        },
        orderBy: { createdAt: "desc" },
      });
      return rows.map((r) => ({
        refNo: r.hazardNumber,
        title: r.hazard,
        location: r.location,
        date: r.createdAt,
        status: r.status,
        detailHref: `/hse/hazards/${r.id}`,
      }));
    }
    case "riskAssessments": {
      const rows = await prisma.hseRiskAssessment.findMany({
        where: {
          projectId,
          ...(filters.status ? { status: filters.status as never } : {}),
          ...(filters.dateFrom || filters.dateTo
            ? { createdAt: { gte: filters.dateFrom, lte: filters.dateTo } }
            : {}),
          ...(qWhere ? { OR: [{ assessmentNumber: { contains: qWhere, mode: "insensitive" } }, { activity: { contains: qWhere, mode: "insensitive" } }] } : {}),
        },
        orderBy: { createdAt: "desc" },
      });
      return rows.map((r) => ({
        refNo: r.assessmentNumber,
        title: r.activity,
        location: "—",
        date: r.createdAt,
        status: r.status,
        detailHref: `/hse/risk-assessments/${r.id}`,
      }));
    }
    case "inspections": {
      const rows = await prisma.hseInspection.findMany({
        where: {
          projectId,
          ...(filters.status ? { status: filters.status as never } : {}),
          ...(filters.dateFrom || filters.dateTo
            ? { createdAt: { gte: filters.dateFrom, lte: filters.dateTo } }
            : {}),
          ...(qWhere ? { OR: [{ inspectionNumber: { contains: qWhere, mode: "insensitive" } }, { location: { contains: qWhere, mode: "insensitive" } }] } : {}),
        },
        orderBy: { createdAt: "desc" },
      });
      return rows.map((r) => ({
        refNo: r.inspectionNumber,
        title: r.result ?? "—",
        location: r.location,
        date: r.createdAt,
        status: r.status,
        detailHref: `/hse/inspections/${r.id}`,
      }));
    }
    case "correctiveActions": {
      const rows = await prisma.hseCorrectiveAction.findMany({
        where: {
          projectId,
          ...(filters.status ? { status: filters.status as never } : {}),
          ...(filters.dateFrom || filters.dateTo
            ? { createdAt: { gte: filters.dateFrom, lte: filters.dateTo } }
            : {}),
          ...(qWhere ? { OR: [{ actionNumber: { contains: qWhere, mode: "insensitive" } }, { description: { contains: qWhere, mode: "insensitive" } }] } : {}),
        },
        orderBy: { createdAt: "desc" },
      });
      return rows.map((r) => ({
        refNo: r.actionNumber,
        title: r.description,
        location: "—",
        date: r.createdAt,
        status: r.status,
        detailHref: `/hse/corrective-actions/${r.id}`,
      }));
    }
    case "permits": {
      const rows = await prisma.hsePermit.findMany({
        where: {
          projectId,
          ...(filters.status ? { status: filters.status as never } : {}),
          ...(filters.dateFrom || filters.dateTo
            ? { createdAt: { gte: filters.dateFrom, lte: filters.dateTo } }
            : {}),
          ...(qWhere ? { OR: [{ permitNumber: { contains: qWhere, mode: "insensitive" } }, { location: { contains: qWhere, mode: "insensitive" } }] } : {}),
        },
        orderBy: { createdAt: "desc" },
      });
      return rows.map((r) => ({
        refNo: r.permitNumber,
        title: r.workDescription,
        location: r.location,
        date: r.createdAt,
        status: r.status,
        detailHref: `/hse/permits/${r.id}`,
      }));
    }
  }
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function toCsv(rows: HseReportRow[]): string {
  const header = ["Ref No.", "Title", "Location", "Date", "Status"];
  const lines = [header.join(",")];
  for (const r of rows) {
    lines.push(
      [r.refNo, r.title, r.location, r.date.toISOString().slice(0, 10), r.status]
        .map((v) => csvEscape(String(v)))
        .join(","),
    );
  }
  return lines.join("\n");
}
