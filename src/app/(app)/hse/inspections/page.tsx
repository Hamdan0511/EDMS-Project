import Link from "next/link";
import { requirePageContext } from "@/lib/page-context";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/auth/permissions";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import { Select } from "@/components/ui/select";
import { Button, buttonClass } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { FilterBar, ResultSummary } from "@/components/ui/filter-bar";
import { HsePageHeader } from "@/components/hse/hse-page-header";
import { ClipboardCheck, Plus } from "@/components/ui/icons";
import { INSPECTION_STATUS_LABELS, INSPECTION_STATUS_BADGE_CLASSES } from "@/lib/hse/status";
import type { Prisma } from "@prisma/client";

const PAGE_SIZE = 25;

export default async function InspectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
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
  const page = Math.max(1, Number(params.page) || 1);
  const projectId = membership.projectId;

  const canManage = await hasPermission(user.id, "HSE_MANAGE_INSPECTIONS", { projectId });

  const where: Prisma.HseInspectionWhereInput = {
    projectId,
    ...(params.status ? { status: params.status as never } : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.hseInspection.findMany({
      where,
      include: { template: true, inspector: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.hseInspection.count({ where }),
  ]);

  function buildHref(targetPage: number): string {
    const sp = new URLSearchParams();
    if (params.status) sp.set("status", params.status);
    sp.set("page", String(targetPage));
    return `/hse/inspections?${sp.toString()}`;
  }

  return (
    <div className="p-6">
      <HsePageHeader
        title="Inspections"
        description="Scheduled and completed safety inspections carried out on this project."
        action={
          canManage ? (
            <Link href="/hse/inspections/new" className={buttonClass("primary", "md")}>
              <Plus size={14} />
              Schedule Inspection
            </Link>
          ) : undefined
        }
      />

      <form action="/hse/inspections" method="GET" className="mt-4">
        <FilterBar>
          <Select name="status" defaultValue={params.status ?? ""} className="w-44">
            <option value="">All Statuses</option>
            {Object.entries(INSPECTION_STATUS_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </Select>
          <Button type="submit" variant="secondary">Filter</Button>
          <Link href="/hse/inspections" className="text-[13px] text-text-secondary hover:underline">Clear</Link>
        </FilterBar>
      </form>

      {rows.length === 0 ? (
        <EmptyState
          icon={<ClipboardCheck size={26} strokeWidth={1.25} />}
          title="No inspections found"
          description="Scheduled and completed inspections for this project will appear here."
        />
      ) : (
        <>
          <ResultSummary count={total} noun="inspection" />
          <Table>
            <Thead>
              <Tr>
                <Th>Inspection No.</Th>
                <Th>Template</Th>
                <Th>Location</Th>
                <Th>Inspector</Th>
                <Th>Scheduled</Th>
                <Th>Result</Th>
                <Th>Status</Th>
              </Tr>
            </Thead>
            <Tbody>
              {rows.map((r) => (
                <Tr key={r.id}>
                  <Td>
                    <Link href={`/hse/inspections/${r.id}`} className="font-medium text-brand-700 hover:underline">
                      {r.inspectionNumber}
                    </Link>
                  </Td>
                  <Td className="text-text-secondary">{r.template.name}</Td>
                  <Td className="text-text-secondary">{r.location}</Td>
                  <Td className="text-text-secondary">{r.inspector.name}</Td>
                  <Td className="text-text-secondary">{r.scheduledAt ? r.scheduledAt.toLocaleDateString("en-GB") : "—"}</Td>
                  <Td className="text-text-secondary">{r.result ?? "—"}</Td>
                  <Td>
                    <StatusBadge label={INSPECTION_STATUS_LABELS[r.status]} className={INSPECTION_STATUS_BADGE_CLASSES[r.status]} />
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
          <div className="mt-3">
            <Pagination page={page} pageSize={PAGE_SIZE} total={total} buildHref={buildHref} />
          </div>
        </>
      )}
    </div>
  );
}
