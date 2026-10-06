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
import { getFieldAuditTrail } from "@/lib/field/audit-trail";
import { listFieldAttachments } from "@/lib/field/attachments";
import { listFieldComments } from "@/lib/field/comments";
import { PUNCH_ITEM_STATUS_LABELS, PUNCH_ITEM_STATUS_BADGE_CLASSES, PRIORITY_LABELS, PRIORITY_BADGE_CLASSES } from "@/lib/field/status";

export default async function PunchItemDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user, membership } = await requirePageContext();
  if (!membership) return null;
  const { id } = await params;
  const projectId = membership.projectId;

  const item = await prisma.fieldPunchItem.findFirst({
    where: { id, projectId },
    include: { area: true, trade: true, responsibleUser: true, responsibleOrg: true, createdBy: true, punchlist: true },
  });
  if (!item) notFound();

  const [attachments, comments, canManage, auditTrail] = await Promise.all([
    listFieldAttachments("FieldPunchItem", id),
    listFieldComments("FieldPunchItem", id),
    hasPermission(user.id, "FIELD_MANAGE_PUNCH", { projectId }),
    getFieldAuditTrail("FieldPunchItem", id, projectId),
  ]);

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between border-b border-border pb-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">Punch Item</p>
          <h1 className="mt-0.5 text-lg font-semibold tracking-tight text-text-primary">{item.punchItemNumber}</h1>
        </div>
        <Link href="/field/punch" className={buttonClass("secondary", "md")}>
          <ChevronLeft size={14} />
          Back
        </Link>
      </div>

      <div className="mx-auto w-full max-w-3xl rounded-[3px] border border-border bg-white">
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
          <StatusBadge label={PUNCH_ITEM_STATUS_LABELS[item.status]} className={PUNCH_ITEM_STATUS_BADGE_CLASSES[item.status]} />
          <StatusBadge label={PRIORITY_LABELS[item.priority]} className={PRIORITY_BADGE_CLASSES[item.priority]} />
          {item.trade && <span className="text-[13px] text-text-secondary">{item.trade.name}</span>}
        </div>

        <SectionHeader>Overview</SectionHeader>
        <div className="grid grid-cols-2 gap-x-8 gap-y-2 px-4 py-3 text-[13px]">
          <Row label="Title" value={item.title} full />
          <Row label="Punchlist" value={item.punchlist?.title ?? "Standalone"} />
          <Row label="Location" value={item.area?.name ?? "—"} />
          <Row label="Responsible" value={item.responsibleUser?.name ?? "—"} />
          <Row label="Due Date" value={item.dueDate ? item.dueDate.toLocaleDateString("en-GB") : "—"} />
          <Row label="Created By" value={item.createdBy.name} />
        </div>

        <SectionHeader>Description</SectionHeader>
        <div className="whitespace-pre-wrap px-4 py-3 text-[13px] text-text-primary">{item.description}</div>

        <SectionHeader>Evidence</SectionHeader>
        <div className="px-4 py-3">
          <FieldEvidencePanel
            recordType="FieldPunchItem"
            recordId={item.id}
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
                apiPath={`/api/field/punch-items/${item.id}`}
                currentStatus={item.status}
                options={Object.entries(PUNCH_ITEM_STATUS_LABELS).map(([value, label]) => ({ value, label }))}
              />
            </div>
          </>
        )}

        <SectionHeader>Activity</SectionHeader>
        <FieldComments
          recordType="FieldPunchItem"
          recordId={item.id}
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
      <span className="w-32 shrink-0 text-text-muted">{label}</span>
      <span className="text-text-primary">{value}</span>
    </div>
  );
}
