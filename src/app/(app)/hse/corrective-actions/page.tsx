import Link from "next/link";
import { requirePageContext } from "@/lib/page-context";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/auth/permissions";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button, buttonClass } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { FilterBar, ResultSummary } from "@/components/ui/filter-bar";
import { HsePageHeader } from "@/components/hse/hse-page-header";
import { ClipboardCheck, Plus } from "@/components/ui/icons";
import { ACTION_STATUS_LABELS, ACTION_STATUS_BADGE_CLASSES, ACTION_PRIORITY_LABELS, ACTION_PRIORITY_BADGE_CLASSES } from "@/lib/hse/status";
import type { Prisma } from "@prisma/client";

const PAGE_SIZE = 25;

export default async function CorrectiveActionsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; priority?: string; overdue?: string; assignedToMe?: string; page?: string }>;
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

  const canManage = await hasPermission(user.id, "HSE_MANAGE_ACTIONS", { projectId });

  const where: Prisma.HseCorrectiveActionWhereInput = {
    projectId,
    ...(params.status ? { status: params.status as never } : {}),
    ...(params.priority ? { priority: params.priority as never } : {}),
    ...(params.assignedToMe ? { assignedToId: user.id } : {}),
    ...(params.overdue
      ? { dueDate: { lt: new Date() }, NOT: { status: { in: ["VERIFIED", "CLOSED"] } } }
      : {}),
    ...(params.q?.trim()
      ? {
          OR: [
            { actionNumber: { contains: params.q.trim(), mode: "insensitive" } },
            { description: { contains: params.q.trim(), mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.hseCorrectiveAction.findMany({
      where,
      include: { assignedTo: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.hseCorrectiveAction.count({ where }),
  ]);

  function buildHref(targetPage: number): string {
    const sp = new URLSearchParams();
    if (params.q) sp.set("q", params.q);
    if (params.status) sp.set("status", params.status);
    if (params.priority) sp.set("priority", params.priority);
    if (params.overdue) sp.set("overdue", params.overdue);
    if (params.assignedToMe) sp.set("assignedToMe", params.assignedToMe);
    sp.set("page", String(targetPage));
    return `/hse/corrective-actions?${sp.toString()}`;
  }

  return (
    <div className="p-6">
      <HsePageHeader
        title="Corrective Actions"
        description="Actions raised from observations, incidents, hazards and inspections to be tracked to closure."
        action={
          canManage ? (
            <Link href="/hse/corrective-actions/new" className={buttonClass("primary", "md")}>
              <Plus size={14} />
              New Action
            </Link>
          ) : undefined
        }
      />

      <form action="/hse/corrective-actions" method="GET" className="mt-4">
        <FilterBar>
          <Input name="q" defaultValue={params.q ?? ""} placeholder="Search number, description…" className="w-64" />
          <Select name="status" defaultValue={params.status ?? ""} className="w-44">
            <option value="">All Statuses</option>
            {Object.entries(ACTION_STATUS_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </Select>
          <Select name="priority" defaultValue={params.priority ?? ""} className="w-40">
            <option value="">All Priorities</option>
            {Object.entries(ACTION_PRIORITY_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </Select>
          <Button type="submit" variant="secondary">Search</Button>
          <Link href="/hse/corrective-actions" className="text-[13px] text-text-secondary hover:underline">Clear</Link>
        </FilterBar>
      </form>

      {rows.length === 0 ? (
        <EmptyState
          icon={<ClipboardCheck size={26} strokeWidth={1.25} />}
          title="No corrective actions found"
          description="Actions raised from observations, incidents, hazards and inspections will appear here."
        />
      ) : (
        <>
          <ResultSummary count={total} noun="corrective action" />
          <Table>
            <Thead>
              <Tr>
                <Th>Action No.</Th>
                <Th>Description</Th>
                <Th>Source</Th>
                <Th>Assigned To</Th>
                <Th>Priority</Th>
                <Th>Due Date</Th>
                <Th>Status</Th>
              </Tr>
            </Thead>
            <Tbody>
              {rows.map((r) => {
                const overdue = r.dueDate && r.dueDate < new Date() && r.status !== "VERIFIED" && r.status !== "CLOSED";
                return (
                  <Tr key={r.id}>
                    <Td>
                      <Link href={`/hse/corrective-actions/${r.id}`} className="font-medium text-brand-700 hover:underline">
                        {r.actionNumber}
                      </Link>
                    </Td>
                    <Td className="max-w-xs truncate text-text-secondary">{r.description}</Td>
                    <Td className="text-text-secondary">{r.sourceType === "manual" ? "Manual" : r.sourceType.replace("Hse", "")}</Td>
                    <Td className="text-text-secondary">{r.assignedTo?.name ?? "—"}</Td>
                    <Td>
                      <StatusBadge label={ACTION_PRIORITY_LABELS[r.priority]} className={ACTION_PRIORITY_BADGE_CLASSES[r.priority]} />
                    </Td>
                    <Td className={overdue ? "font-medium text-danger" : "text-text-secondary"}>
                      {r.dueDate ? r.dueDate.toLocaleDateString("en-GB") : "—"}
                      {overdue ? " (Overdue)" : ""}
                    </Td>
                    <Td>
                      <StatusBadge label={ACTION_STATUS_LABELS[r.status]} className={ACTION_STATUS_BADGE_CLASSES[r.status]} />
                    </Td>
                  </Tr>
                );
              })}
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
