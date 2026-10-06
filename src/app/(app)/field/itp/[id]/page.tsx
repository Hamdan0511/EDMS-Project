import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePageContext } from "@/lib/page-context";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/auth/permissions";
import { SectionHeader } from "@/components/ui/section-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { buttonClass } from "@/components/ui/button";
import { ChevronLeft, AlertCircle } from "@/components/ui/icons";
import { ItpApprovalActions } from "@/components/field/itp-approval-actions";
import { ItpItemActions } from "@/components/field/itp-item-actions";
import { FieldAuditTrail } from "@/components/field/field-audit-trail";
import { getFieldAuditTrail } from "@/lib/field/audit-trail";
import {
  ITP_STATUS_LABELS,
  ITP_STATUS_BADGE_CLASSES,
  ITP_CLASSIFICATION_LABELS,
  ITP_ITEM_STATUS_LABELS,
  ITP_ITEM_STATUS_BADGE_CLASSES,
} from "@/lib/field/status";

export default async function ItpDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user, membership } = await requirePageContext();
  if (!membership) return null;
  const { id } = await params;
  const projectId = membership.projectId;

  const itp = await prisma.fieldItp.findFirst({
    where: { id, projectId },
    include: { area: true, responsibleOrg: true, createdBy: true, items: { include: { decidedBy: true }, orderBy: { sequence: "asc" } } },
  });
  if (!itp) notFound();

  const [canManage, canApprove, auditTrail] = await Promise.all([
    hasPermission(user.id, "FIELD_MANAGE_ITP", { projectId }),
    hasPermission(user.id, "FIELD_ITP_APPROVE", { projectId }),
    getFieldAuditTrail("FieldItp", id, projectId),
  ]);

  const activeHoldPoints = itp.items.filter((i) => i.status === "HOLD_ACTIVE" || i.status === "INSPECTION_REQUESTED").length;

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between border-b border-border pb-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">ITP</p>
          <h1 className="mt-0.5 text-lg font-semibold tracking-tight text-text-primary">{itp.itpNumber}</h1>
        </div>
        <div className="flex items-center gap-2">
          {canApprove && itp.status === "DRAFT" && <ItpApprovalActions itpId={itp.id} />}
          <Link href="/field/itp" className={buttonClass("secondary", "md")}>
            <ChevronLeft size={14} />
            Back
          </Link>
        </div>
      </div>

      <div className="mx-auto w-full max-w-4xl rounded-[3px] border border-border bg-white">
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
          <StatusBadge label={ITP_STATUS_LABELS[itp.status]} className={ITP_STATUS_BADGE_CLASSES[itp.status]} />
          <span className="text-[13px] text-text-secondary">{itp.title} · Rev {itp.revision}</span>
        </div>

        {activeHoldPoints > 0 && (
          <div className="mx-4 mt-3 flex items-start gap-2 rounded-[3px] border border-red-300 bg-red-50 px-3 py-2.5 text-[13px] text-red-800">
            <AlertCircle size={15} className="mt-0.5 shrink-0" />
            <span>
              <strong>HOLD POINT ACTIVE</strong> — work on {activeHoldPoints} activit{activeHoldPoints === 1 ? "y" : "ies"} cannot be
              considered released until the required inspection/approval is completed.
            </span>
          </div>
        )}

        <SectionHeader>Overview</SectionHeader>
        <div className="grid grid-cols-2 gap-x-8 gap-y-2 px-4 py-3 text-[13px]">
          <Row label="Discipline" value={itp.discipline ?? "—"} />
          <Row label="Location" value={itp.area?.name ?? "—"} />
          <Row label="Responsible Org" value={itp.responsibleOrg?.name ?? "—"} />
          <Row label="Created By" value={itp.createdBy.name} />
        </div>

        <div className="flex items-center justify-between border-b border-border bg-brand-50 px-4 py-2">
          <h2 className="text-[11px] font-semibold uppercase tracking-wide text-brand-800">Activities ({itp.items.length})</h2>
        </div>
        <ul className="flex flex-col divide-y divide-border">
          {itp.items.map((item) => {
            const isHoldPoint = item.inspectionType === "H";
            const isActiveHold = isHoldPoint && (item.status === "HOLD_ACTIVE" || item.status === "INSPECTION_REQUESTED");
            const isReleased = isHoldPoint && item.status === "RELEASED";
            return (
              <li key={item.id} className="px-4 py-3 text-[13px]">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 flex-col">
                    <div className="flex items-center gap-2">
                      <span className="rounded-[3px] bg-gray-200 px-1.5 py-0.5 text-[10px] font-semibold text-gray-700">
                        {item.inspectionType} — {ITP_CLASSIFICATION_LABELS[item.inspectionType]}
                      </span>
                      <span className="font-medium text-text-primary">{item.activity}</span>
                    </div>
                    {item.acceptanceCriteria && <span className="text-[11px] text-text-secondary">{item.acceptanceCriteria}</span>}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {!isHoldPoint && <StatusBadge label={ITP_ITEM_STATUS_LABELS[item.status]} className={ITP_ITEM_STATUS_BADGE_CLASSES[item.status]} />}
                    {!isHoldPoint && <ItpItemActions itemId={item.id} status={item.status} canManage={canManage} canApprove={canApprove} />}
                  </div>
                </div>

                {isActiveHold && (
                  <div className="mt-2 flex items-center justify-between gap-3 rounded-[3px] border border-red-300 bg-red-50 px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <AlertCircle size={15} className="shrink-0 text-red-700" />
                      <div>
                        <p className="text-[12px] font-semibold uppercase tracking-wide text-red-800">Hold Point</p>
                        <p className="text-[12px] text-red-700">
                          {item.status === "HOLD_ACTIVE" ? "Awaiting Inspection" : "Inspection Requested — awaiting approval decision"}
                        </p>
                      </div>
                    </div>
                    <ItpItemActions itemId={item.id} status={item.status} canManage={canManage} canApprove={canApprove} />
                  </div>
                )}

                {isReleased && (
                  <div className="mt-2 flex items-center gap-2 rounded-[3px] border border-emerald-300 bg-emerald-50 px-3 py-2.5">
                    <StatusBadge label="Released" className="bg-emerald-100 text-emerald-800" />
                    <p className="text-[12px] text-emerald-800">
                      Approved{item.decidedBy ? ` by ${item.decidedBy.name}` : ""}{item.decidedAt ? ` on ${item.decidedAt.toLocaleString("en-GB")}` : ""}
                      {item.decisionNote ? ` — "${item.decisionNote}"` : ""}
                    </p>
                  </div>
                )}

                {isHoldPoint && item.status === "PENDING" && (
                  <div className="mt-2 flex items-center gap-2 rounded-[3px] border border-border bg-background px-3 py-2">
                    <StatusBadge label="Hold Point — Pending ITP Approval" className="bg-gray-200 text-gray-700" />
                  </div>
                )}
              </li>
            );
          })}
        </ul>

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
