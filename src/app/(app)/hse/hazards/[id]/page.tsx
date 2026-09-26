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
import { HseControlsPanel } from "@/components/hse/hse-controls-panel";
import { HseResidualRiskForm } from "@/components/hse/hse-residual-risk-form";
import { HseRelatedActions } from "@/components/hse/hse-related-actions";
import { HseAuditTrail } from "@/components/hse/hse-audit-trail";
import { getHseAuditTrail } from "@/lib/hse/audit-trail";
import { HAZARD_STATUS_LABELS, HAZARD_STATUS_BADGE_CLASSES } from "@/lib/hse/status";
import { RISK_LEVEL_LABELS, RISK_LEVEL_BADGE_CLASSES } from "@/lib/hse/risk-matrix";

export default async function HazardDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user, membership } = await requirePageContext();
  if (!membership) return null;
  const { id } = await params;

  const hazard = await prisma.hseHazard.findFirst({
    where: { id, projectId: membership.projectId },
    include: {
      responsible: true,
      createdBy: true,
      controls: { include: { owner: true }, orderBy: { id: "asc" } },
    },
  });
  if (!hazard) notFound();

  const [attachments, canManage, canRaiseAction, relatedActions, auditTrail] = await Promise.all([
    prisma.hseAttachment.findMany({
      where: { recordType: "HseHazard", recordId: id },
      include: { uploadedBy: true },
      orderBy: { uploadedAt: "desc" },
    }),
    hasPermission(user.id, "HSE_MANAGE_HAZARDS", { projectId: membership.projectId }),
    hasPermission(user.id, "HSE_MANAGE_ACTIONS", { projectId: membership.projectId }),
    prisma.hseCorrectiveAction.findMany({
      where: { projectId: membership.projectId, sourceType: "HseHazard", sourceId: id },
      orderBy: { createdAt: "desc" },
      include: { assignedTo: true },
    }),
    getHseAuditTrail("HseHazard", id, membership.projectId),
  ]);

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between border-b border-border pb-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">Hazard</p>
          <h1 className="mt-0.5 text-lg font-semibold tracking-tight text-text-primary">{hazard.hazardNumber}</h1>
        </div>
        <Link href="/hse/hazards" className={buttonClass("secondary", "md")}>
          <ChevronLeft size={14} />
          Back
        </Link>
      </div>

      <div className="mx-auto w-full max-w-3xl rounded-[3px] border border-border bg-white">
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
          <StatusBadge label={HAZARD_STATUS_LABELS[hazard.status]} className={HAZARD_STATUS_BADGE_CLASSES[hazard.status]} />
        </div>

        <SectionHeader>Overview</SectionHeader>
        <div className="grid grid-cols-2 gap-x-8 gap-y-2 px-4 py-3 text-[13px]">
          <Row label="Hazard" value={hazard.hazard} full />
          <Row label="Location" value={hazard.location} />
          <Row label="Activity" value={hazard.activity ?? "—"} />
          <Row label="Responsible" value={hazard.responsible?.name ?? "—"} />
          <Row label="Review Date" value={hazard.reviewDate ? hazard.reviewDate.toLocaleDateString("en-GB") : "—"} />
          <Row label="Reported By" value={hazard.createdBy.name} />
          <Row label="Reported At" value={hazard.createdAt.toLocaleString("en-GB")} />
        </div>

        <SectionHeader>Initial Risk</SectionHeader>
        <div className="px-4 py-3 text-[13px]">
          <StatusBadge label={RISK_LEVEL_LABELS[hazard.initialRisk]} className={RISK_LEVEL_BADGE_CLASSES[hazard.initialRisk]} />
        </div>

        <SectionHeader>Control Measures</SectionHeader>
        <div className="px-4 py-3">
          <HseControlsPanel
            addControlPath={`/api/hse/hazards/${hazard.id}/controls`}
            canManage={canManage}
            controls={hazard.controls.map((c) => ({
              id: c.id,
              hierarchy: c.hierarchy,
              description: c.description,
              ownerName: c.owner?.name ?? null,
              dueDate: c.dueDate ? c.dueDate.toISOString() : null,
              status: c.status,
            }))}
          />
        </div>

        <SectionHeader>Residual Risk</SectionHeader>
        <div className="flex flex-col gap-3 px-4 py-3 text-[13px]">
          {hazard.residualRisk ? (
            <StatusBadge label={RISK_LEVEL_LABELS[hazard.residualRisk]} className={`w-fit ${RISK_LEVEL_BADGE_CLASSES[hazard.residualRisk]}`} />
          ) : (
            <p className="text-text-muted">Not yet assessed.</p>
          )}
          {canManage && <HseResidualRiskForm apiPath={`/api/hse/hazards/${hazard.id}`} />}
        </div>

        <SectionHeader>Evidence</SectionHeader>
        <div className="px-4 py-3">
          <HseEvidencePanel
            recordType="HseHazard"
            recordId={hazard.id}
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
                apiPath={`/api/hse/hazards/${hazard.id}`}
                currentStatus={hazard.status}
                options={Object.entries(HAZARD_STATUS_LABELS).map(([value, label]) => ({ value, label }))}
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
          raiseHref={`/hse/corrective-actions/new?sourceType=HseHazard&sourceId=${hazard.id}`}
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
