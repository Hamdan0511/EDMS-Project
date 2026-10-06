import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePageContext } from "@/lib/page-context";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/auth/permissions";
import { SectionHeader } from "@/components/ui/section-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { buttonClass } from "@/components/ui/button";
import { ChevronLeft } from "@/components/ui/icons";
import { HseStatusForm } from "@/components/hse/hse-status-form";
import { FieldEvidencePanel } from "@/components/field/field-evidence-panel";
import { FieldComments } from "@/components/field/field-comments";
import { FieldAuditTrail } from "@/components/field/field-audit-trail";
import { FieldRelatedRecords, type RelatedRecordGroup } from "@/components/field/field-related-records";
import { RaiseCorrectiveActionButton } from "@/components/field/raise-corrective-action-button";
import { FieldDocumentReferences } from "@/components/field/field-document-references";
import { getFieldAuditTrail } from "@/lib/field/audit-trail";
import { listFieldAttachments } from "@/lib/field/attachments";
import { listFieldComments } from "@/lib/field/comments";
import { listFieldDocumentReferences } from "@/lib/field/document-references";
import { ISSUE_STATUS_LABELS, ISSUE_STATUS_BADGE_CLASSES, PRIORITY_LABELS, PRIORITY_BADGE_CLASSES } from "@/lib/field/status";
import { ACTION_STATUS_LABELS as HSE_ACTION_STATUS_LABELS } from "@/lib/hse/status";

