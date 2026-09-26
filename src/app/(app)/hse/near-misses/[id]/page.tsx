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
import { NEAR_MISS_STATUS_LABELS, NEAR_MISS_STATUS_BADGE_CLASSES, SEVERITY_LABELS, SEVERITY_BADGE_CLASSES } from "@/lib/hse/status";

export default async function NearMissDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user, membership } = await requirePageContext();
  if (!membership) return null;
  const { id } = await params;

  const nearMiss = await prisma.hseNearMiss.findFirst({
    where: { id, projectId: membership.projectId },
    include: { reportedBy: true, assignedTo: true },
  });
  if (!nearMiss) notFound();

  const [attachments, canManage, canRaiseAction, relatedActions, auditTrail] = await Promise.all([
    prisma.hseAttachment.findMany({
      where: { recordType: "HseNearMiss", recordId: id },
      include: { uploadedBy: true },
      orderBy: { uploadedAt: "desc" },
    }),
    hasPermission(user.id, "HSE_MANAGE_NEAR_MISSES", { projectId: membership.projectId }),
    hasPermission(user.id, "HSE_MANAGE_ACTIONS", { projectId: membership.projectId }),
    prisma.hseCorrectiveAction.findMany({
      where: { projectId: membership.projectId, sourceType: "HseNearMiss", sourceId: id },
      orderBy: { createdAt: "desc" },
      include: { assignedTo: true },
    }),
    getHseAuditTrail("HseNearMiss", id, membership.projectId),
  ]);

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between border-b border-border pb-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">Near Miss</p>
          <h1 className="mt-0.5 text-lg font-semibold tracking-tight text-text-primary">{nearMiss.nearMissNumber}</h1>
        </div>
        <Link href="/hse/near-misses" className={buttonClass("secondary", "md")}>
          <ChevronLeft size={14} />
          Back
        </Link>
      </div>

      <div className="mx-auto w-full max-w-3xl rounded-[3px] border border-border bg-white">
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
          <StatusBadge label={NEAR_MISS_STATUS_LABELS[nearMiss.status]} className={NEAR_MISS_STATUS_BADGE_CLASSES[nearMiss.status]} />
          <StatusBadge label={`Potential: ${SEVERITY_LABELS[nearMiss.potentialSeverity]}`} className={SEVERITY_BADGE_CLASSES[nearMiss.potentialSeverity]} />
        </div>

        <SectionHeader>Overview</SectionHeader>
        <div className="grid grid-cols-2 gap-x-8 gap-y-2 px-4 py-3 text-[13px]">
          <Row label="Title" value={nearMiss.title} full />
          <Row label="Location" value={nearMiss.location} />
          <Row label="Building / Floor / Area" value={[nearMiss.building, nearMiss.floor, nearMiss.area].filter(Boolean).join(" / ") || "—"} />
          <Row label="Reported By" value={nearMiss.reportedBy.name} />
          <Row label="Reported At" value={nearMiss.reportedAt.toLocaleString("en-GB")} />
          <Row label="Assigned To" value={nearMiss.assignedTo?.name ?? "—"} />
          <Row label="Due Date" value={nearMiss.dueDate ? nearMiss.dueDate.toLocaleDateString("en-GB") : "—"} />
        </div>

        <SectionHeader>Event Details</SectionHeader>
        <div className="flex flex-col gap-3 px-4 py-3 text-[13px]">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-text-muted">Description</p>
            <p className="whitespace-pre-wrap text-text-primary">{nearMiss.description}</p>
          </div>
          {nearMiss.whatHappened && (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-text-muted">What Happened</p>
              <p className="whitespace-pre-wrap text-text-primary">{nearMiss.whatHappened}</p>
            </div>
          )}
          {nearMiss.potentialConsequence && (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-text-muted">Potential Consequence</p>
              <p className="whitespace-pre-wrap text-text-primary">{nearMiss.potentialConsequence}</p>
            </div>
          )}
          {nearMiss.immediateAction && (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-text-muted">Immediate Action</p>
              <p className="whitespace-pre-wrap text-text-primary">{nearMiss.immediateAction}</p>
            </div>
          )}
        </div>

        <SectionHeader>Evidence</SectionHeader>
        <div className="px-4 py-3">
          <HseEvidencePanel
            recordType="HseNearMiss"
            recordId={nearMiss.id}
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
                apiPath={`/api/hse/near-misses/${nearMiss.id}`}
                currentStatus={nearMiss.status}
                options={Object.entries(NEAR_MISS_STATUS_LABELS).map(([value, label]) => ({ value, label }))}
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
          raiseHref={`/hse/corrective-actions/new?sourceType=HseNearMiss&sourceId=${nearMiss.id}`}
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
