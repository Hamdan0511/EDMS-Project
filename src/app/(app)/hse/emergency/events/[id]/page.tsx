import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePageContext } from "@/lib/page-context";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/auth/permissions";
import { SectionHeader } from "@/components/ui/section-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { buttonClass } from "@/components/ui/button";
import { ChevronLeft } from "@/components/ui/icons";
import { HseEvidencePanel } from "@/components/hse/hse-evidence-panel";
import { HseStatusForm } from "@/components/hse/hse-status-form";
import { HseAuditTrail } from "@/components/hse/hse-audit-trail";
import { getHseAuditTrail } from "@/lib/hse/audit-trail";
import {
  EMERGENCY_EVENT_STATUS_LABELS,
  EMERGENCY_EVENT_STATUS_BADGE_CLASSES,
  SEVERITY_LABELS,
  SEVERITY_BADGE_CLASSES,
} from "@/lib/hse/status";

export default async function EmergencyEventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user, membership } = await requirePageContext();
  if (!membership) return null;
  const { id } = await params;

  const event = await prisma.hseEmergencyEvent.findFirst({
    where: { id, projectId: membership.projectId },
    include: { reportedBy: true },
  });
  if (!event) notFound();

  const [attachments, canManage, auditTrail] = await Promise.all([
    prisma.hseAttachment.findMany({
      where: { recordType: "HseEmergencyEvent", recordId: id },
      include: { uploadedBy: true },
      orderBy: { uploadedAt: "desc" },
    }),
    hasPermission(user.id, "HSE_MANAGE_EMERGENCY", { projectId: membership.projectId }),
    getHseAuditTrail("HseEmergencyEvent", id, membership.projectId),
  ]);

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between border-b border-border pb-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">Emergency Event</p>
          <h1 className="mt-0.5 text-lg font-semibold tracking-tight text-text-primary">{event.eventNumber}</h1>
        </div>
        <Link href="/hse/emergency/events" className={buttonClass("secondary", "md")}>
          <ChevronLeft size={14} />
          Back
        </Link>
      </div>

      <div className="mx-auto w-full max-w-3xl rounded-[3px] border border-border bg-white">
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
          <StatusBadge label={EMERGENCY_EVENT_STATUS_LABELS[event.status]} className={EMERGENCY_EVENT_STATUS_BADGE_CLASSES[event.status]} />
          <StatusBadge label={`${SEVERITY_LABELS[event.severity]} Severity`} className={SEVERITY_BADGE_CLASSES[event.severity]} />
          <span className="text-[13px] text-text-secondary">{event.emergencyType}</span>
        </div>

        <SectionHeader>Overview</SectionHeader>
        <div className="grid grid-cols-2 gap-x-8 gap-y-2 px-4 py-3 text-[13px]">
          <Row label="Location" value={event.location} />
          <Row label="Occurred" value={event.occurredAt.toLocaleString("en-GB")} />
          <Row label="Reported By" value={event.reportedBy.name} />
          <Row label="People Affected" value={event.peopleAffected ?? "None reported"} />
          <Row label="Emergency Services Contacted" value={event.emergencyServicesContacted ? "Yes" : "No"} />
          <Row label="Evacuation Required" value={event.evacuationRequired ? "Yes" : "No"} />
          <Row label="Assembly Point" value={event.assemblyPoint ?? "—"} />
        </div>

        <SectionHeader>Description</SectionHeader>
        <div className="whitespace-pre-wrap px-4 py-3 text-[13px] text-text-primary">{event.description}</div>

        {event.immediateActions && (
          <>
            <SectionHeader>Immediate Actions</SectionHeader>
            <div className="whitespace-pre-wrap px-4 py-3 text-[13px] text-text-primary">{event.immediateActions}</div>
          </>
        )}

        <SectionHeader>Documents / Evidence</SectionHeader>
        <div className="px-4 py-3">
          <HseEvidencePanel
            recordType="HseEmergencyEvent"
            recordId={event.id}
            canUpload={canManage}
            items={attachments.map((a) => ({
              id: a.id,
              fileName: a.fileName,
              mimeType: a.mimeType,
              sizeBytes: a.sizeBytes,
              uploadedByName: a.uploadedBy.name,
              uploadedAt: a.uploadedAt.toISOString(),
              canDelete: canManage || a.uploadedById === user.id,
            }))}
          />
        </div>

        {canManage && (
          <>
            <SectionHeader>Status</SectionHeader>
            <div className="px-4 py-3">
              <HseStatusForm
                apiPath={`/api/hse/emergency/events/${event.id}`}
                currentStatus={event.status}
                options={Object.entries(EMERGENCY_EVENT_STATUS_LABELS).map(([value, label]) => ({ value, label }))}
              />
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
      <span className="w-52 shrink-0 text-text-muted">{label}</span>
      <span className="text-text-primary">{value}</span>
    </div>
  );
}
