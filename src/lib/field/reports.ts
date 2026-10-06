import "server-only";

import { prisma } from "@/lib/prisma";
import { getSiteWalkSummary } from "@/lib/services/field/site-walk-service";
import {
  OBSERVATION_STATUS_LABELS,
  INSPECTION_STATUS_LABELS,
  ISSUE_STATUS_LABELS,
  PUNCH_ITEM_STATUS_LABELS,
  ITP_STATUS_LABELS,
  ITP_ITEM_STATUS_LABELS,
  TEST_RESULT_LABELS,
  PRIORITY_LABELS,
} from "@/lib/field/status";

export type FieldReportType =
  | "observations"
  | "inspections"
  | "issues"
  | "punch"
  | "itp"
  | "tests"
  | "site-walk";

export const FIELD_REPORT_TYPES: { key: FieldReportType; label: string; description: string; needsWalk?: boolean }[] = [
  { key: "observations", label: "Site Observations Report", description: "All observations recorded in the selected date range." },
  { key: "inspections", label: "Quality Inspections Report", description: "Inspection results with pass/fail outcomes." },
  { key: "issues", label: "Site Issues Report", description: "Issues with status, responsible party, and verification." },
  { key: "punch", label: "Punch List Report", description: "Punch items with completion status by punchlist." },
  { key: "itp", label: "ITP & Hold Point Status Report", description: "ITP items with classification and hold point status." },
  { key: "tests", label: "Test & Inspection Results Report", description: "Test results including retest chains." },
  { key: "site-walk", label: "Site Walk Summary Report", description: "Everything captured during a specific site walk.", needsWalk: true },
];

export type FieldReportFilters = {
  dateFrom?: Date;
  dateTo?: Date;
  areaId?: string;
  walkId?: string;
};

export type FieldReportTable = {
  title: string;
  description: string;
  generatedAt: Date;
  filtersSummary: string;
  columns: string[];
  rows: string[][];
};

function dateRangeWhere(dateFrom?: Date, dateTo?: Date) {
  if (!dateFrom && !dateTo) return undefined;
  return { ...(dateFrom ? { gte: dateFrom } : {}), ...(dateTo ? { lte: dateTo } : {}) };
}

function summarizeFilters(filters: FieldReportFilters, areaName?: string | null): string {
  const parts: string[] = [];
  if (filters.dateFrom) parts.push(`From ${filters.dateFrom.toLocaleDateString("en-GB")}`);
  if (filters.dateTo) parts.push(`To ${filters.dateTo.toLocaleDateString("en-GB")}`);
  if (areaName) parts.push(`Location: ${areaName}`);
  return parts.length > 0 ? parts.join(" · ") : "All records";
}