export default async function IssueDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user, membership } = await requirePageContext();
  if (!membership) return null;
  const { id } = await params;
  const projectId = membership.projectId;

  const issue = await prisma.fieldIssue.findFirst({
    where: { id, projectId },
    include: { area: true, type: true, responsibleUser: true, responsibleOrg: true, createdBy: true, verifiedBy: true },
  });
  if (!issue) notFound();

  const [attachments, comments, canManage, canVerify, auditTrail, correctiveAction, projectMembers, sourceObservation, documentReferences] = await Promise.all([
    listFieldAttachments("FieldIssue", id),
    listFieldComments("FieldIssue", id),
    hasPermission(user.id, "FIELD_MANAGE_ISSUES", { projectId }),
    hasPermission(user.id, "FIELD_ISSUE_VERIFY", { projectId }),
    getFieldAuditTrail("FieldIssue", id, projectId),
    prisma.hseCorrectiveAction.findFirst({ where: { projectId, sourceType: "FieldIssue", sourceId: id } }),
    prisma.projectMember.findMany({ where: { projectId }, include: { user: true }, orderBy: { user: { name: "asc" } } }),
    issue.sourceType === "FieldObservation" && issue.sourceId
      ? prisma.fieldObservation.findUnique({ where: { id: issue.sourceId }, select: { id: true, observationNumber: true } })
      : Promise.resolve(null),
    listFieldDocumentReferences("FieldIssue", id),
  ]);

  const relatedGroups: RelatedRecordGroup[] = [
    {
      label: "Field",
      items: sourceObservation ? [{ id: sourceObservation.id, label: `Observation ${sourceObservation.observationNumber}`, href: `/field/observations/${sourceObservation.id}` }] : [],
    },
    {
      label: "Corrective Actions",
      items: correctiveAction
        ? [{ id: correctiveAction.id, label: correctiveAction.actionNumber, href: `/hse/corrective-actions/${correctiveAction.id}`, badge: HSE_ACTION_STATUS_LABELS[correctiveAction.status] }]
        : [],
    },
  ];

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between border-b border-border pb-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">Site Issue</p>
          <h1 className="mt-0.5 text-lg font-semibold tracking-tight text-text-primary">{issue.issueNumber}</h1>
        </div>
        <div className="flex items-center gap-2">
          {canManage && !correctiveAction && <RaiseCorrectiveActionButton issueId={issue.id} members={projectMembers.map((m) => ({ id: m.user.id, name: m.user.name }))} />}
          <Link href="/field/issues" className={buttonClass("secondary", "md")}>
            <ChevronLeft size={14} />
            Back
          </Link>
        </div>
      </div>

      <div className="mx-auto w-full max-w-3xl rounded-[3px] border border-border bg-white">
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
          <StatusBadge label={ISSUE_STATUS_LABELS[issue.status]} className={ISSUE_STATUS_BADGE_CLASSES[issue.status]} />
          <StatusBadge label={PRIORITY_LABELS[issue.priority]} className={PRIORITY_BADGE_CLASSES[issue.priority]} />
          {issue.type && <span className="text-[13px] text-text-secondary">{issue.type.name}</span>}
          {issue.sourceType !== "manual" && <span className="text-[11px] text-text-muted">from {issue.sourceType.replace(/^Field/, "")}</span>}
        </div>

        <SectionHeader>Overview</SectionHeader>
        <div className="grid grid-cols-2 gap-x-8 gap-y-2 px-4 py-3 text-[13px]">
          <Row label="Title" value={issue.title} full />
          <Row label="Location" value={issue.area?.name ?? "—"} />
          <Row label="Responsible" value={issue.responsibleUser?.name ?? "—"} />
          <Row label="Responsible Org" value={issue.responsibleOrg?.name ?? "—"} />
          <Row label="Due Date" value={issue.dueDate ? issue.dueDate.toLocaleDateString("en-GB") : "—"} />
          <Row label="Verified By" value={issue.verifiedBy?.name ?? "—"} />
          <Row label="Created By" value={issue.createdBy.name} />
          <Row label="Created At" value={issue.createdAt.toLocaleString("en-GB")} />
        </div>

        <SectionHeader>Description</SectionHeader>
        <div className="whitespace-pre-wrap px-4 py-3 text-[13px] text-text-primary">{issue.description}</div>

        <SectionHeader>Evidence</SectionHeader>
        <div className="px-4 py-3">
          <FieldEvidencePanel
            recordType="FieldIssue"
            recordId={issue.id}
            canUpload={canManage}
            categories={["Before", "After"]}
            items={attachments.map((a) => ({
              id: a.id,
              fileName: a.fileName,
              mimeType: a.mimeType,
              sizeBytes: a.sizeBytes,
              uploadedByName: a.uploadedBy.name,
              uploadedAt: a.uploadedAt.toISOString(),
              canDelete: canManage || a.uploadedById === user.id,
              category: a.category,
            }))}
          />
        </div>

        <SectionHeader>Linked Documents / Drawings</SectionHeader>
        <div className="px-4 py-3">
          <FieldDocumentReferences
            recordType="FieldIssue"
            recordId={issue.id}
            projectId={projectId}
            canLink={canManage}
            items={documentReferences.map((r) => ({
              id: r.id,
              documentId: r.documentId,
              documentNo: r.document.documentNo,
              documentTitle: r.document.title,
              revisionAtIssue: r.revisionAtIssue,
              linkedByName: r.createdBy.name,
              linkedAt: r.createdAt.toISOString(),
            }))}
          />
        </div>

        <SectionHeader>Related Records</SectionHeader>
        <FieldRelatedRecords groups={relatedGroups} />

        {(canManage || canVerify) && (
          <>
            <SectionHeader>Status</SectionHeader>
            <div className="px-4 py-3">
              <HseStatusForm
                apiPath={`/api/field/issues/${issue.id}`}
                currentStatus={issue.status}
                options={Object.entries(ISSUE_STATUS_LABELS).map(([value, label]) => ({ value, label }))}
              />
              {issue.status === "READY_FOR_VERIFICATION" && !canVerify && (
                <p className="mt-2 text-[12px] text-text-muted">Independent verification requires the Field Issue Verify permission.</p>
              )}
            </div>
          </>
        )}

        <SectionHeader>Activity</SectionHeader>
        <FieldComments
          recordType="FieldIssue"
          recordId={issue.id}
          canComment={canManage}
          items={comments.map((c) => ({ id: c.id, authorName: c.author.name, body: c.body, createdAt: c.createdAt.toISOString() }))}
        />

        <SectionHeader>Audit Trail</SectionHeader>
        <FieldAuditTrail events={auditTrail} />
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
