import Link from "next/link";
import { requirePageContext } from "@/lib/page-context";
import { prisma } from "@/lib/prisma";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button, buttonClass } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { FilterBar, ResultSummary } from "@/components/ui/filter-bar";
import { HsePageHeader } from "@/components/hse/hse-page-header";
import { TriangleAlert, Plus } from "@/components/ui/icons";
import { HAZARD_STATUS_LABELS, HAZARD_STATUS_BADGE_CLASSES } from "@/lib/hse/status";
import { RISK_LEVEL_LABELS, RISK_LEVEL_BADGE_CLASSES } from "@/lib/hse/risk-matrix";
import type { Prisma } from "@prisma/client";

const PAGE_SIZE = 25;

export default async function HazardsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; risk?: string; page?: string }>;
}) {
  const { membership } = await requirePageContext();
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

  const where: Prisma.HseHazardWhereInput = {
    projectId,
    ...(params.status ? { status: params.status as never } : {}),
    ...(params.risk ? { initialRisk: params.risk as never } : {}),
    ...(params.q?.trim()
      ? {
          OR: [
            { hazardNumber: { contains: params.q.trim(), mode: "insensitive" } },
            { hazard: { contains: params.q.trim(), mode: "insensitive" } },
            { location: { contains: params.q.trim(), mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.hseHazard.findMany({
      where,
      include: { responsible: true, controls: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.hseHazard.count({ where }),
  ]);

  function buildHref(targetPage: number): string {
    const sp = new URLSearchParams();
    if (params.q) sp.set("q", params.q);
    if (params.status) sp.set("status", params.status);
    if (params.risk) sp.set("risk", params.risk);
    sp.set("page", String(targetPage));
    return `/hse/hazards?${sp.toString()}`;
  }

  return (
    <div className="p-6">
      <HsePageHeader
        title="Hazard Register"
        description="Hazards identified on this project, their controls and residual risk levels."
        action={
          <Link href="/hse/report?type=hazard" className={buttonClass("primary", "md")}>
            <Plus size={14} />
            Add Hazard
          </Link>
        }
      />

      <form action="/hse/hazards" method="GET" className="mt-4">
        <FilterBar>
          <Input name="q" defaultValue={params.q ?? ""} placeholder="Search number, hazard, location…" className="w-64" />
          <Select name="status" defaultValue={params.status ?? ""} className="w-40">
            <option value="">All Statuses</option>
            {Object.entries(HAZARD_STATUS_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </Select>
          <Select name="risk" defaultValue={params.risk ?? ""} className="w-40">
            <option value="">All Risk Levels</option>
            {Object.entries(RISK_LEVEL_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </Select>
          <Button type="submit" variant="secondary">Search</Button>
          <Link href="/hse/hazards" className="text-[13px] text-text-secondary hover:underline">Clear</Link>
        </FilterBar>
      </form>

      {rows.length === 0 ? (
        <EmptyState
          icon={<TriangleAlert size={26} strokeWidth={1.25} />}
          title="No hazards found"
          description="Hazards identified on this project will appear here."
        />
      ) : (
        <>
          <ResultSummary count={total} noun="hazard" />
          <Table>
            <Thead>
              <Tr>
                <Th>Hazard No.</Th>
                <Th>Hazard</Th>
                <Th>Location</Th>
                <Th>Initial Risk</Th>
                <Th>Controls</Th>
                <Th>Residual Risk</Th>
                <Th>Responsible</Th>
                <Th>Status</Th>
              </Tr>
            </Thead>
            <Tbody>
              {rows.map((r) => (
                <Tr key={r.id}>
                  <Td>
                    <Link href={`/hse/hazards/${r.id}`} className="font-medium text-brand-700 hover:underline">
                      {r.hazardNumber}
                    </Link>
                  </Td>
                  <Td className="max-w-xs truncate text-text-secondary">{r.hazard}</Td>
                  <Td className="text-text-secondary">{r.location}</Td>
                  <Td>
                    <StatusBadge label={RISK_LEVEL_LABELS[r.initialRisk]} className={RISK_LEVEL_BADGE_CLASSES[r.initialRisk]} />
                  </Td>
                  <Td className="text-text-secondary">{r.controls.length}</Td>
                  <Td>
                    {r.residualRisk ? (
                      <StatusBadge label={RISK_LEVEL_LABELS[r.residualRisk]} className={RISK_LEVEL_BADGE_CLASSES[r.residualRisk]} />
                    ) : (
                      <span className="text-text-muted">—</span>
                    )}
                  </Td>
                  <Td className="text-text-secondary">{r.responsible?.name ?? "—"}</Td>
                  <Td>
                    <StatusBadge label={HAZARD_STATUS_LABELS[r.status]} className={HAZARD_STATUS_BADGE_CLASSES[r.status]} />
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
