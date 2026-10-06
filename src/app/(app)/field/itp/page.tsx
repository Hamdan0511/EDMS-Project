import Link from "next/link";
import { requirePageContext } from "@/lib/page-context";
import { hasPermission } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/table";
import { buttonClass } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { ResultSummary } from "@/components/ui/filter-bar";
import { StatusTabs, type StatusTab } from "@/components/ui/status-tabs";
import { FieldPageHeader } from "@/components/field/field-page-header";
import { ClipboardList, Plus } from "@/components/ui/icons";
import { ITP_STATUS_LABELS, ITP_STATUS_BADGE_CLASSES } from "@/lib/field/status";
import type { FieldItpStatus, Prisma } from "@prisma/client";

const ITP_STATUS_ORDER: FieldItpStatus[] = ["DRAFT", "PENDING_APPROVAL", "APPROVED", "REJECTED", "SUPERSEDED"];

export default async function ItpPage({
  searchParams,
}: {
  searchParams: Promise<{ areaId?: string; status?: string }>;
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
  const canManage = await hasPermission(user.id, "FIELD_MANAGE_ITP", { projectId });

  const baseFilters: Prisma.FieldItpWhereInput = { projectId, ...(params.areaId ? { areaId: params.areaId } : {}) };
  const where: Prisma.FieldItpWhereInput = { ...baseFilters, ...(params.status ? { status: params.status as never } : {}) };

  const [itps, statusCounts, allCount] = await Promise.all([
    prisma.fieldItp.findMany({
      where,
      include: { area: true, _count: { select: { items: true } } },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    }),
    prisma.fieldItp.groupBy({ by: ["status"], where: baseFilters, _count: true }),
    prisma.fieldItp.count({ where: baseFilters }),
  ]);
  const activeHoldPoints = await prisma.fieldItpItem.count({ where: { itp: { projectId }, status: "HOLD_ACTIVE" } });

  function buildHref(status?: string): string {
    const sp = new URLSearchParams();
    if (params.areaId) sp.set("areaId", params.areaId);
    if (status) sp.set("status", status);
    const qs = sp.toString();
    return `/field/itp${qs ? `?${qs}` : ""}`;
  }
  const countByStatus = Object.fromEntries(statusCounts.map((s) => [s.status, s._count]));
  const tabs: StatusTab[] = [
    { key: "all", label: "All", count: allCount, href: buildHref() },
    ...ITP_STATUS_ORDER.map((s) => ({ key: s, label: ITP_STATUS_LABELS[s], count: countByStatus[s] ?? 0, href: buildHref(s) })),
  ];

  return (
    <div className="p-6">
      <FieldPageHeader
        title="ITP & Hold Points"
        description="Inspection & Test Plans — hold points are enforced server-side and can only be released through a real approval decision."
        action={
          canManage ? (
            <Link href="/field/itp/new" className={buttonClass("primary", "md")}>
              <Plus size={14} />
              New ITP
            </Link>
          ) : undefined
        }
      />

      {activeHoldPoints > 0 && (
        <div className="mt-4 rounded-[3px] border border-red-300 bg-red-50 px-4 py-2.5 text-[13px] text-red-800">
          {activeHoldPoints} hold point{activeHoldPoints === 1 ? "" : "s"} currently active across this project&apos;s ITPs.
        </div>
      )}

      <div className="mt-4">
        <StatusTabs tabs={tabs} active={params.status || "all"} />
      </div>

      <div>
        {itps.length === 0 ? (
          <EmptyState
            icon={<ClipboardList size={26} strokeWidth={1.25} />}
            title="No ITPs have been created yet"
            description="Create an Inspection & Test Plan to track hold, witness, and review points for a construction activity."
            action={
              canManage ? (
                <Link href="/field/itp/new" className={buttonClass("primary", "md")}>
                  New ITP
                </Link>
              ) : undefined
            }
          />
        ) : (
          <>
            <ResultSummary count={itps.length} noun="ITP" />
            <Table>
              <Thead>
                <Tr>
                  <Th>ITP No.</Th>
                  <Th>Title</Th>
                  <Th>Rev</Th>
                  <Th>Location</Th>
                  <Th>Activities</Th>
                  <Th>Status</Th>
                </Tr>
              </Thead>
              <Tbody>
                {itps.map((r) => (
                  <Tr key={r.id}>
                    <Td><Link href={`/field/itp/${r.id}`} className="font-medium text-brand-700 hover:underline">{r.itpNumber}</Link></Td>
                    <Td className="text-text-secondary">{r.title}</Td>
                    <Td className="text-text-secondary">{r.revision}</Td>
                    <Td className="text-text-secondary">{r.area?.name ?? "—"}</Td>
                    <Td className="text-text-secondary">{r._count.items}</Td>
                    <Td><StatusBadge label={ITP_STATUS_LABELS[r.status]} className={ITP_STATUS_BADGE_CLASSES[r.status]} /></Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </>
        )}
      </div>
    </div>
  );
}
