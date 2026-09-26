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
import { EMERGENCY_PROCEDURE_STATUS_LABELS, EMERGENCY_PROCEDURE_STATUS_BADGE_CLASSES } from "@/lib/hse/status";

export default async function EmergencyProcedureDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user, membership } = await requirePageContext();
  if (!membership) return null;
  const { id } = await params;

  const procedure = await prisma.hseEmergencyProcedure.findFirst({
    where: { id, projectId: membership.projectId },
    include: { reviewedBy: true, createdBy: true },
  });
  if (!procedure) notFound();

  const [attachments, canManage, auditTrail] = await Promise.all([
    prisma.hseAttachment.findMany({
      where: { recordType: "HseEmergencyProcedure", recordId: id },
      include: { uploadedBy: true },
      orderBy: { uploadedAt: "desc" },
    }),
    hasPermission(user.id, "HSE_MANAGE_EMERGENCY", { projectId: membership.projectId }),
    getHseAuditTrail("HseEmergencyProcedure", id, membership.projectId),
  ]);

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between border-b border-border pb-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">Emergency Procedure</p>
          <h1 className="mt-0.5 text-lg font-semibold tracking-tight text-text-primary">{procedure.title}</h1>
        </div>
        <Link href="/hse/emergency/procedures" className={buttonClass("secondary", "md")}>
          <ChevronLeft size={14} />
          Back
        </Link>
      </div>

      <div className="mx-auto w-full max-w-3xl rounded-[3px] border border-border bg-white">
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
          <StatusBadge label={EMERGENCY_PROCEDURE_STATUS_LABELS[procedure.status]} className={EMERGENCY_PROCEDURE_STATUS_BADGE_CLASSES[procedure.status]} />
          <span className="text-[13px] text-text-secondary">{procedure.emergencyType}</span>
        </div>

        <SectionHeader>Overview</SectionHeader>
        <div className="grid grid-cols-2 gap-x-8 gap-y-2 px-4 py-3 text-[13px]">
          <Row label="Assembly Point" value={procedure.assemblyPoint ?? "—"} />
          <Row label="Required Equipment" value={procedure.requiredEquipment ?? "—"} />
          <Row label="Last Reviewed" value={procedure.lastReviewedAt ? procedure.lastReviewedAt.toLocaleDateString("en-GB") : "Not yet reviewed"} />
          <Row label="Reviewed By" value={procedure.reviewedBy?.name ?? "—"} />
          <Row label="Created By" value={procedure.createdBy.name} />
        </div>

        <SectionHeader>Immediate Actions</SectionHeader>
        <div className="whitespace-pre-wrap px-4 py-3 text-[13px] text-text-primary">{procedure.immediateActions}</div>

        {procedure.evacuationInstructions && (
          <>
            <SectionHeader>Evacuation Instructions</SectionHeader>
            <div className="whitespace-pre-wrap px-4 py-3 text-[13px] text-text-primary">{procedure.evacuationInstructions}</div>
          </>
        )}

        {procedure.steps && (
          <>
            <SectionHeader>Procedure Steps</SectionHeader>
            <div className="whitespace-pre-wrap px-4 py-3 text-[13px] text-text-primary">{procedure.steps}</div>
          </>
        )}

        <SectionHeader>Documents / Evidence</SectionHeader>
        <div className="px-4 py-3">
          <HseEvidencePanel
            recordType="HseEmergencyProcedure"
            recordId={procedure.id}
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
                apiPath={`/api/hse/emergency/procedures/${procedure.id}`}
                currentStatus={procedure.status}
                options={Object.entries(EMERGENCY_PROCEDURE_STATUS_LABELS).map(([value, label]) => ({ value, label }))}
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
      <span className="w-40 shrink-0 text-text-muted">{label}</span>
      <span className="text-text-primary">{value}</span>
    </div>
  );
}