export async function getFieldReportTable(type: FieldReportType, projectId: string, filters: FieldReportFilters): Promise<FieldReportTable> {
  const createdAtRange = dateRangeWhere(filters.dateFrom, filters.dateTo);
  const area = filters.areaId ? await prisma.fieldArea.findFirst({ where: { id: filters.areaId, projectId } }) : null;
  const areaFilter = filters.areaId ? { areaId: filters.areaId } : {};

  switch (type) {
    case "observations": {
      const rows = await prisma.fieldObservation.findMany({
        where: { projectId, ...areaFilter, ...(createdAtRange ? { createdAt: createdAtRange } : {}) },
        include: { area: true, type: true, responsibleUser: true },
        orderBy: { createdAt: "desc" },
      });
      return {
        title: "Site Observations Report",
        description: "All observations recorded in the selected date range.",
        generatedAt: new Date(),
        filtersSummary: summarizeFilters(filters, area?.name),
        columns: ["Obs. No.", "Title", "Type", "Location", "Priority", "Responsible", "Status", "Created"],
        rows: rows.map((r) => [
          r.observationNumber,
          r.title,
          r.type?.name ?? "—",
          r.area?.name ?? "—",
          PRIORITY_LABELS[r.priority],
          r.responsibleUser?.name ?? "—",
          OBSERVATION_STATUS_LABELS[r.status],
          r.createdAt.toLocaleDateString("en-GB"),
        ]),
      };
    }
    case "inspections": {
      const rows = await prisma.fieldInspection.findMany({
        where: { projectId, ...areaFilter, ...(createdAtRange ? { createdAt: createdAtRange } : {}) },
        include: { area: true, template: true, assignee: true, inspector: true },
        orderBy: { createdAt: "desc" },
      });
      return {
        title: "Quality Inspections Report",
        description: "Inspection results with pass/fail outcomes.",
        generatedAt: new Date(),
        filtersSummary: summarizeFilters(filters, area?.name),
        columns: ["Insp. No.", "Template", "Location", "Assignee", "Inspector", "Status", "Created"],
        rows: rows.map((r) => [
          r.inspectionNumber,
          r.template.name,
          r.area?.name ?? "—",
          r.assignee?.name ?? "—",
          r.inspector?.name ?? "—",
          INSPECTION_STATUS_LABELS[r.status],
          r.createdAt.toLocaleDateString("en-GB"),
        ]),
      };
    }
    case "issues": {
      const rows = await prisma.fieldIssue.findMany({
        where: { projectId, ...areaFilter, ...(createdAtRange ? { createdAt: createdAtRange } : {}) },
        include: { area: true, responsibleUser: true, verifiedBy: true },
        orderBy: { createdAt: "desc" },
      });
      return {
        title: "Site Issues Report",
        description: "Issues with status, responsible party, and verification.",
        generatedAt: new Date(),
        filtersSummary: summarizeFilters(filters, area?.name),
        columns: ["Issue No.", "Title", "Location", "Priority", "Responsible", "Status", "Verified By", "Created"],
        rows: rows.map((r) => [
          r.issueNumber,
          r.title,
          r.area?.name ?? "—",
          PRIORITY_LABELS[r.priority],
          r.responsibleUser?.name ?? "—",
          ISSUE_STATUS_LABELS[r.status],
          r.verifiedBy?.name ?? "—",
          r.createdAt.toLocaleDateString("en-GB"),
        ]),
      };
    }
    case "punch": {
      const rows = await prisma.fieldPunchItem.findMany({
        where: { projectId, ...areaFilter, ...(createdAtRange ? { createdAt: createdAtRange } : {}) },
        include: { area: true, trade: true, punchlist: true, responsibleUser: true },
        orderBy: { createdAt: "desc" },
      });
      return {
        title: "Punch List Report",
        description: "Punch items with completion status by punchlist.",
        generatedAt: new Date(),
        filtersSummary: summarizeFilters(filters, area?.name),
        columns: ["Item No.", "Title", "Punchlist", "Location", "Trade", "Responsible", "Status", "Created"],
        rows: rows.map((r) => [
          r.punchItemNumber,
          r.title,
          r.punchlist?.title ?? "Standalone",
          r.area?.name ?? "—",
          r.trade?.name ?? "—",
          r.responsibleUser?.name ?? "—",
          PUNCH_ITEM_STATUS_LABELS[r.status],
          r.createdAt.toLocaleDateString("en-GB"),
        ]),
      };
    }
    case "itp": {
      const itps = await prisma.fieldItp.findMany({
        where: { projectId, ...areaFilter },
        include: { area: true, items: true },
        orderBy: { createdAt: "desc" },
      });
      const rows: string[][] = [];
      for (const itp of itps) {
        for (const item of itp.items) {
          rows.push([
            itp.itpNumber,
            itp.title,
            String(item.sequence),
            item.activity,
            item.inspectionType,
            ITP_ITEM_STATUS_LABELS[item.status],
            ITP_STATUS_LABELS[itp.status],
            itp.area?.name ?? "—",
          ]);
        }
      }
      return {
        title: "ITP & Hold Point Status Report",
        description: "ITP items with classification and hold point status.",
        generatedAt: new Date(),
        filtersSummary: summarizeFilters(filters, area?.name),
        columns: ["ITP No.", "Title", "Seq.", "Activity", "Class", "Item Status", "ITP Status", "Location"],
        rows,
      };
    }
    case "tests": {
      const rows = await prisma.fieldTest.findMany({
        where: { projectId, ...areaFilter, ...(createdAtRange ? { createdAt: createdAtRange } : {}) },
        include: { area: true, type: true, previousTest: true, retest: true },
        orderBy: { createdAt: "desc" },
      });
      return {
        title: "Test & Inspection Results Report",
        description: "Test results including retest chains.",
        generatedAt: new Date(),
        filtersSummary: summarizeFilters(filters, area?.name),
        columns: ["Test No.", "Type", "Location", "Tested By", "Date", "Result", "Chain"],
        rows: rows.map((r) => [
          r.testNumber,
          r.type?.name ?? "—",
          r.area?.name ?? "—",
          r.testedByName,
          r.testDate.toLocaleDateString("en-GB"),
          TEST_RESULT_LABELS[r.resultStatus],
          r.previousTest ? `Retest of ${r.previousTest.testNumber}` : r.retest ? `Retested as ${r.retest.testNumber}` : "—",
        ]),
      };
    }
    case "site-walk": {
      if (!filters.walkId) {
        return {
          title: "Site Walk Summary Report",
          description: "Select a site walk to generate this report.",
          generatedAt: new Date(),
          filtersSummary: "No site walk selected",
          columns: ["Type", "Number", "Title", "Status"],
          rows: [],
        };
      }
      const { walk, observations, issues, punchItems, photos } = await getSiteWalkSummary(filters.walkId, projectId);
      const rows: string[][] = [
        ...observations.map((o) => ["Observation", o.observationNumber, o.title, OBSERVATION_STATUS_LABELS[o.status]]),
        ...issues.map((i) => ["Issue", i.issueNumber, i.title, ISSUE_STATUS_LABELS[i.status]]),
        ...punchItems.map((p) => ["Punch Item", p.punchItemNumber, p.title, PUNCH_ITEM_STATUS_LABELS[p.status]]),
        ...photos.map((p) => ["Photo", p.attachment.fileName, p.attachment.category ?? "General", "—"]),
      ];
      return {
        title: "Site Walk Summary Report",
        description: `${walk.purpose} — started ${walk.startedAt.toLocaleString("en-GB")} by ${walk.startedBy.name}${walk.endedAt ? `, ended ${walk.endedAt.toLocaleString("en-GB")}` : " (still active)"}.`,
        generatedAt: new Date(),
        filtersSummary: walk.area?.name ?? "No starting location",
        columns: ["Type", "Number", "Title", "Status"],
        rows,
      };
    }
  }
}

export function fieldReportToCsv(table: FieldReportTable): string {
  const escape = (v: string) => (/[",\n]/.test(v) ? `"${v.replaceAll('"', '""')}"` : v);
  const lines = [table.columns.map(escape).join(","), ...table.rows.map((r) => r.map(escape).join(","))];
  return lines.join("\n");
}
