import Link from "next/link";
import { requirePageContext } from "@/lib/page-context";
import { prisma } from "@/lib/prisma";
import { EmptyState } from "@/components/ui/empty-state";
import { HsePageHeader } from "@/components/hse/hse-page-header";
import { KpiCard } from "@/components/ui/kpi-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { SectionHeader } from "@/components/ui/section-header";
import { CalendarClock, Siren, PhoneCall, BookOpen, CheckCircle2 } from "@/components/ui/icons";
import { EMERGENCY_EVENT_STATUS_LABELS, EMERGENCY_EVENT_STATUS_BADGE_CLASSES } from "@/lib/hse/status";

export default async function EmergencyManagementPage() {
  const { membership } = await requirePageContext();
  if (!membership) {
    return (
      <div className="p-6">
        <EmptyState title="You are not assigned to a project" />
      </div>
    );
  }
  const projectId = membership.projectId;
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    drillsThisPeriod,
    completedDrills,
    upcomingDrills,
    openFindingActions,
    recentEvents,
    contactsCount,
    activeProceduresCount,
    nextDrill,
  ] = await Promise.all([
    prisma.hseEmergencyDrill.count({ where: { projectId, scheduledAt: { gte: startOfMonth } } }),
    prisma.hseEmergencyDrill.count({ where: { projectId, status: "COMPLETED", scheduledAt: { gte: startOfMonth } } }),
    prisma.hseEmergencyDrill.count({ where: { projectId, status: "SCHEDULED", scheduledAt: { gte: now } } }),
    prisma.hseCorrectiveAction.count({
      where: { projectId, sourceType: "HseEmergencyDrillFinding", status: { notIn: ["VERIFIED", "CLOSED"] } },
    }),
    prisma.hseEmergencyEvent.findMany({ where: { projectId }, orderBy: { occurredAt: "desc" }, take: 5 }),
    prisma.hseEmergencyContact.count({ where: { projectId } }),
    prisma.hseEmergencyProcedure.count({ where: { projectId, status: "ACTIVE" } }),
    prisma.hseEmergencyDrill.findFirst({
      where: { projectId, status: "SCHEDULED", scheduledAt: { gte: now } },
      orderBy: { scheduledAt: "asc" },
      include: { coordinator: true },
    }),
  ]);

  return (
    <div className="p-6">
      <HsePageHeader
        title="Emergency Management"
        description="Emergency contacts, procedures, real events, and drill readiness for this project."
      />

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard label="Drills This Period" value={drillsThisPeriod} icon={CalendarClock} href="/hse/emergency/drills" />
        <KpiCard label="Completed Drills" value={completedDrills} icon={CheckCircle2} href="/hse/emergency/drills?status=COMPLETED" />
        <KpiCard label="Upcoming Drills" value={upcomingDrills} icon={CalendarClock} href="/hse/emergency/drills?status=SCHEDULED" />
        <KpiCard label="Open Emergency Actions" value={openFindingActions} icon={CheckCircle2} tone={openFindingActions > 0 ? "warning" : "neutral"} href="/hse/corrective-actions" />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-[3px] border border-border bg-white lg:col-span-2">
          <SectionHeader>Recent Emergency Events</SectionHeader>
          {recentEvents.length === 0 ? (
            <EmptyState
              icon={<Siren size={24} strokeWidth={1.25} />}
              title="No emergency events recorded"
              description="Real emergency events reported for this project will appear here."
              className="border-none bg-transparent py-8"
            />
          ) : (
            <ul className="divide-y divide-border">
              {recentEvents.map((e) => (
                <li key={e.id}>
                  <Link href={`/hse/emergency/events/${e.id}`} className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-brand-50/60">
                    <div className="flex flex-col">
                      <span className="text-[13px] font-medium text-text-primary">{e.eventNumber} — {e.emergencyType}</span>
                      <span className="text-[11px] text-text-secondary">{e.location} · {e.occurredAt.toLocaleDateString("en-GB")}</span>
                    </div>
                    <StatusBadge label={EMERGENCY_EVENT_STATUS_LABELS[e.status]} className={EMERGENCY_EVENT_STATUS_BADGE_CLASSES[e.status]} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-[3px] border border-border bg-white">
          <SectionHeader>Next Drill</SectionHeader>
          {nextDrill ? (
            <div className="px-4 py-3">
              <p className="text-[13px] font-semibold text-text-primary">{nextDrill.drillType}</p>
              <p className="mt-1 text-[12px] text-text-secondary">{nextDrill.scheduledAt.toLocaleString("en-GB")}</p>
              <p className="text-[12px] text-text-secondary">{nextDrill.location}</p>
              <p className="text-[12px] text-text-secondary">Coordinator: {nextDrill.coordinator.name}</p>
              <Link href={`/hse/emergency/drills/${nextDrill.id}`} className="mt-3 inline-block text-[12px] font-medium text-brand-700 hover:underline">
                View Drill →
              </Link>
            </div>
          ) : (
            <EmptyState title="No upcoming drills" description="Schedule a drill to test emergency readiness." className="border-none bg-transparent py-6" />
          )}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Link href="/hse/emergency/contacts" className="flex items-center gap-3 rounded-[3px] border border-border bg-white px-4 py-3.5 hover:border-brand-400">
          <PhoneCall size={18} className="text-brand-700" />
          <div>
            <p className="text-[13px] font-medium text-text-primary">Emergency Contacts</p>
            <p className="text-[11px] text-text-secondary">{contactsCount} contact{contactsCount === 1 ? "" : "s"}</p>
          </div>
        </Link>
        <Link href="/hse/emergency/procedures" className="flex items-center gap-3 rounded-[3px] border border-border bg-white px-4 py-3.5 hover:border-brand-400">
          <BookOpen size={18} className="text-brand-700" />
          <div>
            <p className="text-[13px] font-medium text-text-primary">Emergency Procedures</p>
            <p className="text-[11px] text-text-secondary">{activeProceduresCount} active</p>
          </div>
        </Link>
        <Link href="/hse/emergency/events" className="flex items-center gap-3 rounded-[3px] border border-border bg-white px-4 py-3.5 hover:border-brand-400">
          <Siren size={18} className="text-brand-700" />
          <div>
            <p className="text-[13px] font-medium text-text-primary">Emergency Events</p>
            <p className="text-[11px] text-text-secondary">View all events</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
