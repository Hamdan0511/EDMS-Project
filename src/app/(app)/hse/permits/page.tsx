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
import { FileWarning, Plus } from "@/components/ui/icons";
import { PERMIT_TYPE_LABELS, PERMIT_STATUS_LABELS, PERMIT_STATUS_BADGE_CLASSES } from "@/lib/hse/status";
import type { Prisma } from "@prisma/client";

const PAGE_SIZE = 25;

export default async function PermitsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; type?: string; expiringSoon?: string; page?: string }>;
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

  const canManage = await hasPermission(user.id, "HSE_MANAGE_PERMITS", { projectId });

  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
  const where: Prisma.HsePermitWhereInput = {
    projectId,
    ...(params.expiringSoon
      ? { status: "ACTIVE", endDate: { lte: sevenDaysFromNow } }
      : params.status
        ? { status: params.status as never }
        : {}),
    ...(params.type ? { type: params.type as never } : {}),
    ...(params.q?.trim()
      ? {
          OR: [
            { permitNumber: { contains: params.q.trim(), mode: "insensitive" } },
            { location: { contains: params.q.trim(), mode: "insensitive" } },
            { workDescription: { contains: params.q.trim(), mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.hsePermit.findMany({
      where,
      include: { requestedBy: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.hsePermit.count({ where }),
  ]);

  function buildHref(targetPage: number): string {
    const sp = new URLSearchParams();
    if (params.q) sp.set("q", params.q);
    if (params.status) sp.set("status", params.status);
    if (params.type) sp.set("type", params.type);
    if (params.expiringSoon) sp.set("expiringSoon", params.expiringSoon);
    sp.set("page", String(targetPage));
    return `/hse/permits?${sp.toString()}`;
  }

  return (
    <div className="p-6">
      <HsePageHeader
        title="Permits to Work"
        description="Permits authorizing high-risk work such as hot work, height and confined space entry on this project."
        action={
          canManage ? (
            <Link href="/hse/permits/new" className={buttonClass("primary", "md")}>
              <Plus size={14} />
              New Permit
            </Link>
          ) : undefined
        }
      />

      <form action="/hse/permits" method="GET" className="mt-4">
        <FilterBar>
          <Input name="q" defaultValue={params.q ?? ""} placeholder="Search number, location, work…" className="w-64" />
          <Select name="type" defaultValue={params.type ?? ""} className="w-44">
            <option value="">All Types</option>
            {Object.entries(PERMIT_TYPE_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </Select>
          <Select name="status" defaultValue={params.status ?? ""} className="w-44">
            <option value="">All Statuses</option>
            {Object.entries(PERMIT_STATUS_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </Select>
          <Button type="submit" variant="secondary">Search</Button>
          <Link href="/hse/permits" className="text-[13px] text-text-secondary hover:underline">Clear</Link>
        </FilterBar>
      </form>

      {rows.length === 0 ? (
        <EmptyState
          icon={<FileWarning size={26} strokeWidth={1.25} />}
          title="No permits to work found"
          description="Permits to work created for this project will appear here."
        />
      ) : (
        <>
          <ResultSummary count={total} noun="permit" />
          <Table>
            <Thead>
              <Tr>
                <Th>Permit No.</Th>
                <Th>Type</Th>
                <Th>Location</Th>
                <Th>Requested By</Th>
                <Th>Valid Period</Th>
                <Th>Status</Th>
              </Tr>
            </Thead>
            <Tbody>
              {rows.map((r) => (
                <Tr key={r.id}>
                  <Td>
                    <Link href={`/hse/permits/${r.id}`} className="font-medium text-brand-700 hover:underline">
                      {r.permitNumber}
                    </Link>
                  </Td>
                  <Td className="text-text-secondary">{PERMIT_TYPE_LABELS[r.type]}</Td>
                  <Td className="text-text-secondary">{r.location}</Td>
                  <Td className="text-text-secondary">{r.requestedBy.name}</Td>
                  <Td className="text-text-secondary">
                    {r.startDate.toLocaleDateString("en-GB")} – {r.endDate.toLocaleDateString("en-GB")}
                  </Td>
                  <Td>
                    <StatusBadge label={PERMIT_STATUS_LABELS[r.status]} className={PERMIT_STATUS_BADGE_CLASSES[r.status]} />
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
