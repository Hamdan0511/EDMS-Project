import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePageContext } from "@/lib/page-context";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/auth/permissions";
import { SectionHeader } from "@/components/ui/section-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { buttonClass } from "@/components/ui/button";
import { ChevronLeft, AlertCircle, ClipboardCheck } from "@/components/ui/icons";
import { HseEvidencePanel } from "@/components/hse/hse-evidence-panel";
import { HseRelatedActions } from "@/components/hse/hse-related-actions";
import { HseAuditTrail } from "@/components/hse/hse-audit-trail";
import { getHseAuditTrail } from "@/lib/hse/audit-trail";
import {
  EQUIPMENT_STATUS_LABELS,
  EQUIPMENT_STATUS_BADGE_CLASSES,
  EQUIPMENT_INSPECTION_RESULT_LABELS,
  EQUIPMENT_INSPECTION_RESULT_BADGE_CLASSES,
  CHECKLIST_RESULT_LABELS,
  CHECKLIST_RESULT_BADGE_CLASSES,
} from "@/lib/hse/status";

export default async function EquipmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user, membership } = await requirePageContext();
  if (!membership) return null;
  const { id } = await params;

  const equipment = await prisma.hseEquipment.findFirst({
    where: { id, projectId: membership.projectId },
    include: { organization: true, responsiblePerson: true, createdBy: true },
  });
  if (!equipment) notFound();

  const [inspections, attachments, canManage, auditTrail] = await Promise.all([
    prisma.hseEquipmentInspection.findMany({
      where: { equipmentId: id },
      include: { inspector: true, items: { orderBy: { sortOrder: "asc" } } },
      orderBy: { inspectedAt: "desc" },
    }),
    prisma.hseAttachment.findMany({
      where: { recordType: "HseEquipment", recordId: id },
      include: { uploadedBy: true },
      orderBy: { uploadedAt: "desc" },
    }),
    hasPermission(user.id, "HSE_MANAGE_EQUIPMENT", { projectId: membership.projectId }),
    getHseAuditTrail("HseEquipment", id, membership.projectId),
  ]);

  const relatedActions = await prisma.hseCorrectiveAction.findMany({
    where: {
      projectId: membership.projectId,
      sourceType: "HseEquipmentInspection",
      sourceId: { in: inspections.map((i) => i.id) },
    },
    orderBy: { createdAt: "desc" },
    include: { assignedTo: true },
  });

  const outOfService = equipment.status === "OUT_OF_SERVICE";
  const latestFailedInspection = inspections.find((i) => i.result === "FAIL");
  const openAction = relatedActions.find((a) => a.status !== "CLOSED" && a.status !== "VERIFIED");

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between border-b border-border pb-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">Equipment</p>
          <h1 className="mt-0.5 text-lg font-semibold tracking-tight text-text-primary">{equipment.equipmentNumber}</h1>
        </div>
        <div className="flex items-center gap-2">
          {canManage && (
            <Link href={`/hse/equipment/${equipment.id}/inspect`} className={buttonClass("primary", "md")}>
              <ClipboardCheck size={14} />
              {outOfService ? "Request Reinspection" : "Run Inspection"}
            </Link>
          )}
          <Link href="/hse/equipment" className={buttonClass("secondary", "md")}>
            <ChevronLeft size={14} />
            Back
          </Link>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
        {outOfService && (
          <div className="rounded-[3px] border border-red-300 bg-red-50 px-4 py-3">
            <div className="flex items-center gap-2 text-red-800">
              <AlertCircle size={16} />
              <p className="text-[13px] font-semibold uppercase tracking-wide">Out of Service</p>
            </div>
            <p className="mt-1 text-[13px] text-red-700">
              This equipment must not be operated until the outstanding safety issue has been resolved and the equipment has passed the
              required reinspection.
            </p>
            <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-[12px] text-red-800">
              {latestFailedInspection && (
                <>
                  <span>
                    Failed Inspection: <strong>{latestFailedInspection.inspectionNumber}</strong> on{" "}
                    {latestFailedInspection.inspectedAt.toLocaleDateString("en-GB")}
                  </span>
                  <span>Reported By: {latestFailedInspection.inspector.name}</span>
                </>
              )}
              {openAction ? (
                <span>
                  Corrective Action: <Link href={`/hse/corrective-actions/${openAction.id}`} className="underline">{openAction.actionNumber}</Link>{" "}
                  ({openAction.status.replaceAll("_", " ")})
                </span>
              ) : (
                <span>Corrective Action: none open</span>
              )}
            </div>
          </div>
        )}

        <div className="rounded-[3px] border border-border bg-white">
          <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
            <StatusBadge label={EQUIPMENT_STATUS_LABELS[equipment.status]} className={EQUIPMENT_STATUS_BADGE_CLASSES[equipment.status]} />
            <span className="text-[13px] text-text-secondary">{equipment.equipmentType}</span>
          </div>

          <SectionHeader>Overview</SectionHeader>
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 px-4 py-3 text-[13px]">
            <Row label="Description" value={equipment.description} full />
            <Row label="Make / Model" value={equipment.makeModel ?? "—"} />
            <Row label="Serial Number" value={equipment.serialNumber ?? "—"} />
            <Row label="Location" value={equipment.location ?? "—"} />
            <Row label="Owner / Organization" value={equipment.organization?.name ?? "—"} />
            <Row label="Responsible Person" value={equipment.responsiblePerson?.name ?? "—"} />
            <Row label="Last Inspection" value={equipment.lastInspectionAt ? equipment.lastInspectionAt.toLocaleDateString("en-GB") : "—"} />
            <Row label="Registered By" value={equipment.createdBy.name} />
          </div>

          <SectionHeader>Inspection History ({inspections.length})</SectionHeader>
          {inspections.length === 0 ? (
            <p className="px-4 py-3 text-[13px] text-text-muted">No inspections recorded yet.</p>
          ) : (
            <div className="flex flex-col divide-y divide-border">
              {inspections.map((insp) => (
                <div key={insp.id} className="px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-medium text-text-primary">{insp.inspectionNumber}</span>
                      <StatusBadge
                        label={EQUIPMENT_INSPECTION_RESULT_LABELS[insp.result]}
                        className={EQUIPMENT_INSPECTION_RESULT_BADGE_CLASSES[insp.result]}
                      />
                    </div>
                    <span className="text-[12px] text-text-secondary">
                      {insp.inspectedAt.toLocaleString("en-GB")} · {insp.inspector.name}
                    </span>
                  </div>
                  <ul className="mt-2 flex flex-col gap-1">
                    {insp.items.map((item) => (
                      <li key={item.id} className="flex items-center justify-between text-[12px]">
                        <span className="text-text-secondary">{item.label}</span>
                        <span className="flex items-center gap-2">
                          {item.comment && <span className="text-text-muted">{item.comment}</span>}
                          <StatusBadge label={CHECKLIST_RESULT_LABELS[item.result]} className={CHECKLIST_RESULT_BADGE_CLASSES[item.result]} />
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}

          <SectionHeader>Documents / Evidence</SectionHeader>
          <div className="px-4 py-3">
            <HseEvidencePanel
              recordType="HseEquipment"
              recordId={equipment.id}
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

          <SectionHeader>Open Corrective Actions</SectionHeader>
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
            raiseHref={`/hse/corrective-actions/new?sourceType=HseEquipmentInspection&sourceId=${equipment.id}`}
            canRaise={canManage}
          />

          <SectionHeader>Timeline &amp; Audit</SectionHeader>
          <HseAuditTrail events={auditTrail} />
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, full }: { label: string; value: string; full?: boolean }) {
  return (
    <div className={`flex gap-2 ${full ? "col-span-2" : ""}`}>
      <span className="w-44 shrink-0 text-text-muted">{label}</span>
      <span className="text-text-primary">{value}</span>
    </div>
  );
}
