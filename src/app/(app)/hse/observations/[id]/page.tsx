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
import { HseRelatedActions } from "@/components/hse/hse-related-actions";
import { HseAuditTrail } from "@/components/hse/hse-audit-trail";
import { getHseAuditTrail } from "@/lib/hse/audit-trail";
import { OBSERVATION_TYPE_LABELS, OBSERVATION_STATUS_LABELS, OBSERVATION_STATUS_BADGE_CLASSES, SEVERITY_LABELS, SEVERITY_BADGE_CLASSES } from "@/lib/hse/status";

export default async function ObservationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user, membership } = await requirePageContext();
  if (!membership) return null;
  const { id } = await params;

  const observation = await prisma.hseObservation.findFirst({
    where: { id, projectId: membership.projectId },
    include: { reportedBy: true },
  });
  if (!observation) notFound();

  const [attachments, canManage, canRaiseAction, relatedActions, auditTrail] = await Promise.all([
    prisma.hseAttachment.findMany({
      where: { recordType: "HseObservation", recordId: id },
      include: { uploadedBy: true },
      orderBy: { uploadedAt: "desc" },
    }),
    hasPermission(user.id, "HSE_MANAGE_OBSERVATIONS", { projectId: membership.projectId }),
    hasPermission(user.id, "HSE_MANAGE_ACTIONS", { projectId: membership.projectId }),
    prisma.hseCorrectiveAction.findMany({
      where: { projectId: membership.projectId, sourceType: "HseObservation", sourceId: id },
      orderBy: { createdAt: "desc" },
      include: { assignedTo: true },
    }),
    getHseAuditTrail("HseObservation", id, membership.projectId),
  ]);

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between border-b border-border pb-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">Observation</p>
          <h1 className="mt-0.5 text-lg font-semibold tracking-tight text-text-primary">{observation.observationNumber}</h1>
        </div>
        <Link href="/hse/observations" className={buttonClass("secondary", "md")}>
          <ChevronLeft size={14} />
          Back
        </Link>
      </div>

      <div className="mx-auto w-full max-w-3xl rounded-[3px] border border-border bg-white">
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
          <StatusBadge label={OBSERVATION_STATUS_LABELS[observation.status]} className={OBSERVATION_STATUS_BADGE_CLASSES[observation.status]} />
          <StatusBadge label={`${SEVERITY_LABELS[observation.severity]} Severity`} className={SEVERITY_BADGE_CLASSES[observation.severity]} />
          <span className="text-[13px] text-text-secondary">{OBSERVATION_TYPE_LABELS[observation.type]}</span>
        </div>

        <SectionHeader>Overview</SectionHeader>
        <div className="grid grid-cols-2 gap-x-8 gap-y-2 px-4 py-3 text-[13px]">
          <Row label="Title" value={observation.title} full />
          <Row label="Location" value={observation.location} />
          <Row label="Building / Floor / Area" value={[observation.building, observation.floor, observation.area].filter(Boolean).join(" / ") || "—"} />
          <Row label="Reported By" value={observation.reportedBy.name} />
          <Row label="Reported At" value={observation.reportedAt.toLocaleString("en-GB")} />
        </div>

        <SectionHeader>Description</SectionHeader>
        <div className="whitespace-pre-wrap px-4 py-3 text-[13px] text-text-primary">{observation.description}</div>

        <SectionHeader>Evidence</SectionHeader>
        <div className="px-4 py-3">
          <HseEvidencePanel
            recordType="HseObservation"
            recordId={observation.id}
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
                apiPath={`/api/hse/observations/${observation.id}`}
                currentStatus={observation.status}
                options={Object.entries(OBSERVATION_STATUS_LABELS).map(([value, label]) => ({ value, label }))}
              />
            </div>
          </>
        )}

        <SectionHeader>Corrective Actions</SectionHeader>
        <HseRelatedActions
          items={relatedActions.map((a) => ({
            id: a.id,
            actionNumber: a.actionNumber,
            description: a.description,
            status: a.status,
            priority: a.priority,
            assignedToName: a.assignedTo?.name ?? null,
            dueDate: a.dueDate ? a.dueDate.toISOString() : null,
          }))}
          raiseHref={`/hse/corrective-actions/new?sourceType=HseObservation&sourceId=${observation.id}`}
          canRaise={canRaiseAction}
        />

        <SectionHeader>Timeline &amp; Audit</SectionHeader>
        <HseAuditTrail events={auditTrail} />
      </div>
    </div>
  );
}

function Row({ label, value, full }: { label: string; value: string; full?: boolean }) {
  return (
    <div className={`flex gap-2 ${full ? "col-span-2" : ""}`}>
      <span className="w-40 shrink-0 text-text-muted">{label}</span>
      <span className="text-text-primary">{value}</span>
    </div>
  );
}
