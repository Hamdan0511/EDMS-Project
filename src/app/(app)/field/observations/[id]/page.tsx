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
import { ConvertToIssueButton } from "@/components/field/convert-to-issue-button";
import { getFieldAuditTrail } from "@/lib/field/audit-trail";
import { listFieldAttachments } from "@/lib/field/attachments";
import { listFieldComments } from "@/lib/field/comments";
import { OBSERVATION_STATUS_LABELS, OBSERVATION_STATUS_BADGE_CLASSES, PRIORITY_LABELS, PRIORITY_BADGE_CLASSES } from "@/lib/field/status";

export default async function ObservationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user, membership } = await requirePageContext();
  if (!membership) return null;
  const { id } = await params;

  const observation = await prisma.fieldObservation.findFirst({
    where: { id, projectId: membership.projectId },
    include: { area: true, type: true, responsibleUser: true, responsibleOrg: true, createdBy: true },
  });
  if (!observation) notFound();

  const [attachments, comments, canManage, auditTrail, convertedIssue] = await Promise.all([
    listFieldAttachments("FieldObservation", id),
    listFieldComments("FieldObservation", id),
    hasPermission(user.id, "FIELD_MANAGE_OBSERVATIONS", { projectId: membership.projectId }),
    getFieldAuditTrail("FieldObservation", id, membership.projectId),
    prisma.fieldIssue.findFirst({ where: { projectId: membership.projectId, sourceType: "FieldObservation", sourceId: id } }),
  ]);

  const relatedGroups: RelatedRecordGroup[] = [
    {
      label: "Field",
      items: convertedIssue ? [{ id: convertedIssue.id, label: `Issue ${convertedIssue.issueNumber}`, href: `/field/issues/${convertedIssue.id}` }] : [],
    },
  ];

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between border-b border-border pb-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">Site Observation</p>
          <h1 className="mt-0.5 text-lg font-semibold tracking-tight text-text-primary">{observation.observationNumber}</h1>
        </div>
        <div className="flex items-center gap-2">
          {canManage && !observation.isPositive && !convertedIssue && (
            <ConvertToIssueButton apiPath={`/api/field/observations/${observation.id}/convert-to-issue`} />
          )}
          <Link href="/field/observations" className={buttonClass("secondary", "md")}>
            <ChevronLeft size={14} />
            Back
          </Link>
        </div>
      </div>

      <div className="mx-auto w-full max-w-3xl rounded-[3px] border border-border bg-white">
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
          <StatusBadge label={OBSERVATION_STATUS_LABELS[observation.status]} className={OBSERVATION_STATUS_BADGE_CLASSES[observation.status]} />
          <StatusBadge label={PRIORITY_LABELS[observation.priority]} className={PRIORITY_BADGE_CLASSES[observation.priority]} />
          {observation.type && <span className="text-[13px] text-text-secondary">{observation.type.name}</span>}
          {observation.isPositive && <span className="text-[13px] text-emerald-700">Positive Observation</span>}
        </div>

        <SectionHeader>Overview</SectionHeader>
        <div className="grid grid-cols-2 gap-x-8 gap-y-2 px-4 py-3 text-[13px]">
          <Row label="Title" value={observation.title} full />
          <Row label="Location" value={observation.area?.name ?? "—"} />
          <Row label="Responsible" value={observation.responsibleUser?.name ?? "—"} />
          <Row label="Responsible Org" value={observation.responsibleOrg?.name ?? "—"} />
          <Row label="Due Date" value={observation.dueDate ? observation.dueDate.toLocaleDateString("en-GB") : "—"} />
          <Row label="Created By" value={observation.createdBy.name} />
          <Row label="Created At" value={observation.createdAt.toLocaleString("en-GB")} />
        </div>

        <SectionHeader>Description</SectionHeader>
        <div className="whitespace-pre-wrap px-4 py-3 text-[13px] text-text-primary">{observation.description}</div>

        <SectionHeader>Evidence</SectionHeader>
        <div className="px-4 py-3">
          <FieldEvidencePanel
            recordType="FieldObservation"
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
              category: a.category,
            }))}
          />
        </div>

        <SectionHeader>Related Records</SectionHeader>
        <FieldRelatedRecords groups={relatedGroups} />

        {canManage && (
          <>
            <SectionHeader>Status</SectionHeader>
            <div className="px-4 py-3">
              <HseStatusForm
                apiPath={`/api/field/observations/${observation.id}`}
                currentStatus={observation.status}
                options={Object.entries(OBSERVATION_STATUS_LABELS).map(([value, label]) => ({ value, label }))}
              />
            </div>
          </>
        )}

        <SectionHeader>Activity</SectionHeader>
        <FieldComments
          recordType="FieldObservation"
          recordId={observation.id}
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
