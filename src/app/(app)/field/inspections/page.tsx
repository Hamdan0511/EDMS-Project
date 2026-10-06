import Link from "next/link";
import { requirePageContext } from "@/lib/page-context";
import { hasPermission } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/table";
import { Select } from "@/components/ui/select";
import { Button, buttonClass } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { FilterBar, ResultSummary } from "@/components/ui/filter-bar";
import { StatusTabs, type StatusTab } from "@/components/ui/status-tabs";
import { FieldPageHeader } from "@/components/field/field-page-header";
import { ClipboardCheck, Plus } from "@/components/ui/icons";
import { INSPECTION_STATUS_LABELS, INSPECTION_STATUS_BADGE_CLASSES } from "@/lib/field/status";
import type { FieldInspectionStatus, Prisma } from "@prisma/client";

const INSPECTION_STATUS_ORDER: FieldInspectionStatus[] = ["DRAFT", "ASSIGNED", "IN_PROGRESS", "SUBMITTED", "PASSED", "FAILED", "CLOSED"];

export default async function InspectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; areaId?: string }>;
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
  const canManage = await hasPermission(user.id, "FIELD_MANAGE_INSPECTIONS", { projectId });

  const baseFilters: Prisma.FieldInspectionWhereInput = { projectId, ...(params.areaId ? { areaId: params.areaId } : {}) };
  const where: Prisma.FieldInspectionWhereInput = { ...baseFilters, ...(params.status ? { status: params.status as never } : {}) };

  const [inspections, statusCounts, allCount] = await Promise.all([
    prisma.fieldInspection.findMany({
      where,
      include: { template: true, area: true, assignee: true, inspector: true },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    }),
    prisma.fieldInspection.groupBy({ by: ["status"], where: baseFilters, _count: true }),
    prisma.fieldInspection.count({ where: baseFilters }),
  ]);

  function buildHref(status?: string): string {
    const sp = new URLSearchParams();
    if (params.areaId) sp.set("areaId", params.areaId);
    if (status) sp.set("status", status);
    const qs = sp.toString();
    return `/field/inspections${qs ? `?${qs}` : ""}`;
  }
  const countByStatus = Object.fromEntries(statusCounts.map((s) => [s.status, s._count]));
  const tabs: StatusTab[] = [
    { key: "all", label: "All", count: allCount, href: buildHref() },
    ...INSPECTION_STATUS_ORDER.map((s) => ({ key: s, label: INSPECTION_STATUS_LABELS[s], count: countByStatus[s] ?? 0, href: buildHref(s) })),
  ];

  return (
    <div className="p-6">
      <FieldPageHeader
        title="Quality Inspections"
        description="Template-driven checklists run against a specific location or activity."
        action={
          canManage ? (
            <Link href="/field/inspections/new" className={buttonClass("primary", "md")}>
              <Plus size={14} />
              New Inspection
            </Link>
          ) : undefined
        }
      />

      <div className="mt-4">
        <StatusTabs tabs={tabs} active={params.status || "all"} />
      </div>

      <form action="/field/inspections" method="GET" className="mt-1">
        <FilterBar>
          <Select name="status" defaultValue={params.status ?? ""} className="w-48">
            <option value="">All Statuses</option>
            {Object.entries(INSPECTION_STATUS_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </Select>
          <Button type="submit" variant="secondary">Search</Button>
          <Link href="/field/inspections" className="text-[13px] text-text-secondary hover:underline">Clear All</Link>
        </FilterBar>
      </form>

      {inspections.length === 0 ? (
        <EmptyState
          icon={<ClipboardCheck size={26} strokeWidth={1.25} />}
          title="No quality inspections yet"
          description="Schedule an inspection from a checklist template to start tracking quality on site."
          action={
            canManage ? (
              <Link href="/field/inspections/new" className={buttonClass("primary", "md")}>
                New Inspection
              </Link>
            ) : undefined
          }
        />
      ) : (
        <>
          <ResultSummary count={inspections.length} noun="inspection" />
          <Table>
            <Thead>
              <Tr>
                <Th>Insp. No.</Th>
                <Th>Template</Th>
                <Th>Location</Th>
                <Th>Assignee</Th>
                <Th>Inspector</Th>
                <Th>Due</Th>
                <Th>Status</Th>
              </Tr>
            </Thead>
            <Tbody>
              {inspections.map((r) => (
                <Tr key={r.id}>
                  <Td>
                    <Link href={`/field/inspections/${r.id}`} className="font-medium text-brand-700 hover:underline">
                      {r.inspectionNumber}
                    </Link>
                  </Td>
                  <Td className="text-text-secondary">{r.template.name}</Td>
                  <Td className="text-text-secondary">{r.area?.name ?? "—"}</Td>
                  <Td className="text-text-secondary">{r.assignee?.name ?? "—"}</Td>
                  <Td className="text-text-secondary">{r.inspector?.name ?? "—"}</Td>
                  <Td className="text-text-secondary">{r.dueDate ? r.dueDate.toLocaleDateString("en-GB") : "—"}</Td>
                  <Td>
                    <StatusBadge label={INSPECTION_STATUS_LABELS[r.status]} className={INSPECTION_STATUS_BADGE_CLASSES[r.status]} />
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </>
      )}
    </div>
  );
}
