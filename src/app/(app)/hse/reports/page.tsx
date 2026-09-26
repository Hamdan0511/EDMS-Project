import Link from "next/link";
import { requirePageContext } from "@/lib/page-context";
import { hasPermission } from "@/lib/auth/permissions";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/table";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button, buttonClass } from "@/components/ui/button";
import { FilterBar, ResultSummary } from "@/components/ui/filter-bar";
import { HsePageHeader } from "@/components/hse/hse-page-header";
import { Download } from "@/components/ui/icons";
import { HSE_REPORT_TYPE_LABELS, queryHseReport, type HseReportType } from "@/lib/hse/reports";
import {
  OBSERVATION_STATUS_LABELS,
  INCIDENT_STATUS_LABELS,
  NEAR_MISS_STATUS_LABELS,
  HAZARD_STATUS_LABELS,
  RISK_ASSESSMENT_STATUS_LABELS,
  INSPECTION_STATUS_LABELS,
  ACTION_STATUS_LABELS,
  PERMIT_STATUS_LABELS,
} from "@/lib/hse/status";

const STATUS_LABELS_BY_TYPE: Record<HseReportType, Record<string, string>> = {
  observations: OBSERVATION_STATUS_LABELS,
  incidents: INCIDENT_STATUS_LABELS,
  nearMisses: NEAR_MISS_STATUS_LABELS,
  hazards: HAZARD_STATUS_LABELS,
  riskAssessments: RISK_ASSESSMENT_STATUS_LABELS,
  inspections: INSPECTION_STATUS_LABELS,
  correctiveActions: ACTION_STATUS_LABELS,
  permits: PERMIT_STATUS_LABELS,
};

const VALID_TYPES = Object.keys(HSE_REPORT_TYPE_LABELS) as HseReportType[];

export default async function HseReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; status?: string; q?: string; dateFrom?: string; dateTo?: string }>;
}) {
  const { user, membership } = await requirePageContext();
  if (!membership) {
    return (
      <div className="p-6">
        <EmptyState title="You are not assigned to a project" />
      </div>
    );
  }
  const params = await searchParams;
  const type: HseReportType = VALID_TYPES.includes(params.type as HseReportType) ? (params.type as HseReportType) : "incidents";
  const projectId = membership.projectId;

  const canExport = await hasPermission(user.id, "HSE_EXPORT_REPORTS", { projectId });

  const dateFrom = params.dateFrom ? new Date(`${params.dateFrom}T00:00:00.000Z`) : undefined;
  const dateTo = params.dateTo ? new Date(`${params.dateTo}T23:59:59.999Z`) : undefined;

  const rows = await queryHseReport(type, projectId, {
    status: params.status || undefined,
    q: params.q || undefined,
    dateFrom,
    dateTo,
  });

  const statusLabels = STATUS_LABELS_BY_TYPE[type];

  const exportHref = `/api/hse/reports/export?${new URLSearchParams({
    projectId,
    type,
    ...(params.status ? { status: params.status } : {}),
    ...(params.q ? { q: params.q } : {}),
    ...(params.dateFrom ? { dateFrom: params.dateFrom } : {}),
    ...(params.dateTo ? { dateTo: params.dateTo } : {}),
  }).toString()}`;

  return (
    <div className="p-6">
      <HsePageHeader
        title="HSE Reports"
        description="Cross-module register for querying, reviewing and exporting HSE records by type and date range."
        action={
          canExport ? (
            <a href={exportHref} className={buttonClass("secondary", "md")}>
              <Download size={14} />
              Export CSV
            </a>
          ) : undefined
        }
      />

      <form action="/hse/reports" method="GET" className="mt-4">
        <FilterBar>
          <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
            Record Type
            <Select name="type" defaultValue={type} className="w-48">
              {VALID_TYPES.map((t) => (
                <option key={t} value={t}>{HSE_REPORT_TYPE_LABELS[t]}</option>
              ))}
            </Select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
            Status
            <Select name="status" defaultValue={params.status ?? ""} className="w-44">
              <option value="">All Statuses</option>
              {Object.entries(statusLabels).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </Select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
            From
            <Input type="date" name="dateFrom" defaultValue={params.dateFrom ?? ""} />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
            To
            <Input type="date" name="dateTo" defaultValue={params.dateTo ?? ""} />
          </label>
          <Input name="q" defaultValue={params.q ?? ""} placeholder="Search…" className="w-48" />
          <Button type="submit" variant="secondary">Apply</Button>
          <Link href="/hse/reports" className="text-[13px] text-text-secondary hover:underline">Clear</Link>
        </FilterBar>
      </form>

      {rows.length === 0 ? (
        <EmptyState title="No records found" description="No records match the selected report type and filters." />
      ) : (
        <>
          <ResultSummary count={rows.length} noun="record" />
          <Table>
            <Thead>
              <Tr>
                <Th>Ref No.</Th>
                <Th>Title</Th>
                <Th>Location</Th>
                <Th>Date</Th>
                <Th>Status</Th>
              </Tr>
            </Thead>
            <Tbody>
              {rows.map((r) => (
                <Tr key={r.refNo}>
                  <Td>
                    <Link href={r.detailHref} className="font-medium text-brand-700 hover:underline">
                      {r.refNo}
                    </Link>
                  </Td>
                  <Td className="max-w-sm truncate text-text-secondary">{r.title}</Td>
                  <Td className="text-text-secondary">{r.location}</Td>
                  <Td className="text-text-secondary">{r.date.toLocaleDateString("en-GB")}</Td>
                  <Td className="text-text-secondary">{(statusLabels[r.status] ?? r.status).toString()}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </>
      )}
    </div>
  );
}
