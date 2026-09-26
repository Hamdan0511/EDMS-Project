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
import { AlertCircle, Plus } from "@/components/ui/icons";
import { INCIDENT_TYPE_LABELS, INCIDENT_STATUS_LABELS, INCIDENT_STATUS_BADGE_CLASSES, SEVERITY_LABELS, SEVERITY_BADGE_CLASSES } from "@/lib/hse/status";
import type { Prisma } from "@prisma/client";

const PAGE_SIZE = 25;

export default async function IncidentsPage({
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

  const where: Prisma.HseIncidentWhereInput = {
    projectId,
    ...(params.type ? { type: params.type as never } : {}),
    ...(params.status ? { status: params.status as never } : {}),
    ...(params.severity ? { severity: params.severity as never } : {}),
    ...(params.q?.trim()
      ? {
          OR: [
            { incidentNumber: { contains: params.q.trim(), mode: "insensitive" } },
            { title: { contains: params.q.trim(), mode: "insensitive" } },
            { location: { contains: params.q.trim(), mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.hseIncident.findMany({
      where,
      include: { reportedBy: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.hseIncident.count({ where }),
  ]);

  function buildHref(targetPage: number): string {
    const sp = new URLSearchParams();
    if (params.q) sp.set("q", params.q);
    if (params.type) sp.set("type", params.type);
    if (params.status) sp.set("status", params.status);
    if (params.severity) sp.set("severity", params.severity);
    sp.set("page", String(targetPage));
    return `/hse/incidents?${sp.toString()}`;
  }

  return (
    <div className="p-6">
      <HsePageHeader
        title="Incidents"
        description="Injuries, illnesses, property damage and other reportable incidents on this project."
        action={
          <Link href="/hse/report?type=incident" className={buttonClass("primary", "md")}>
            <Plus size={14} />
            Report Incident
          </Link>
        }
      />

      <form action="/hse/incidents" method="GET" className="mt-4">
        <FilterBar>
          <Input name="q" defaultValue={params.q ?? ""} placeholder="Search number, title, location…" className="w-64" />
          <Select name="type" defaultValue={params.type ?? ""} className="w-44">
            <option value="">All Types</option>
            {Object.entries(INCIDENT_TYPE_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </Select>
          <Select name="status" defaultValue={params.status ?? ""} className="w-48">
            <option value="">All Statuses</option>
            {Object.entries(INCIDENT_STATUS_LABELS).map(([v, l]) => (
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
          <Link href="/hse/incidents" className="text-[13px] text-text-secondary hover:underline">Clear</Link>
        </FilterBar>
      </form>

      {rows.length === 0 ? (
        <EmptyState
          icon={<AlertCircle size={26} strokeWidth={1.25} />}
          title="No incidents reported"
          description="Incidents reported for this project will appear here."
        />
      ) : (
        <>
          <ResultSummary count={total} noun="incident" />
          <Table>
            <Thead>
              <Tr>
                <Th>Incident No.</Th>
                <Th>Type</Th>
                <Th>Title</Th>
                <Th>Location</Th>
                <Th>Date</Th>
                <Th>Reporter</Th>
                <Th>Severity</Th>
                <Th>Status</Th>
              </Tr>
            </Thead>
            <Tbody>
              {rows.map((r) => (
                <Tr key={r.id}>
                  <Td>
                    <Link href={`/hse/incidents/${r.id}`} className="font-medium text-brand-700 hover:underline">
                      {r.incidentNumber}
                    </Link>
                  </Td>
                  <Td className="text-text-secondary">{INCIDENT_TYPE_LABELS[r.type]}</Td>
                  <Td className="max-w-xs truncate text-text-secondary">{r.title}</Td>
                  <Td className="text-text-secondary">{r.location}</Td>
                  <Td className="text-text-secondary">{r.incidentDate.toLocaleDateString("en-GB")}</Td>
                  <Td className="text-text-secondary">{r.reportedBy.name}</Td>
                  <Td>
                    <StatusBadge label={SEVERITY_LABELS[r.severity]} className={SEVERITY_BADGE_CLASSES[r.severity]} />
                  </Td>
                  <Td>
                    <StatusBadge label={INCIDENT_STATUS_LABELS[r.status]} className={INCIDENT_STATUS_BADGE_CLASSES[r.status]} />
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
