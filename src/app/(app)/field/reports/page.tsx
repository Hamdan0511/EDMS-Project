import Link from "next/link";
import { requirePageContext } from "@/lib/page-context";
import { hasPermission } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";
import { listFieldAreaTree } from "@/lib/services/field/area-service";
import { getFieldReportTable, FIELD_REPORT_TYPES, type FieldReportType } from "@/lib/field/reports";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/table";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button, buttonClass } from "@/components/ui/button";
import { FilterBar, ResultSummary } from "@/components/ui/filter-bar";
import { FieldPageHeader } from "@/components/field/field-page-header";
import { FieldAreaPicker } from "@/components/field/field-area-picker";
import { SendFieldReportButton } from "@/components/field/send-field-report-button";
import { Download, Printer, ReportsIcon } from "@/components/ui/icons";

const VALID_TYPES = FIELD_REPORT_TYPES.map((t) => t.key);

export default async function FieldReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; dateFrom?: string; dateTo?: string; areaId?: string; walkId?: string }>;
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
  const projectId = membership.projectId;
  const type: FieldReportType = VALID_TYPES.includes(params.type as FieldReportType) ? (params.type as FieldReportType) : "observations";
  const typeDef = FIELD_REPORT_TYPES.find((t) => t.key === type)!;

  const canExport = await hasPermission(user.id, "FIELD_EXPORT_REPORTS", { projectId });

  const [areaTree, walks, mailTypes, projectMembers] = await Promise.all([
    listFieldAreaTree(projectId),
    typeDef.needsWalk ? prisma.fieldSiteWalk.findMany({ where: { projectId }, orderBy: { startedAt: "desc" } }) : Promise.resolve([]),
    prisma.mailType.findMany({ where: { projectId }, orderBy: { name: "asc" } }),
    prisma.projectMember.findMany({ where: { projectId }, include: { user: true }, orderBy: { user: { name: "asc" } } }),
  ]);

  const dateFrom = params.dateFrom ? new Date(`${params.dateFrom}T00:00:00.000Z`) : undefined;
  const dateTo = params.dateTo ? new Date(`${params.dateTo}T23:59:59.999Z`) : undefined;

  const table = await getFieldReportTable(type, projectId, {
    dateFrom,
    dateTo,
    areaId: params.areaId || undefined,
    walkId: params.walkId || undefined,
  });

  const qs = new URLSearchParams({
    type,
    ...(params.dateFrom ? { dateFrom: params.dateFrom } : {}),
    ...(params.dateTo ? { dateTo: params.dateTo } : {}),
    ...(params.areaId ? { areaId: params.areaId } : {}),
    ...(params.walkId ? { walkId: params.walkId } : {}),
  }).toString();
  const printHref = `/field-print/${type}?${qs}`;
  const exportHref = `/api/field/reports/export?${new URLSearchParams({ projectId, ...Object.fromEntries(new URLSearchParams(qs)) }).toString()}`;

  return (
    <div className="p-6">
      <FieldPageHeader
        title="Field Reports"
        description="Query, print, and export Field records by type and date range."
        action={
          canExport ? (
            <div className="flex gap-2">
              <a href={printHref} target="_blank" rel="noopener noreferrer" className={buttonClass("secondary", "md")}>
                <Printer size={14} />
                Print
              </a>
              <a href={exportHref} className={buttonClass("secondary", "md")}>
                <Download size={14} />
                Export CSV
              </a>
              <SendFieldReportButton
                projectId={projectId}
                reportType={type}
                defaultSubject={table.title}
                filters={{
                  dateFrom: params.dateFrom,
                  dateTo: params.dateTo,
                  areaId: params.areaId,
                  walkId: params.walkId,
                }}
                mailTypes={mailTypes.map((t) => ({ id: t.id, name: t.name }))}
                members={projectMembers.map((m) => ({ id: m.user.id, name: m.user.name }))}
              />
            </div>
          ) : undefined
        }
      />

      <form action="/field/reports" method="GET" className="mt-4">
        <FilterBar>
          <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
            Report Type
            <Select name="type" defaultValue={type} className="w-56">
              {FIELD_REPORT_TYPES.map((t) => (
                <option key={t.key} value={t.key}>{t.label}</option>
              ))}
            </Select>
          </label>
          {typeDef.needsWalk ? (
            <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
              Site Walk
              <Select name="walkId" defaultValue={params.walkId ?? ""} className="w-56">
                <option value="">Select a site walk…</option>
                {walks.map((w) => (
                  <option key={w.id} value={w.id}>{w.purpose} ({w.startedAt.toLocaleDateString("en-GB")})</option>
                ))}
              </Select>
            </label>
          ) : (
            <>
              <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
                Location
                <FieldAreaPicker tree={areaTree} name="areaId" defaultValue={params.areaId} className="w-56" />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
                From
                <Input type="date" name="dateFrom" defaultValue={params.dateFrom ?? ""} />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
                To
                <Input type="date" name="dateTo" defaultValue={params.dateTo ?? ""} />
              </label>
            </>
          )}
          <Button type="submit" variant="secondary">Apply</Button>
          <Link href="/field/reports" className="text-[13px] text-text-secondary hover:underline">Clear</Link>
        </FilterBar>
      </form>

      <p className="mt-3 text-[13px] text-text-secondary">{typeDef.description}</p>

      {table.rows.length === 0 ? (
        <EmptyState icon={<ReportsIcon size={26} strokeWidth={1.25} />} title="No records found" description="No records match the selected report type and filters." />
      ) : (
        <>
          <ResultSummary count={table.rows.length} noun="record" />
          <Table>
            <Thead>
              <Tr>
                {table.columns.map((c) => (
                  <Th key={c}>{c}</Th>
                ))}
              </Tr>
            </Thead>
            <Tbody>
              {table.rows.map((row, i) => (
                <Tr key={i}>
                  {row.map((cell, j) => (
                    <Td key={j} className="text-text-secondary">{cell}</Td>
                  ))}
                </Tr>
              ))}
            </Tbody>
          </Table>
        </>
      )}
    </div>
  );
}
