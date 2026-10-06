import Link from "next/link";
import { requirePageContext } from "@/lib/page-context";
import { hasPermission } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button, buttonClass } from "@/components/ui/button";
import { FilterBar, ResultSummary } from "@/components/ui/filter-bar";
import { StatusTabs, type StatusTab } from "@/components/ui/status-tabs";
import { FieldPageHeader } from "@/components/field/field-page-header";
import { ObservationsTable } from "@/components/field/observations-table";
import { EyeIcon, Plus } from "@/components/ui/icons";
import { OBSERVATION_STATUS_LABELS, OBSERVATION_STATUS_ORDER, PRIORITY_LABELS } from "@/lib/field/status";
import type { Prisma } from "@prisma/client";

const PAGE_SIZE = 25;

export default async function ObservationsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; priority?: string; areaId?: string; positive?: string; page?: string }>;
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
  const canManage = await hasPermission(user.id, "FIELD_MANAGE_OBSERVATIONS", { projectId });

  const baseFilters: Prisma.FieldObservationWhereInput = {
    projectId,
    ...(params.priority ? { priority: params.priority as never } : {}),
    ...(params.areaId ? { areaId: params.areaId } : {}),
    ...(params.q?.trim()
      ? {
          OR: [
            { observationNumber: { contains: params.q.trim(), mode: "insensitive" } },
            { title: { contains: params.q.trim(), mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const activeTab = params.positive === "1" ? "positive" : params.status || "all";
  const where: Prisma.FieldObservationWhereInput = {
    ...baseFilters,
    ...(params.positive === "1" ? { isPositive: true } : params.status ? { status: params.status as never } : {}),
  };

  const [rows, total, statusCounts, positiveCount, allCount] = await Promise.all([
    prisma.fieldObservation.findMany({
      where,
      include: { area: true, responsibleUser: true, type: true },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.fieldObservation.count({ where }),
    prisma.fieldObservation.groupBy({ by: ["status"], where: baseFilters, _count: true }),
    prisma.fieldObservation.count({ where: { ...baseFilters, isPositive: true } }),
    prisma.fieldObservation.count({ where: baseFilters }),
  ]);

  const observationIds = rows.map((r) => r.id);
  const attachments = await prisma.fieldAttachment.findMany({
    where: { recordType: "FieldObservation", recordId: { in: observationIds } },
    orderBy: { uploadedAt: "desc" },
    select: { id: true, recordId: true, mimeType: true },
  });
  const firstAttachmentByObservation = new Map<string, { id: string; mimeType: string }>();
  for (const a of attachments) {
    if (!firstAttachmentByObservation.has(a.recordId)) firstAttachmentByObservation.set(a.recordId, a);
  }

  function buildHref(extra: Record<string, string | undefined>): string {
    const sp = new URLSearchParams();
    if (params.q) sp.set("q", params.q);
    if (params.priority) sp.set("priority", params.priority);
    if (params.areaId) sp.set("areaId", params.areaId);
    for (const [k, v] of Object.entries(extra)) {
      if (v) sp.set(k, v);
    }
    const qs = sp.toString();
    return `/field/observations${qs ? `?${qs}` : ""}`;
  }

  const countByStatus = Object.fromEntries(statusCounts.map((s) => [s.status, s._count]));
  const tabs: StatusTab[] = [
    { key: "all", label: "All", count: allCount, href: buildHref({}) },
    ...OBSERVATION_STATUS_ORDER.map((s) => ({
      key: s,
      label: OBSERVATION_STATUS_LABELS[s],
      count: countByStatus[s] ?? 0,
      href: buildHref({ status: s }),
    })),
    { key: "positive", label: "Positive", count: positiveCount, href: buildHref({ positive: "1" }) },
  ];

  function buildPageHref(targetPage: number): string {
    const sp = new URLSearchParams();
    if (params.q) sp.set("q", params.q);
    if (params.status) sp.set("status", params.status);
    if (params.priority) sp.set("priority", params.priority);
    if (params.areaId) sp.set("areaId", params.areaId);
    if (params.positive) sp.set("positive", params.positive);
    sp.set("page", String(targetPage));
    return `/field/observations?${sp.toString()}`;
  }

  return (
    <div className="p-6">
      <FieldPageHeader
        title="Site Observations"
        description="Quality, workmanship, and general observations recorded on site — informational by default, converted to an Issue when action is required."
        action={
          <div className="flex gap-2">
            <a
              href={`/field-print/observations?${new URLSearchParams(params.areaId ? { areaId: params.areaId } : {}).toString()}`}
              className={buttonClass("secondary", "md")}
            >
              Export
            </a>
            {canManage && (
              <Link href="/field/observations/new" className={buttonClass("primary", "md")}>
                <Plus size={14} />
                New Observation
              </Link>
            )}
          </div>
        }
      />

      <div className="mt-4">
        <StatusTabs tabs={tabs} active={activeTab} />
      </div>

      <form action="/field/observations" method="GET" className="mt-1">
        <FilterBar>
          <Input name="q" defaultValue={params.q ?? ""} placeholder="Search number, title…" className="w-64" />
          <Select name="priority" defaultValue={params.priority ?? ""} className="w-36">
            <option value="">All Priorities</option>
            {Object.entries(PRIORITY_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </Select>
          <Select name="status" defaultValue={params.status ?? ""} className="w-48">
            <option value="">All Statuses</option>
            {Object.entries(OBSERVATION_STATUS_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </Select>
          <Button type="submit" variant="secondary">Search</Button>
          <Link href="/field/observations" className="text-[13px] text-text-secondary hover:underline">Clear All</Link>
        </FilterBar>
      </form>

      {rows.length === 0 ? (
        <EmptyState
          icon={<EyeIcon size={26} strokeWidth={1.25} />}
          title="No site observations yet"
          description="Capture your first site observation to begin building the project field record."
          action={
            canManage ? (
              <Link href="/field/observations/new" className={buttonClass("primary", "md")}>
                New Observation
              </Link>
            ) : undefined
          }
        />
      ) : (
        <>
          <ResultSummary count={total} noun="observation" />
          <ObservationsTable
            projectId={projectId}
            rows={rows.map((r) => ({
              id: r.id,
              observationNumber: r.observationNumber,
              title: r.title,
              typeName: r.type?.name ?? null,
              areaName: r.area?.name ?? null,
              responsibleName: r.responsibleUser?.name ?? null,
              dueDate: r.dueDate ? r.dueDate.toISOString() : null,
              priority: r.priority,
              status: r.status,
              thumbnailAttachmentId: firstAttachmentByObservation.get(r.id)?.id ?? null,
            }))}
          />
          <div className="mt-3">
            <Pagination page={page} pageSize={PAGE_SIZE} total={total} buildHref={buildPageHref} />
          </div>
        </>
      )}
    </div>
  );
}
