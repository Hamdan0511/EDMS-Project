import Link from "next/link";
import { requirePageContext } from "@/lib/page-context";
import { hasPermission } from "@/lib/auth/permissions";
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
import { KpiCard } from "@/components/ui/kpi-card";
import { HardHat, Plus, CheckCircle2, AlertCircle, Wrench, ClipboardCheck } from "@/components/ui/icons";
import { EQUIPMENT_STATUS_LABELS, EQUIPMENT_STATUS_BADGE_CLASSES } from "@/lib/hse/status";
import { EQUIPMENT_TYPES } from "@/lib/hse/equipment";
import type { Prisma } from "@prisma/client";

const PAGE_SIZE = 25;

export default async function EquipmentRegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string; status?: string; page?: string }>;
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
  const canManage = await hasPermission(user.id, "HSE_MANAGE_EQUIPMENT", { projectId });

  const where: Prisma.HseEquipmentWhereInput = {
    projectId,
    ...(params.type ? { equipmentType: params.type } : {}),
    ...(params.status ? { status: params.status as never } : {}),
    ...(params.q?.trim()
      ? {
          OR: [
            { equipmentNumber: { contains: params.q.trim(), mode: "insensitive" } },
            { description: { contains: params.q.trim(), mode: "insensitive" } },
            { serialNumber: { contains: params.q.trim(), mode: "insensitive" } },
            { location: { contains: params.q.trim(), mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [rows, total, statusCounts] = await Promise.all([
    prisma.hseEquipment.findMany({
      where,
      include: { organization: true, responsiblePerson: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.hseEquipment.count({ where }),
    prisma.hseEquipment.groupBy({ by: ["status"], where: { projectId }, _count: true }),
  ]);

  const countFor = (status: string) => statusCounts.find((s) => s.status === status)?._count ?? 0;
  const totalEquipment = statusCounts.reduce((sum, s) => sum + s._count, 0);
  const inspectionDue = countFor("INSPECTION_DUE");
  const outOfService = countFor("OUT_OF_SERVICE");
  const underRepair = countFor("UNDER_REPAIR");
  const available = countFor("AVAILABLE") + countFor("PASSED") + countFor("RELEASED");

  function buildHref(targetPage: number): string {
    const sp = new URLSearchParams();
    if (params.q) sp.set("q", params.q);
    if (params.type) sp.set("type", params.type);
    if (params.status) sp.set("status", params.status);
    sp.set("page", String(targetPage));
    return `/hse/equipment?${sp.toString()}`;
  }

  return (
    <div className="p-6">
      <HsePageHeader
        title="Equipment Safety"
        description="Register and pre-use inspection status for cranes, forklifts, and other plant on this project — distinct from site/activity Inspections."
        action={
          canManage ? (
            <Link href="/hse/equipment/new" className={buttonClass("primary", "md")}>
              <Plus size={14} />
              Register Equipment
            </Link>
          ) : undefined
        }
      />

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <KpiCard label="Total Equipment" value={totalEquipment} icon={HardHat} href="/hse/equipment" />
        <KpiCard label="Available" value={available} icon={CheckCircle2} href="/hse/equipment?status=AVAILABLE" tone="neutral" />
        <KpiCard label="Inspection Due" value={inspectionDue} icon={ClipboardCheck} href="/hse/equipment?status=INSPECTION_DUE" tone="warning" />
        <KpiCard label="Out of Service" value={outOfService} icon={AlertCircle} href="/hse/equipment?status=OUT_OF_SERVICE" tone="critical" />
        <KpiCard label="Under Repair" value={underRepair} icon={Wrench} href="/hse/equipment?status=UNDER_REPAIR" tone="warning" />
      </div>

      <form action="/hse/equipment" method="GET" className="mt-4">
        <FilterBar>
          <Input name="q" defaultValue={params.q ?? ""} placeholder="Search ID, description, serial no., location…" className="w-72" />
          <Select name="type" defaultValue={params.type ?? ""} className="w-44">
            <option value="">All Types</option>
            {EQUIPMENT_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </Select>
          <Select name="status" defaultValue={params.status ?? ""} className="w-48">
            <option value="">All Statuses</option>
            {Object.entries(EQUIPMENT_STATUS_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </Select>
          <Button type="submit" variant="secondary">Search</Button>
          <Link href="/hse/equipment" className="text-[13px] text-text-secondary hover:underline">Clear</Link>
        </FilterBar>
      </form>

      {rows.length === 0 ? (
        <EmptyState
          icon={<HardHat size={26} strokeWidth={1.25} />}
          title="No equipment has been registered yet"
          description="Register cranes, forklifts, and other plant to track pre-use inspection status."
          action={
            canManage ? (
              <Link href="/hse/equipment/new" className={buttonClass("primary", "md")}>
                Register Equipment
              </Link>
            ) : undefined
          }
        />
      ) : (
        <>
          <ResultSummary count={total} noun="equipment record" />
          <Table>
            <Thead>
              <Tr>
                <Th>Equipment ID</Th>
                <Th>Type</Th>
                <Th>Description</Th>
                <Th>Location</Th>
                <Th>Owner</Th>
                <Th>Responsible</Th>
                <Th>Last Inspection</Th>
                <Th>Status</Th>
              </Tr>
            </Thead>
            <Tbody>
              {rows.map((r) => (
                <Tr key={r.id}>
                  <Td>
                    <Link href={`/hse/equipment/${r.id}`} className="font-medium text-brand-700 hover:underline">
                      {r.equipmentNumber}
                    </Link>
                  </Td>
                  <Td className="text-text-secondary">{r.equipmentType}</Td>
                  <Td className="max-w-xs truncate text-text-secondary">{r.description}</Td>
                  <Td className="text-text-secondary">{r.location ?? "—"}</Td>
                  <Td className="text-text-secondary">{r.organization?.name ?? "—"}</Td>
                  <Td className="text-text-secondary">{r.responsiblePerson?.name ?? "—"}</Td>
                  <Td className="text-text-secondary">{r.lastInspectionAt ? r.lastInspectionAt.toLocaleDateString("en-GB") : "—"}</Td>
                  <Td>
                    <StatusBadge label={EQUIPMENT_STATUS_LABELS[r.status]} className={EQUIPMENT_STATUS_BADGE_CLASSES[r.status]} />
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
