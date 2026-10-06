import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePageContext } from "@/lib/page-context";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/auth/permissions";
import { SectionHeader } from "@/components/ui/section-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { buttonClass } from "@/components/ui/button";
import { ChevronLeft, Check, X } from "@/components/ui/icons";
import { FieldEvidencePanel } from "@/components/field/field-evidence-panel";
import { FieldInspectionExecutionForm } from "@/components/field/field-inspection-execution-form";
import { FieldAuditTrail } from "@/components/field/field-audit-trail";
import { CreateIssueFromResponseButton } from "@/components/field/create-issue-from-response-button";
import { getFieldAuditTrail } from "@/lib/field/audit-trail";
import { listFieldAttachments } from "@/lib/field/attachments";
import { INSPECTION_STATUS_LABELS, INSPECTION_STATUS_BADGE_CLASSES, CHECKLIST_RESULT_LABELS, CHECKLIST_RESULT_BADGE_CLASSES } from "@/lib/field/status";

const EDITABLE_STATUSES = new Set(["DRAFT", "ASSIGNED", "IN_PROGRESS"]);

export default async function InspectionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user, membership } = await requirePageContext();
  if (!membership) return null;
  const { id } = await params;

  const inspection = await prisma.fieldInspection.findFirst({
    where: { id, projectId: membership.projectId },
    include: {
      template: true,
      area: true,
      assignee: true,
      inspector: true,
      createdBy: true,
      responses: { include: { templateItem: { include: { group: true } } }, orderBy: { sortOrder: "asc" } },
    },
  });
  if (!inspection) notFound();

  const [attachments, canManage, canManageIssues, auditTrail, linkedIssues] = await Promise.all([
    listFieldAttachments("FieldInspection", id),
    hasPermission(user.id, "FIELD_MANAGE_INSPECTIONS", { projectId: membership.projectId }),
    hasPermission(user.id, "FIELD_MANAGE_ISSUES", { projectId: membership.projectId }),
    getFieldAuditTrail("FieldInspection", id, membership.projectId),
    prisma.fieldIssue.findMany({
      where: { projectId: membership.projectId, sourceType: "FieldInspectionResponse", sourceId: { in: inspection.responses.map((r) => r.id) } },
      select: { id: true, issueNumber: true, sourceId: true },
    }),
  ]);

  const issueByResponseId = new Map(linkedIssues.map((i) => [i.sourceId, i]));
  const editable = canManage && EDITABLE_STATUSES.has(inspection.status);

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between border-b border-border pb-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">Quality Inspection</p>
          <h1 className="mt-0.5 text-lg font-semibold tracking-tight text-text-primary">{inspection.inspectionNumber}</h1>
        </div>
        <Link href="/field/inspections" className={buttonClass("secondary", "md")}>
          <ChevronLeft size={14} />
          Back
        </Link>
      </div>

      <div className="mx-auto w-full max-w-3xl rounded-[3px] border border-border bg-white">
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
          <StatusBadge label={INSPECTION_STATUS_LABELS[inspection.status]} className={INSPECTION_STATUS_BADGE_CLASSES[inspection.status]} />
          <span className="text-[13px] text-text-secondary">{inspection.template.name}</span>
        </div>

        <SectionHeader>Overview</SectionHeader>
        <div className="grid grid-cols-2 gap-x-8 gap-y-2 px-4 py-3 text-[13px]">
          <Row label="Location" value={inspection.area?.name ?? "—"} />
          <Row label="Assignee" value={inspection.assignee?.name ?? "—"} />
          <Row label="Inspector" value={inspection.inspector?.name ?? "—"} />
          <Row label="Due Date" value={inspection.dueDate ? inspection.dueDate.toLocaleDateString("en-GB") : "—"} />
          <Row label="Created By" value={inspection.createdBy.name} />
          <Row label="Submitted" value={inspection.submittedAt ? inspection.submittedAt.toLocaleString("en-GB") : "Not yet submitted"} />
        </div>

        <SectionHeader>Checklist</SectionHeader>
        {editable ? (
          <FieldInspectionExecutionForm
            inspectionId={inspection.id}
            items={inspection.responses.map((r) => ({
              responseId: r.id,
              label: r.label,
              responseType: r.templateItem.responseType,
              isMandatory: r.templateItem.isMandatory,
              result: r.result,
              textValue: r.textValue,
              note: r.note,
            }))}
          />
        ) : (
          <div className="flex flex-col">
            {Object.entries(
              inspection.responses.reduce<Record<string, typeof inspection.responses>>((acc, r) => {
                const key = r.templateItem.group.name;
                (acc[key] ??= []).push(r);
                return acc;
              }, {}),
            ).map(([groupName, groupResponses]) => (
              <div key={groupName}>
                <p className="border-t border-border bg-background px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-text-secondary first:border-t-0">
                  {groupName}
                </p>
                <ul className="flex flex-col divide-y divide-border">
                  {groupResponses.map((r) => {
                    const passed = r.result === "PASS" || r.result === "YES";
                    const failed = r.result === "FAIL" || r.result === "NO";
                    const linkedIssue = issueByResponseId.get(r.id);
                    return (
                      <li key={r.id} className={`px-4 py-2.5 text-[13px] ${failed ? "bg-red-50" : ""}`}>
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            {passed && <Check size={14} className="shrink-0 text-emerald-700" />}
                            {failed && <X size={14} className="shrink-0 text-red-700" />}
                            <span className="text-text-primary">{r.label}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {r.result ? (
                              <StatusBadge label={CHECKLIST_RESULT_LABELS[r.result]} className={CHECKLIST_RESULT_BADGE_CLASSES[r.result]} />
                            ) : r.textValue ? (
                              <span className="text-text-secondary">{r.textValue}</span>
                            ) : (
                              <span className="text-text-muted">—</span>
                            )}
                          </div>
                        </div>
                        {failed && (
                          <div className="mt-1.5 flex items-center justify-between gap-3 pl-6">
                            <div className="flex flex-col">
                              {r.note && <span className="text-[12px] text-red-800"><strong>Reason:</strong> {r.note}</span>}
                              {linkedIssue && (
                                <a href={`/field/issues/${linkedIssue.id}`} className="text-[11px] text-brand-700 hover:underline">
                                  Issue raised: {linkedIssue.issueNumber}
                                </a>
                              )}
                            </div>
                            {canManageIssues && !linkedIssue && <CreateIssueFromResponseButton responseId={r.id} />}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}

        <SectionHeader>Evidence</SectionHeader>
        <div className="px-4 py-3">
          <FieldEvidencePanel
            recordType="FieldInspection"
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

        <SectionHeader>Audit Trail</SectionHeader>
        <FieldAuditTrail events={auditTrail} />
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="w-32 shrink-0 text-text-muted">{label}</span>
      <span className="text-text-primary">{value}</span>
    </div>
  );
}
