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
import { NEAR_MISS_STATUS_LABELS, NEAR_MISS_STATUS_BADGE_CLASSES, SEVERITY_LABELS, SEVERITY_BADGE_CLASSES } from "@/lib/hse/status";
import type { Prisma } from "@prisma/client";

const PAGE_SIZE = 25;

export default async function NearMissesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; severity?: string; page?: string }>;
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

  const where: Prisma.HseNearMissWhereInput = {
    projectId,
    ...(params.status ? { status: params.status as never } : {}),
    ...(params.severity ? { potentialSeverity: params.severity as never } : {}),
    ...(params.q?.trim()
      ? {
          OR: [
            { nearMissNumber: { contains: params.q.trim(), mode: "insensitive" } },
            { title: { contains: params.q.trim(), mode: "insensitive" } },
            { location: { contains: params.q.trim(), mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.hseNearMiss.findMany({
      where,
      include: { reportedBy: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.hseNearMiss.count({ where }),
  ]);

  function buildHref(targetPage: number): string {
    const sp = new URLSearchParams();
    if (params.q) sp.set("q", params.q);
    if (params.status) sp.set("status", params.status);
    if (params.severity) sp.set("severity", params.severity);
    sp.set("page", String(targetPage));
    return `/hse/near-misses?${sp.toString()}`;
  }

  return (
    <div className="p-6">
      <HsePageHeader
        title="Near Misses"
        description="Unplanned events that had the potential to cause harm but did not, reported on this project."
        action={
          <Link href="/hse/report?type=near-miss" className={buttonClass("primary", "md")}>
            <Plus size={14} />
            Report Near Miss
          </Link>
        }
      />

      <form action="/hse/near-misses" method="GET" className="mt-4">
        <FilterBar>
          <Input name="q" defaultValue={params.q ?? ""} placeholder="Search number, title, location…" className="w-64" />
          <Select name="status" defaultValue={params.status ?? ""} className="w-44">
            <option value="">All Statuses</option>
            {Object.entries(NEAR_MISS_STATUS_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </Select>
          <Select name="severity" defaultValue={params.severity ?? ""} className="w-44">
            <option value="">All Potential Severities</option>
            {Object.entries(SEVERITY_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </Select>
          <Button type="submit" variant="secondary">Search</Button>
          <Link href="/hse/near-misses" className="text-[13px] text-text-secondary hover:underline">Clear</Link>
        </FilterBar>
      </form>

      {rows.length === 0 ? (
        <EmptyState
          icon={<TriangleAlert size={26} strokeWidth={1.25} />}
          title="No near misses reported"
          description="Near misses reported for this project will appear here."
        />
      ) : (
        <>
          <ResultSummary count={total} noun="near miss" />
          <Table>
            <Thead>
              <Tr>
                <Th>Near Miss No.</Th>
                <Th>Title</Th>
                <Th>Location</Th>
                <Th>Reported By</Th>
                <Th>Date</Th>
                <Th>Potential Severity</Th>
                <Th>Status</Th>
              </Tr>
            </Thead>
            <Tbody>
              {rows.map((r) => (
                <Tr key={r.id}>
                  <Td>
                    <Link href={`/hse/near-misses/${r.id}`} className="font-medium text-brand-700 hover:underline">
                      {r.nearMissNumber}
                    </Link>
                  </Td>
                  <Td className="max-w-xs truncate text-text-secondary">{r.title}</Td>
                  <Td className="text-text-secondary">{r.location}</Td>
                  <Td className="text-text-secondary">{r.reportedBy.name}</Td>
                  <Td className="text-text-secondary">{r.createdAt.toLocaleDateString("en-GB")}</Td>
                  <Td>
                    <StatusBadge label={SEVERITY_LABELS[r.potentialSeverity]} className={SEVERITY_BADGE_CLASSES[r.potentialSeverity]} />
                  </Td>
                  <Td>
                    <StatusBadge label={NEAR_MISS_STATUS_LABELS[r.status]} className={NEAR_MISS_STATUS_BADGE_CLASSES[r.status]} />
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
