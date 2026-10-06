import Link from "next/link";
import { requirePageContext } from "@/lib/page-context";
import { hasPermission } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";
import { computePunchlistCompletion } from "@/lib/services/field/punch-service";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/table";
import { Select } from "@/components/ui/select";
import { Button, buttonClass } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { FilterBar, ResultSummary } from "@/components/ui/filter-bar";
import { StatusTabs, type StatusTab } from "@/components/ui/status-tabs";
import { FieldPageHeader } from "@/components/field/field-page-header";
import { FieldThumbnail } from "@/components/field/field-thumbnail";
import { ListTodo, Plus } from "@/components/ui/icons";
import { PUNCH_ITEM_STATUS_LABELS, PUNCH_ITEM_STATUS_BADGE_CLASSES, PUNCH_ITEM_STATUS_ORDER } from "@/lib/field/status";
import type { Prisma } from "@prisma/client";

export default async function PunchPage({
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
  const canManage = await hasPermission(user.id, "FIELD_MANAGE_PUNCH", { projectId });

  const baseFilters: Prisma.FieldPunchItemWhereInput = {
    projectId,
    ...(params.areaId ? { areaId: params.areaId } : {}),
  };
  const where: Prisma.FieldPunchItemWhereInput = { ...baseFilters, ...(params.status ? { status: params.status as never } : {}) };

  const [punchlists, items, statusCounts, allCount] = await Promise.all([
    prisma.fieldPunchlist.findMany({
      where: { projectId },
      include: { area: true, _count: { select: { items: true, issues: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.fieldPunchItem.findMany({
      where,
      include: { area: true, responsibleUser: true, punchlist: true },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    }),
    prisma.fieldPunchItem.groupBy({ by: ["status"], where: baseFilters, _count: true }),
    prisma.fieldPunchItem.count({ where: baseFilters }),
  ]);

  const completions = await Promise.all(punchlists.map((p) => computePunchlistCompletion(p.id)));
  const overdueCounts = await Promise.all(
    punchlists.map((p) =>
      prisma.fieldPunchItem.count({
        where: { punchlistId: p.id, status: { notIn: ["VERIFIED", "CLOSED"] }, dueDate: { lt: new Date() } },
      }),
    ),
  );

  const itemIds = items.map((i) => i.id);
  const attachments = await prisma.fieldAttachment.findMany({
    where: { recordType: "FieldPunchItem", recordId: { in: itemIds } },
    orderBy: { uploadedAt: "desc" },
    select: { id: true, recordId: true },
  });
  const firstAttachmentByItem = new Map<string, string>();
  for (const a of attachments) {
    if (!firstAttachmentByItem.has(a.recordId)) firstAttachmentByItem.set(a.recordId, a.id);
  }

  function buildHref(status?: string): string {
    const sp = new URLSearchParams();
    if (params.areaId) sp.set("areaId", params.areaId);
    if (status) sp.set("status", status);
    const qs = sp.toString();
    return `/field/punch${qs ? `?${qs}` : ""}`;
  }

  const countByStatus = Object.fromEntries(statusCounts.map((s) => [s.status, s._count]));
  const tabs: StatusTab[] = [
    { key: "all", label: "All", count: allCount, href: buildHref() },
    ...PUNCH_ITEM_STATUS_ORDER.map((s) => ({ key: s, label: PUNCH_ITEM_STATUS_LABELS[s], count: countByStatus[s] ?? 0, href: buildHref(s) })),
  ];

  return (
    <div className="p-6">
      <FieldPageHeader
        title="Punch / Snagging"
        description="Punchlists group related punch items; completion percentage is calculated live from real item statuses."
        action={
          canManage ? (
            <div className="flex gap-2">
              <Link href="/field/punch/lists/new" className={buttonClass("secondary", "md")}>
                New Punchlist
              </Link>
              <Link href="/field/punch/new" className={buttonClass("primary", "md")}>
                <Plus size={14} />
                New Punch Item
              </Link>
            </div>
          ) : undefined
        }
      />

      {punchlists.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-text-secondary">Punchlists</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {punchlists.map((p, i) => (
              <Link key={p.id} href={`/field/punch/lists/${p.id}`} className="rounded-[3px] border border-border bg-white p-3.5 hover:border-brand-400">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[13px] font-medium text-text-primary">{p.title}</p>
                  {overdueCounts[i] > 0 && <StatusBadge label={`${overdueCounts[i]} overdue`} className="bg-red-100 text-red-800" />}
                </div>
                <p className="text-[11px] text-text-secondary">
                  {p.area?.name ?? "—"} · {p._count.items} item{p._count.items === 1 ? "" : "s"}
                  {p._count.issues > 0 ? ` · ${p._count.issues} issue${p._count.issues === 1 ? "" : "s"} attached` : ""}
                </p>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-brand-100">
                  <div className="h-full rounded-full bg-brand-600" style={{ width: `${completions[i].percent}%` }} />
                </div>
                <p className="mt-1 text-[11px] text-text-muted">{completions[i].percent}% complete ({completions[i].done}/{completions[i].total})</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="mt-5">
        <StatusTabs tabs={tabs} active={params.status || "all"} />
      </div>

      <form action="/field/punch" method="GET" className="mt-1">
        <FilterBar>
          <Select name="status" defaultValue={params.status ?? ""} className="w-56">
            <option value="">All Statuses</option>
            {Object.entries(PUNCH_ITEM_STATUS_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </Select>
          <Button type="submit" variant="secondary">Search</Button>
          <Link href="/field/punch" className="text-[13px] text-text-secondary hover:underline">Clear All</Link>
        </FilterBar>
      </form>

      {items.length === 0 ? (
        <EmptyState
          icon={<ListTodo size={26} strokeWidth={1.25} />}
          title="No punch items yet"
          description="Once a punch item is recorded, it will appear here."
          action={
            canManage ? (
              <Link href="/field/punch/new" className={buttonClass("primary", "md")}>
                New Punch Item
              </Link>
            ) : undefined
          }
        />
      ) : (
        <>
          <ResultSummary count={items.length} noun="punch item" />
          <Table>
            <Thead>
              <Tr>
                <Th className="w-12"></Th>
                <Th>Item No.</Th>
                <Th>Title</Th>
                <Th>Punchlist</Th>
                <Th>Location</Th>
                <Th>Responsible</Th>
                <Th>Due</Th>
                <Th>Status</Th>
              </Tr>
            </Thead>
            <Tbody>
              {items.map((r) => (
                <Tr key={r.id}>
                  <Td>
                    <FieldThumbnail attachmentId={firstAttachmentByItem.get(r.id) ?? null} alt={r.title} />
                  </Td>
                  <Td>
                    <Link href={`/field/punch/${r.id}`} className="font-medium text-brand-700 hover:underline">
                      {r.punchItemNumber}
                    </Link>
                  </Td>
                  <Td className="max-w-xs truncate text-text-secondary">{r.title}</Td>
                  <Td className="text-text-secondary">{r.punchlist?.title ?? "—"}</Td>
                  <Td className="text-text-secondary">{r.area?.name ?? "—"}</Td>
                  <Td className="text-text-secondary">{r.responsibleUser?.name ?? "—"}</Td>
                  <Td className="text-text-secondary">{r.dueDate ? r.dueDate.toLocaleDateString("en-GB") : "—"}</Td>
                  <Td>
                    <StatusBadge label={PUNCH_ITEM_STATUS_LABELS[r.status]} className={PUNCH_ITEM_STATUS_BADGE_CLASSES[r.status]} />
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
