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
import { ACTION_STATUS_LABELS, ACTION_STATUS_BADGE_CLASSES, ACTION_PRIORITY_LABELS, ACTION_PRIORITY_BADGE_CLASSES } from "@/lib/hse/status";

const SOURCE_DETAIL_PATH: Record<string, (id: string) => string> = {
  HseObservation: (id) => `/hse/observations/${id}`,
  HseIncident: (id) => `/hse/incidents/${id}`,
  HseNearMiss: (id) => `/hse/near-misses/${id}`,
  HseHazard: (id) => `/hse/hazards/${id}`,
  HseInspection: (id) => `/hse/inspections/${id}`,
};

export default async function CorrectiveActionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user, membership } = await requirePageContext();
  if (!membership) return null;
  const { id } = await params;

  const action = await prisma.hseCorrectiveAction.findFirst({
    where: { id, projectId: membership.projectId },
    include: { assignedTo: true, verifiedBy: true, createdBy: true },
  });
  if (!action) notFound();

  const [attachments, canManage, auditTrail] = await Promise.all([
    prisma.hseAttachment.findMany({
      where: { recordType: "HseCorrectiveAction", recordId: id },
      include: { uploadedBy: true },
      orderBy: { uploadedAt: "desc" },
    }),
    hasPermission(user.id, "HSE_MANAGE_ACTIONS", { projectId: membership.projectId }),
    getHseAuditTrail("HseCorrectiveAction", id, membership.projectId),
  ]);

  const sourceHref = action.sourceId && SOURCE_DETAIL_PATH[action.sourceType]
    ? SOURCE_DETAIL_PATH[action.sourceType](action.sourceId)
    : null;

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between border-b border-border pb-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">Corrective Action</p>
          <h1 className="mt-0.5 text-lg font-semibold tracking-tight text-text-primary">{action.actionNumber}</h1>
        </div>
        <Link href="/hse/corrective-actions" className={buttonClass("secondary", "md")}>
          <ChevronLeft size={14} />
          Back
        </Link>
      </div>

      <div className="mx-auto w-full max-w-3xl rounded-[3px] border border-border bg-white">
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
          <StatusBadge label={ACTION_STATUS_LABELS[action.status]} className={ACTION_STATUS_BADGE_CLASSES[action.status]} />
          <StatusBadge label={ACTION_PRIORITY_LABELS[action.priority]} className={ACTION_PRIORITY_BADGE_CLASSES[action.priority]} />
        </div>

        <SectionHeader>Overview</SectionHeader>
        <div className="grid grid-cols-2 gap-x-8 gap-y-2 px-4 py-3 text-[13px]">
          <Row label="Description" value={action.description} full />
          <Row
            label="Source"
            value={action.sourceType === "manual" ? "Manual" : action.sourceType.replace("Hse", "")}
          />
          {sourceHref && (
            <div className="flex gap-2">
              <span className="w-40 shrink-0 text-text-muted">Linked Record</span>
              <Link href={sourceHref} className="text-brand-700 hover:underline">View source record</Link>
            </div>
          )}
          <Row label="Assigned To" value={action.assignedTo?.name ?? "—"} />
          <Row label="Due Date" value={action.dueDate ? action.dueDate.toLocaleDateString("en-GB") : "—"} />
          <Row label="Created By" value={action.createdBy.name} />
          <Row label="Created At" value={action.createdAt.toLocaleString("en-GB")} />
          {action.completedAt && <Row label="Completed At" value={action.completedAt.toLocaleString("en-GB")} />}
          {action.verifiedBy && <Row label="Verified By" value={`${action.verifiedBy.name} (${action.verifiedAt?.toLocaleString("en-GB")})`} full />}
        </div>

        <SectionHeader>Evidence</SectionHeader>
        <div className="px-4 py-3">
          <HseEvidencePanel
            recordType="HseCorrectiveAction"
            recordId={action.id}
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
                apiPath={`/api/hse/corrective-actions/${action.id}`}
                currentStatus={action.status}
                options={Object.entries(ACTION_STATUS_LABELS).map(([value, label]) => ({ value, label }))}
              />
              {action.status === "PENDING_VERIFICATION" && action.assignedToId === user.id && (
                <p className="mt-2 text-[12px] text-text-muted">
                  You are the assignee for this action — verification must be performed by another team member.
                </p>
              )}
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
