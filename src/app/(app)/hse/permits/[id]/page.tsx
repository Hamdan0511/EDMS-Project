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
import { PERMIT_FORWARD_TRANSITIONS } from "@/lib/services/hse/permit-service";
import { PERMIT_TYPE_LABELS, PERMIT_STATUS_LABELS, PERMIT_STATUS_BADGE_CLASSES } from "@/lib/hse/status";

export default async function PermitDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user, membership } = await requirePageContext();
  if (!membership) return null;
  const { id } = await params;

  const permit = await prisma.hsePermit.findFirst({
    where: { id, projectId: membership.projectId },
    include: {
      requestedBy: true,
      approvals: { include: { approver: true }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!permit) notFound();

  const [attachments, canManage, auditTrail] = await Promise.all([
    prisma.hseAttachment.findMany({
      where: { recordType: "HsePermit", recordId: id },
      include: { uploadedBy: true },
      orderBy: { uploadedAt: "desc" },
    }),
    hasPermission(user.id, "HSE_MANAGE_PERMITS", { projectId: membership.projectId }),
    getHseAuditTrail("HsePermit", id, membership.projectId),
  ]);

  const nextStatuses = PERMIT_FORWARD_TRANSITIONS[permit.status] ?? [];

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between border-b border-border pb-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">Permit to Work</p>
          <h1 className="mt-0.5 text-lg font-semibold tracking-tight text-text-primary">{permit.permitNumber}</h1>
        </div>
        <Link href="/hse/permits" className={buttonClass("secondary", "md")}>
          <ChevronLeft size={14} />
          Back
        </Link>
      </div>

      <div className="mx-auto w-full max-w-3xl rounded-[3px] border border-border bg-white">
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
          <StatusBadge label={PERMIT_STATUS_LABELS[permit.status]} className={PERMIT_STATUS_BADGE_CLASSES[permit.status]} />
          <StatusBadge label={PERMIT_TYPE_LABELS[permit.type]} className="bg-stone-100 text-stone-700" />
        </div>

        <SectionHeader>Overview</SectionHeader>
        <div className="grid grid-cols-2 gap-x-8 gap-y-2 px-4 py-3 text-[13px]">
          <Row label="Location" value={permit.location} full />
          <Row label="Contractor / Org" value={permit.contractorOrg ?? "—"} />
          <Row label="Requested By" value={permit.requestedBy.name} />
          <Row label="Start Date" value={permit.startDate.toLocaleDateString("en-GB")} />
          <Row label="End Date" value={permit.endDate.toLocaleDateString("en-GB")} />
        </div>

        <SectionHeader>Work Details</SectionHeader>
        <div className="flex flex-col gap-3 px-4 py-3 text-[13px]">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-text-muted">Work Description</p>
            <p className="whitespace-pre-wrap text-text-primary">{permit.workDescription}</p>
          </div>
          {permit.hazards && (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-text-muted">Hazards</p>
              <p className="whitespace-pre-wrap text-text-primary">{permit.hazards}</p>
            </div>
          )}
          {permit.controls && (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-text-muted">Controls</p>
              <p className="whitespace-pre-wrap text-text-primary">{permit.controls}</p>
            </div>
          )}
          {permit.requiredPpe && (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-text-muted">Required PPE</p>
              <p className="whitespace-pre-wrap text-text-primary">{permit.requiredPpe}</p>
            </div>
          )}
          {permit.precautions && (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-text-muted">Precautions</p>
              <p className="whitespace-pre-wrap text-text-primary">{permit.precautions}</p>
            </div>
          )}
        </div>

        <SectionHeader>Approval History</SectionHeader>
        <div className="px-4 py-3">
          {permit.approvals.length === 0 ? (
            <p className="text-[13px] text-text-muted">No approval actions recorded yet.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {permit.approvals.map((a) => (
                <li key={a.id} className="rounded-[3px] border border-border p-2.5 text-[13px]">
                  <p className="font-medium text-text-primary">
                    {a.approver.name} → {a.decision}
                  </p>
                  <p className="text-[12px] text-text-muted">{a.decidedAt?.toLocaleString("en-GB")}</p>
                  {a.comment && <p className="mt-1 text-text-secondary">{a.comment}</p>}
                </li>
              ))}
            </ul>
          )}
        </div>

        <SectionHeader>Evidence</SectionHeader>
        <div className="px-4 py-3">
          <HseEvidencePanel
            recordType="HsePermit"
            recordId={permit.id}
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

        {canManage && nextStatuses.length > 0 && (
          <>
            <SectionHeader>Status</SectionHeader>
            <div className="px-4 py-3">
              <HseStatusForm
                apiPath={`/api/hse/permits/${permit.id}`}
                currentStatus={permit.status}
                options={[permit.status, ...nextStatuses].map((value) => ({ value, label: PERMIT_STATUS_LABELS[value] }))}
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
