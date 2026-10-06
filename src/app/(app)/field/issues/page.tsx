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
import { IssuesTable } from "@/components/field/issues-table";
import { AlertCircle, Plus } from "@/components/ui/icons";
import { ISSUE_STATUS_LABELS, ISSUE_STATUS_ORDER, PRIORITY_LABELS } from "@/lib/field/status";
import type { Prisma } from "@prisma/client";

const PAGE_SIZE = 25;

export default async function IssuesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; priority?: string; areaId?: string; page?: string; group?: string }>;
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
  const canManage = await hasPermission(user.id, "FIELD_MANAGE_ISSUES", { projectId });

  const baseFilters: Prisma.FieldIssueWhereInput = {
    projectId,
    ...(params.priority ? { priority: params.priority as never } : {}),
    ...(params.areaId ? { areaId: params.areaId } : {}),
    ...(params.q?.trim()
      ? { OR: [{ issueNumber: { contains: params.q.trim(), mode: "insensitive" } }, { title: { contains: params.q.trim(), mode: "insensitive" } }] }
      : {}),
  };
  const where: Prisma.FieldIssueWhereInput = { ...baseFilters, ...(params.status ? { status: params.status as never } : {}) };

  const [rows, total, statusCounts, allCount] = await Promise.all([
    prisma.fieldIssue.findMany({
      where,
      include: { area: true, responsibleUser: true, type: true },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.fieldIssue.count({ where }),
    prisma.fieldIssue.groupBy({ by: ["status"], where: baseFilters, _count: true }),
    prisma.fieldIssue.count({ where: baseFilters }),
  ]);

  const issueIds = rows.map((r) => r.id);
  const attachments = await prisma.fieldAttachment.findMany({
    where: { recordType: "FieldIssue", recordId: { in: issueIds } },
    orderBy: { uploadedAt: "desc" },
    select: { id: true, recordId: true },
  });
  const firstAttachmentByIssue = new Map<string, string>();
  for (const a of attachments) {
    if (!firstAttachmentByIssue.has(a.recordId)) firstAttachmentByIssue.set(a.recordId, a.id);
  }

  function buildHref(extra: Record<string, string | undefined>): string {
    const sp = new URLSearchParams();
    if (params.q) sp.set("q", params.q);
    if (params.priority) sp.set("priority", params.priority);
    if (params.areaId) sp.set("areaId", params.areaId);
    for (const [k, v] of Object.entries(extra)) if (v) sp.set(k, v);
    const qs = sp.toString();
    return `/field/issues${qs ? `?${qs}` : ""}`;
  }

  function buildPageHref(targetPage: number): string {
    const sp = new URLSearchParams();
    if (params.q) sp.set("q", params.q);
    if (params.status) sp.set("status", params.status);
    if (params.priority) sp.set("priority", params.priority);
    if (params.areaId) sp.set("areaId", params.areaId);
    sp.set("page", String(targetPage));
    return `/field/issues?${sp.toString()}`;
  }

  const countByStatus = Object.fromEntries(statusCounts.map((s) => [s.status, s._count]));
  const tabs: StatusTab[] = [
    { key: "all", label: "All", count: allCount, href: buildHref({}) },
    ...ISSUE_STATUS_ORDER.map((s) => ({ key: s, label: ISSUE_STATUS_LABELS[s], count: countByStatus[s] ?? 0, href: buildHref({ status: s }) })),
  ];

  return (
    <div className="p-6">
      <FieldPageHeader
        title="Site Issues"
        description="Real action items — created manually or from an observation, failed inspection item, test, punch item, or photo."
        action={
          <div className="flex gap-2">
            <a href="/field/reports?type=issues" className={buttonClass("secondary", "md")}>Export</a>
            {canManage && (
              <Link href="/field/issues/new" className={buttonClass("primary", "md")}>
                <Plus size={14} />
                New Issue
              </Link>
            )}
          </div>
        }
      />

      <div className="mt-4">
        <StatusTabs tabs={tabs} active={params.status || "all"} />
      </div>

      <form action="/field/issues" method="GET" className="mt-1">
        <FilterBar>
          <Input name="q" defaultValue={params.q ?? ""} placeholder="Search number, title…" className="w-64" />
          <Select name="priority" defaultValue={params.priority ?? ""} className="w-36">
            <option value="">All Priorities</option>
            {Object.entries(PRIORITY_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </Select>
          <Select name="status" defaultValue={params.status ?? ""} className="w-56">
            <option value="">All Statuses</option>
            {Object.entries(ISSUE_STATUS_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </Select>
          <Button type="submit" variant="secondary">Search</Button>
          <Link href="/field/issues" className="text-[13px] text-text-secondary hover:underline">Clear All</Link>
        </FilterBar>
      </form>

      {rows.length === 0 ? (
        <EmptyState
          icon={<AlertCircle size={26} strokeWidth={1.25} />}
          title="No site issues yet"
          description="Once a field issue is recorded, it will appear here."
          action={
            canManage ? (
              <Link href="/field/issues/new" className={buttonClass("primary", "md")}>
                Create Issue
              </Link>
            ) : undefined
          }
        />
      ) : (
        <>
          <ResultSummary count={total} noun="issue" />
          <IssuesTable
            rows={rows.map((r) => ({
              id: r.id,
              issueNumber: r.issueNumber,
              title: r.title,
              areaName: r.area?.name ?? null,
              typeName: r.type?.name ?? null,
              responsibleName: r.responsibleUser?.name ?? null,
              dueDate: r.dueDate ? r.dueDate.toISOString() : null,
              priority: r.priority,
              status: r.status,
              sourceType: r.sourceType,
              updatedAt: r.updatedAt.toISOString(),
              thumbnailAttachmentId: firstAttachmentByIssue.get(r.id) ?? null,
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
