import Link from "next/link";
import { requirePageContext } from "@/lib/page-context";
import { hasPermission } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/table";
import { Select } from "@/components/ui/select";
import { Button, buttonClass } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { FilterBar, ResultSummary } from "@/components/ui/filter-bar";
import { HsePageHeader } from "@/components/hse/hse-page-header";
import { CalendarClock, Plus } from "@/components/ui/icons";
import {
  EMERGENCY_DRILL_STATUS_LABELS,
  EMERGENCY_DRILL_STATUS_BADGE_CLASSES,
  EMERGENCY_DRILL_RESULT_LABELS,
  EMERGENCY_DRILL_RESULT_BADGE_CLASSES,
} from "@/lib/hse/status";
import { DRILL_TYPES } from "@/lib/hse/emergency";
import type { Prisma } from "@prisma/client";

export default async function EmergencyDrillsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; type?: string }>;
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
  const canManage = await hasPermission(user.id, "HSE_MANAGE_EMERGENCY", { projectId });

  const where: Prisma.HseEmergencyDrillWhereInput = {
    projectId,
    ...(params.status ? { status: params.status as never } : {}),
    ...(params.type ? { drillType: params.type } : {}),
  };

  const drills = await prisma.hseEmergencyDrill.findMany({
    where,
    include: { coordinator: true, _count: { select: { attendees: true, findings: true } } },
    orderBy: { scheduledAt: "desc" },
  });

  return (
    <div className="p-6">
      <HsePageHeader
        title="Emergency Drills"
        description="Fire, evacuation, medical, and spill-response drills — attendance, findings, and results."
        action={
          canManage ? (
            <Link href="/hse/emergency/drills/new" className={buttonClass("primary", "md")}>
              <Plus size={14} />
              Schedule Drill
            </Link>
          ) : undefined
        }
      />

      <form action="/hse/emergency/drills" method="GET" className="mt-4">
        <FilterBar>
          <Select name="type" defaultValue={params.type ?? ""} className="w-48">
            <option value="">All Types</option>
            {DRILL_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </Select>
          <Select name="status" defaultValue={params.status ?? ""} className="w-40">
            <option value="">All Statuses</option>
            {Object.entries(EMERGENCY_DRILL_STATUS_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </Select>
          <Button type="submit" variant="secondary">Search</Button>
          <Link href="/hse/emergency/drills" className="text-[13px] text-text-secondary hover:underline">Clear</Link>
        </FilterBar>
      </form>

      {drills.length === 0 ? (
        <EmptyState
          icon={<CalendarClock size={26} strokeWidth={1.25} />}
          title="No emergency drills have been scheduled"
          description="Schedule fire, evacuation, medical, or spill-response drills to test this project's emergency readiness."
          action={
            canManage ? (
              <Link href="/hse/emergency/drills/new" className={buttonClass("primary", "md")}>
                Schedule Drill
              </Link>
            ) : undefined
          }
        />
      ) : (
        <>
          <ResultSummary count={drills.length} noun="drill" />
          <Table>
            <Thead>
              <Tr>
                <Th>Drill No.</Th>
                <Th>Type</Th>
                <Th>Scheduled</Th>
                <Th>Location</Th>
                <Th>Coordinator</Th>
                <Th>Attendees</Th>
                <Th>Findings</Th>
                <Th>Status</Th>
                <Th>Result</Th>
              </Tr>
            </Thead>
            <Tbody>
              {drills.map((d) => (
                <Tr key={d.id}>
                  <Td>
                    <Link href={`/hse/emergency/drills/${d.id}`} className="font-medium text-brand-700 hover:underline">
                      {d.drillNumber}
                    </Link>
                  </Td>
                  <Td className="text-text-secondary">{d.drillType}</Td>
                  <Td className="text-text-secondary">{d.scheduledAt.toLocaleString("en-GB")}</Td>
                  <Td className="text-text-secondary">{d.location}</Td>
                  <Td className="text-text-secondary">{d.coordinator.name}</Td>
                  <Td className="text-text-secondary">{d._count.attendees}</Td>
                  <Td className="text-text-secondary">{d._count.findings}</Td>
                  <Td>
                    <StatusBadge label={EMERGENCY_DRILL_STATUS_LABELS[d.status]} className={EMERGENCY_DRILL_STATUS_BADGE_CLASSES[d.status]} />
                  </Td>
                  <Td>
                    {d.result ? (
                      <StatusBadge label={EMERGENCY_DRILL_RESULT_LABELS[d.result]} className={EMERGENCY_DRILL_RESULT_BADGE_CLASSES[d.result]} />
                    ) : (
                      <span className="text-text-muted">—</span>
                    )}
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
