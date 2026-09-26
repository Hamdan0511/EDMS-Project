import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePageContext } from "@/lib/page-context";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/auth/permissions";
import { SectionHeader } from "@/components/ui/section-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { buttonClass } from "@/components/ui/button";
import { ChevronLeft } from "@/components/ui/icons";
import { HseAuditTrail } from "@/components/hse/hse-audit-trail";
import { DrillAttendanceForm } from "@/components/hse/drill-attendance-form";
import { DrillCompleteForm } from "@/components/hse/drill-complete-form";
import { DrillFindingsPanel } from "@/components/hse/drill-findings-panel";
import { getHseAuditTrail } from "@/lib/hse/audit-trail";
import {
  EMERGENCY_DRILL_STATUS_LABELS,
  EMERGENCY_DRILL_STATUS_BADGE_CLASSES,
  EMERGENCY_DRILL_RESULT_LABELS,
  EMERGENCY_DRILL_RESULT_BADGE_CLASSES,
} from "@/lib/hse/status";

export default async function EmergencyDrillDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user, membership } = await requirePageContext();
  if (!membership) return null;
  const { id } = await params;
  const projectId = membership.projectId;

  const drill = await prisma.hseEmergencyDrill.findFirst({
    where: { id, projectId },
    include: {
      coordinator: true,
      createdBy: true,
      attendees: true,
      findings: { orderBy: { id: "asc" } },
    },
  });
  if (!drill) notFound();

  const [canManage, auditTrail, projectMembers, findingActions] = await Promise.all([
    hasPermission(user.id, "HSE_MANAGE_EMERGENCY", { projectId }),
    getHseAuditTrail("HseEmergencyDrill", id, projectId),
    prisma.projectMember.findMany({ where: { projectId }, include: { user: true }, orderBy: { user: { name: "asc" } } }),
    prisma.hseCorrectiveAction.findMany({
      where: { projectId, sourceType: "HseEmergencyDrillFinding", sourceId: { in: drill.findings.map((f) => f.id) } },
    }),
  ]);

  const actionByFinding = new Map(findingActions.map((a) => [a.sourceId, a]));
  const members = projectMembers.map((m) => ({ id: m.user.id, name: m.user.name }));
  const presentCount = drill.attendees.filter((a) => a.present).length;

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between border-b border-border pb-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">Emergency Drill</p>
          <h1 className="mt-0.5 text-lg font-semibold tracking-tight text-text-primary">{drill.drillNumber}</h1>
        </div>
        <Link href="/hse/emergency/drills" className={buttonClass("secondary", "md")}>
          <ChevronLeft size={14} />
          Back
        </Link>
      </div>

      <div className="mx-auto w-full max-w-3xl rounded-[3px] border border-border bg-white">
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
          <StatusBadge label={EMERGENCY_DRILL_STATUS_LABELS[drill.status]} className={EMERGENCY_DRILL_STATUS_BADGE_CLASSES[drill.status]} />
          {drill.result && (
            <StatusBadge label={EMERGENCY_DRILL_RESULT_LABELS[drill.result]} className={EMERGENCY_DRILL_RESULT_BADGE_CLASSES[drill.result]} />
          )}
          <span className="text-[13px] text-text-secondary">{drill.drillType}</span>
        </div>

        <SectionHeader>Overview</SectionHeader>
        <div className="grid grid-cols-2 gap-x-8 gap-y-2 px-4 py-3 text-[13px]">
          <Row label="Location" value={drill.location} />
          <Row label="Scheduled" value={drill.scheduledAt.toLocaleString("en-GB")} />
          <Row label="Coordinator" value={drill.coordinator.name} />
          <Row label="Assembly Point" value={drill.assemblyPoint ?? "—"} />
          <Row label="Expected Participants" value={drill.expectedParticipants?.toString() ?? "—"} />
          <Row label="Actual Participants" value={drill.actualParticipants?.toString() ?? (drill.status === "COMPLETED" ? String(presentCount) : "—")} />
        </div>

        {drill.scenario && (
          <>
            <SectionHeader>Scenario</SectionHeader>
            <div className="whitespace-pre-wrap px-4 py-3 text-[13px] text-text-primary">{drill.scenario}</div>
          </>
        )}

        {drill.observations && (
          <>
            <SectionHeader>Observations</SectionHeader>
            <div className="whitespace-pre-wrap px-4 py-3 text-[13px] text-text-primary">{drill.observations}</div>
          </>
        )}

        <SectionHeader>Attendance</SectionHeader>
        {canManage ? (
          <div className="px-4 py-3">
            <DrillAttendanceForm
              drillId={drill.id}
              members={members}
              existing={drill.attendees.map((a) => ({ userId: a.userId, present: a.present, role: a.role }))}
            />
          </div>
        ) : (
          <p className="px-4 py-3 text-[13px] text-text-secondary">
            {presentCount} of {members.length} expected participants present.
          </p>
        )}

        <SectionHeader>Findings</SectionHeader>
        <DrillFindingsPanel
          drillId={drill.id}
          canManage={canManage}
          members={members}
          findings={drill.findings.map((f) => {
            const action = actionByFinding.get(f.id);
            return {
              id: f.id,
              issue: f.issue,
              severity: f.severity,
              finding: f.finding,
              correctiveAction: action ? { id: action.id, actionNumber: action.actionNumber, status: action.status } : null,
            };
          })}
        />

        {canManage && drill.status !== "COMPLETED" && (
          <>
            <SectionHeader>Complete Drill</SectionHeader>
            <div className="px-4 py-3">
              <DrillCompleteForm drillId={drill.id} defaultParticipants={presentCount} />
            </div>
          </>
        )}

        <SectionHeader>Timeline &amp; Audit</SectionHeader>
        <HseAuditTrail events={auditTrail} />
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="w-48 shrink-0 text-text-muted">{label}</span>
      <span className="text-text-primary">{value}</span>
    </div>
  );
}
