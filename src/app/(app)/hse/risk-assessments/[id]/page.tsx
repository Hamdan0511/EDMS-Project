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
import { HseAuditTrail } from "@/components/hse/hse-audit-trail";
import { getHseAuditTrail } from "@/lib/hse/audit-trail";
import { RISK_ASSESSMENT_STATUS_LABELS, RISK_ASSESSMENT_STATUS_BADGE_CLASSES } from "@/lib/hse/status";
import { RISK_LEVEL_LABELS, RISK_LEVEL_BADGE_CLASSES } from "@/lib/hse/risk-matrix";

export default async function RiskAssessmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user, membership } = await requirePageContext();
  if (!membership) return null;
  const { id } = await params;

  const assessment = await prisma.hseRiskAssessment.findFirst({
    where: { id, projectId: membership.projectId },
    include: {
      responsible: true,
      createdBy: true,
      controls: { include: { owner: true }, orderBy: { id: "asc" } },
    },
  });
  if (!assessment) notFound();

  const [attachments, canManage, auditTrail] = await Promise.all([
    prisma.hseAttachment.findMany({
      where: { recordType: "HseRiskAssessment", recordId: id },
      include: { uploadedBy: true },
      orderBy: { uploadedAt: "desc" },
    }),
    hasPermission(user.id, "HSE_MANAGE_RISK_ASSESSMENTS", { projectId: membership.projectId }),
    getHseAuditTrail("HseRiskAssessment", id, membership.projectId),
  ]);

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between border-b border-border pb-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">Risk Assessment</p>
          <h1 className="mt-0.5 text-lg font-semibold tracking-tight text-text-primary">{assessment.assessmentNumber}</h1>
        </div>
        <Link href="/hse/risk-assessments" className={buttonClass("secondary", "md")}>
          <ChevronLeft size={14} />
          Back
        </Link>
      </div>

      <div className="mx-auto w-full max-w-3xl rounded-[3px] border border-border bg-white">
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
          <StatusBadge label={RISK_ASSESSMENT_STATUS_LABELS[assessment.status]} className={RISK_ASSESSMENT_STATUS_BADGE_CLASSES[assessment.status]} />
        </div>

        <SectionHeader>Overview</SectionHeader>
        <div className="grid grid-cols-2 gap-x-8 gap-y-2 px-4 py-3 text-[13px]">
          <Row label="Activity" value={assessment.activity} full />
          <Row label="Task" value={assessment.task ?? "—"} />
          <Row label="Responsible" value={assessment.responsible?.name ?? "—"} />
          <Row label="Review Date" value={assessment.reviewDate ? assessment.reviewDate.toLocaleDateString("en-GB") : "—"} />
          <Row label="Created By" value={assessment.createdBy.name} />
          <Row label="Created At" value={assessment.createdAt.toLocaleString("en-GB")} />
        </div>

        <SectionHeader>Hazard</SectionHeader>
        <div className="flex flex-col gap-3 px-4 py-3 text-[13px]">
          <p className="whitespace-pre-wrap text-text-primary">{assessment.hazard}</p>
          {assessment.potentialConsequence && (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-text-muted">Potential Consequence</p>
              <p className="whitespace-pre-wrap text-text-primary">{assessment.potentialConsequence}</p>
            </div>
          )}
        </div>

        <SectionHeader>Initial Risk</SectionHeader>
        <div className="px-4 py-3 text-[13px]">
          <StatusBadge label={RISK_LEVEL_LABELS[assessment.initialRisk]} className={RISK_LEVEL_BADGE_CLASSES[assessment.initialRisk]} />
        </div>

        <SectionHeader>Control Measures</SectionHeader>
        <div className="px-4 py-3">
          <HseControlsPanel
            addControlPath={`/api/hse/risk-assessments/${assessment.id}/controls`}
            canManage={canManage}
            controls={assessment.controls.map((c) => ({
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
          {assessment.residualRisk ? (
            <StatusBadge label={RISK_LEVEL_LABELS[assessment.residualRisk]} className={`w-fit ${RISK_LEVEL_BADGE_CLASSES[assessment.residualRisk]}`} />
          ) : (
            <p className="text-text-muted">Not yet assessed.</p>
          )}
          {canManage && <HseResidualRiskForm apiPath={`/api/hse/risk-assessments/${assessment.id}`} />}
        </div>

        <SectionHeader>Evidence</SectionHeader>
        <div className="px-4 py-3">
          <HseEvidencePanel
            recordType="HseRiskAssessment"
            recordId={assessment.id}
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
                apiPath={`/api/hse/risk-assessments/${assessment.id}`}
                currentStatus={assessment.status}
                options={Object.entries(RISK_ASSESSMENT_STATUS_LABELS).map(([value, label]) => ({ value, label }))}
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

function Row({ label, value, full }: { label: string; value: string; full?: boolean }) {
  return (
    <div className={`flex gap-2 ${full ? "col-span-2" : ""}`}>
      <span className="w-40 shrink-0 text-text-muted">{label}</span>
      <span className="text-text-primary">{value}</span>
    </div>
  );
}
