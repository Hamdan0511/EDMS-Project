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
import { EyeIcon, Plus } from "@/components/ui/icons";
import { OBSERVATION_TYPE_LABELS, OBSERVATION_STATUS_LABELS, OBSERVATION_STATUS_BADGE_CLASSES, SEVERITY_LABELS, SEVERITY_BADGE_CLASSES } from "@/lib/hse/status";
import type { Prisma } from "@prisma/client";

const PAGE_SIZE = 25;

export default async function ObservationsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string; status?: string; severity?: string; page?: string }>;
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

  const where: Prisma.HseObservationWhereInput = {
    projectId,
    ...(params.type ? { type: params.type as never } : {}),
    ...(params.status ? { status: params.status as never } : {}),
    ...(params.severity ? { severity: params.severity as never } : {}),
    ...(params.q?.trim()
      ? {
          OR: [
            { observationNumber: { contains: params.q.trim(), mode: "insensitive" } },
            { title: { contains: params.q.trim(), mode: "insensitive" } },
            { location: { contains: params.q.trim(), mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.hseObservation.findMany({
      where,
      include: { reportedBy: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.hseObservation.count({ where }),
  ]);

  function buildHref(targetPage: number): string {
    const sp = new URLSearchParams();
    if (params.q) sp.set("q", params.q);
    if (params.type) sp.set("type", params.type);
    if (params.status) sp.set("status", params.status);
    if (params.severity) sp.set("severity", params.severity);
    sp.set("page", String(targetPage));
    return `/hse/observations?${sp.toString()}`;
  }

  return (
    <div className="p-6">
      <HsePageHeader
        title="Observations"
        description="Safety observations, unsafe acts and conditions reported across the project."
        action={
          <Link href="/hse/report?type=observation" className={buttonClass("primary", "md")}>
            <Plus size={14} />
            New Observation
          </Link>
        }
      />

      <form action="/hse/observations" method="GET" className="mt-4">
        <FilterBar>
          <Input name="q" defaultValue={params.q ?? ""} placeholder="Search number, title, location…" className="w-64" />
          <Select name="type" defaultValue={params.type ?? ""} className="w-48">
            <option value="">All Types</option>
            {Object.entries(OBSERVATION_TYPE_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </Select>
          <Select name="status" defaultValue={params.status ?? ""} className="w-40">
            <option value="">All Statuses</option>
            {Object.entries(OBSERVATION_STATUS_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </Select>
          <Select name="severity" defaultValue={params.severity ?? ""} className="w-36">
            <option value="">All Severities</option>
            {Object.entries(SEVERITY_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </Select>
          <Button type="submit" variant="secondary">Search</Button>
          <Link href="/hse/observations" className="text-[13px] text-text-secondary hover:underline">Clear</Link>
        </FilterBar>
      </form>

      {rows.length === 0 ? (
        <EmptyState
          icon={<EyeIcon size={26} strokeWidth={1.25} />}
          title="No observations found"
          description="Observations reported for this project will appear here."
        />
      ) : (
        <>
          <ResultSummary count={total} noun="observation" />
          <Table>
            <Thead>
              <Tr>
                <Th>Observation No.</Th>
                <Th>Type</Th>
                <Th>Title</Th>
                <Th>Location</Th>
                <Th>Reported By</Th>
                <Th>Date</Th>
                <Th>Severity</Th>
                <Th>Status</Th>
              </Tr>
            </Thead>
            <Tbody>
              {rows.map((r) => (
                <Tr key={r.id}>
                  <Td>
                    <Link href={`/hse/observations/${r.id}`} className="font-medium text-brand-700 hover:underline">
                      {r.observationNumber}
                    </Link>
                  </Td>
                  <Td className="text-text-secondary">{OBSERVATION_TYPE_LABELS[r.type]}</Td>
                  <Td className="max-w-xs truncate text-text-secondary">{r.title}</Td>
                  <Td className="text-text-secondary">{r.location}</Td>
                  <Td className="text-text-secondary">{r.reportedBy.name}</Td>
                  <Td className="text-text-secondary">{r.createdAt.toLocaleDateString("en-GB")}</Td>
                  <Td>
                    <StatusBadge label={SEVERITY_LABELS[r.severity]} className={SEVERITY_BADGE_CLASSES[r.severity]} />
                  </Td>
                  <Td>
                    <StatusBadge label={OBSERVATION_STATUS_LABELS[r.status]} className={OBSERVATION_STATUS_BADGE_CLASSES[r.status]} />
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
