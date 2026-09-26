import Link from "next/link";
import { requirePageContext } from "@/lib/page-context";
import { hasPermission } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/table";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button, buttonClass } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { FilterBar, ResultSummary } from "@/components/ui/filter-bar";
import { HsePageHeader } from "@/components/hse/hse-page-header";
import { Siren, Plus } from "@/components/ui/icons";
import { EMERGENCY_EVENT_STATUS_LABELS, EMERGENCY_EVENT_STATUS_BADGE_CLASSES, SEVERITY_LABELS, SEVERITY_BADGE_CLASSES } from "@/lib/hse/status";
import { EMERGENCY_TYPES } from "@/lib/hse/emergency";
import type { Prisma } from "@prisma/client";

export default async function EmergencyEventsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; severity?: string; type?: string }>;
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

  const where: Prisma.HseEmergencyEventWhereInput = {
    projectId,
    ...(params.status ? { status: params.status as never } : {}),
    ...(params.severity ? { severity: params.severity as never } : {}),
    ...(params.type ? { emergencyType: params.type } : {}),
    ...(params.q?.trim()
      ? { OR: [{ eventNumber: { contains: params.q.trim(), mode: "insensitive" } }, { location: { contains: params.q.trim(), mode: "insensitive" } }] }
      : {}),
  };

  const events = await prisma.hseEmergencyEvent.findMany({
    where,
    include: { reportedBy: true },
    orderBy: { occurredAt: "desc" },
  });

  return (
    <div className="p-6">
      <HsePageHeader
        title="Emergency Events"
        description="Real emergency events recorded on this project, with status tracked from report through follow-up to closure."
        action={
          canManage ? (
            <Link href="/hse/emergency/events/new" className={buttonClass("primary", "md")}>
              <Plus size={14} />
              Report Emergency Event
            </Link>
          ) : undefined
        }
      />

      <form action="/hse/emergency/events" method="GET" className="mt-4">
        <FilterBar>
          <Input name="q" defaultValue={params.q ?? ""} placeholder="Search event no., location…" className="w-64" />
          <Select name="type" defaultValue={params.type ?? ""} className="w-44">
            <option value="">All Types</option>
            {EMERGENCY_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </Select>
          <Select name="severity" defaultValue={params.severity ?? ""} className="w-36">
            <option value="">All Severities</option>
            {Object.entries(SEVERITY_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </Select>
          <Select name="status" defaultValue={params.status ?? ""} className="w-40">
            <option value="">All Statuses</option>
            {Object.entries(EMERGENCY_EVENT_STATUS_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </Select>
          <Button type="submit" variant="secondary">Search</Button>
          <Link href="/hse/emergency/events" className="text-[13px] text-text-secondary hover:underline">Clear</Link>
        </FilterBar>
      </form>

      {events.length === 0 ? (
        <EmptyState
          icon={<Siren size={26} strokeWidth={1.25} />}
          title="No emergency events have been recorded"
          description="Real emergency events reported for this project will appear here."
          action={
            canManage ? (
              <Link href="/hse/emergency/events/new" className={buttonClass("primary", "md")}>
                Report Emergency Event
              </Link>
            ) : undefined
          }
        />
      ) : (
        <>
          <ResultSummary count={events.length} noun="event" />
          <Table>
            <Thead>
              <Tr>
                <Th>Event No.</Th>
                <Th>Type</Th>
                <Th>Location</Th>
                <Th>Date</Th>
                <Th>Reported By</Th>
                <Th>Severity</Th>
                <Th>Status</Th>
              </Tr>
            </Thead>
            <Tbody>
              {events.map((e) => (
                <Tr key={e.id}>
                  <Td>
                    <Link href={`/hse/emergency/events/${e.id}`} className="font-medium text-brand-700 hover:underline">
                      {e.eventNumber}
                    </Link>
                  </Td>
                  <Td className="text-text-secondary">{e.emergencyType}</Td>
                  <Td className="text-text-secondary">{e.location}</Td>
                  <Td className="text-text-secondary">{e.occurredAt.toLocaleString("en-GB")}</Td>
                  <Td className="text-text-secondary">{e.reportedBy.name}</Td>
                  <Td>
                    <StatusBadge label={SEVERITY_LABELS[e.severity]} className={SEVERITY_BADGE_CLASSES[e.severity]} />
                  </Td>
                  <Td>
                    <StatusBadge label={EMERGENCY_EVENT_STATUS_LABELS[e.status]} className={EMERGENCY_EVENT_STATUS_BADGE_CLASSES[e.status]} />
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
