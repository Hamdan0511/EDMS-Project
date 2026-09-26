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
import { InspectionStartButton } from "@/components/hse/inspection-start-button";
import { InspectionExecutionForm } from "@/components/hse/inspection-execution-form";
import { HseRelatedActions } from "@/components/hse/hse-related-actions";
import { HseAuditTrail } from "@/components/hse/hse-audit-trail";
import { getHseAuditTrail } from "@/lib/hse/audit-trail";
import { INSPECTION_STATUS_LABELS, INSPECTION_STATUS_BADGE_CLASSES } from "@/lib/hse/status";

export default async function InspectionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user, membership } = await requirePageContext();
  if (!membership) return null;
  const { id } = await params;

  const inspection = await prisma.hseInspection.findFirst({
    where: { id, projectId: membership.projectId },
    include: {
      inspector: true,
      template: { include: { questions: { orderBy: { sortOrder: "asc" } } } },
      responses: true,
    },
  });
  if (!inspection) notFound();

  const [attachments, canManage, canRaiseAction, relatedActions, auditTrail] = await Promise.all([
    prisma.hseAttachment.findMany({
      where: { recordType: "HseInspection", recordId: id },
      include: { uploadedBy: true },
      orderBy: { uploadedAt: "desc" },
    }),
    hasPermission(user.id, "HSE_MANAGE_INSPECTIONS", { projectId: membership.projectId }),
    hasPermission(user.id, "HSE_MANAGE_ACTIONS", { projectId: membership.projectId }),
    prisma.hseCorrectiveAction.findMany({
      where: { projectId: membership.projectId, sourceType: "HseInspection", sourceId: id },
      orderBy: { createdAt: "desc" },
      include: { assignedTo: true },
    }),
    getHseAuditTrail("HseInspection", id, membership.projectId),
  ]);

  const responseByQuestion = new Map(inspection.responses.map((r) => [r.questionId, r]));

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between border-b border-border pb-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">Inspection</p>
          <h1 className="mt-0.5 text-lg font-semibold tracking-tight text-text-primary">{inspection.inspectionNumber}</h1>
        </div>
        <Link href="/hse/inspections" className={buttonClass("secondary", "md")}>
          <ChevronLeft size={14} />
          Back
        </Link>
      </div>

      <div className="mx-auto w-full max-w-3xl rounded-[3px] border border-border bg-white">
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
          <StatusBadge label={INSPECTION_STATUS_LABELS[inspection.status]} className={INSPECTION_STATUS_BADGE_CLASSES[inspection.status]} />
          {inspection.result && (
            <StatusBadge
              label={inspection.result}
              className={inspection.result === "Pass" ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}
            />
          )}
        </div>

        <SectionHeader>Overview</SectionHeader>
        <div className="grid grid-cols-2 gap-x-8 gap-y-2 px-4 py-3 text-[13px]">
          <Row label="Template" value={inspection.template.name} full />
          <Row label="Location" value={inspection.location} />
          <Row label="Inspector" value={inspection.inspector.name} />
          <Row label="Scheduled" value={inspection.scheduledAt ? inspection.scheduledAt.toLocaleDateString("en-GB") : "—"} />
          <Row label="Started" value={inspection.startedAt ? inspection.startedAt.toLocaleString("en-GB") : "—"} />
          <Row label="Completed" value={inspection.completedAt ? inspection.completedAt.toLocaleString("en-GB") : "—"} />
        </div>

        <SectionHeader>Checklist</SectionHeader>
        <div className="px-4 py-3">
          {inspection.status === "SCHEDULED" && canManage && <InspectionStartButton inspectionId={inspection.id} />}
          {inspection.status === "SCHEDULED" && !canManage && (
            <p className="text-[13px] text-text-muted">This inspection has not started yet.</p>
          )}
          {inspection.status === "IN_PROGRESS" && canManage && (
            <InspectionExecutionForm
              inspectionId={inspection.id}
              questions={inspection.template.questions.map((q) => {
                const r = responseByQuestion.get(q.id);
                return {
                  id: q.id,
                  section: q.section,
                  text: q.text,
                  type: q.type,
                  required: q.required,
                  answer: r?.answer ?? "",
                  comment: r?.comment ?? "",
                };
              })}
            />
          )}
          {inspection.status === "COMPLETED" && (
            <div className="flex flex-col gap-3">
              {inspection.template.questions.map((q) => {
                const r = responseByQuestion.get(q.id);
                return (
                  <div key={q.id} className="rounded-[3px] border border-border p-3 text-[13px]">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-text-muted">{q.section ?? "General"}</p>
                    <p className="text-text-primary">{q.text}</p>
                    <p className="mt-1 font-medium text-text-primary">{r?.answer || "—"}</p>
                    {r?.comment && <p className="mt-1 text-text-secondary">{r.comment}</p>}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <SectionHeader>Evidence</SectionHeader>
        <div className="px-4 py-3">
          <HseEvidencePanel
            recordType="HseInspection"
            recordId={inspection.id}
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
          raiseHref={`/hse/corrective-actions/new?sourceType=HseInspection&sourceId=${inspection.id}`}
          canRaise={canRaiseAction && inspection.status === "COMPLETED"}
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
