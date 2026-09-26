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
import { IncidentInvestigationForm } from "@/components/hse/incident-investigation-form";
import { IncidentPeopleForm } from "@/components/hse/incident-people-form";
import { HseRelatedActions } from "@/components/hse/hse-related-actions";
import { HseAuditTrail } from "@/components/hse/hse-audit-trail";
import { getHseAuditTrail } from "@/lib/hse/audit-trail";
import { INCIDENT_TYPE_LABELS, INCIDENT_STATUS_LABELS, INCIDENT_STATUS_BADGE_CLASSES, SEVERITY_LABELS, SEVERITY_BADGE_CLASSES } from "@/lib/hse/status";

export default async function IncidentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user, membership } = await requirePageContext();
  if (!membership) return null;
  const { id } = await params;

  const incident = await prisma.hseIncident.findFirst({
    where: { id, projectId: membership.projectId },
    include: { reportedBy: true, people: true },
  });
  if (!incident) notFound();

  const [attachments, canManage, canRaiseAction, relatedActions, auditTrail, projectMembers] = await Promise.all([
    prisma.hseAttachment.findMany({
      where: { recordType: "HseIncident", recordId: id },
      include: { uploadedBy: true },
      orderBy: { uploadedAt: "desc" },
    }),
    hasPermission(user.id, "HSE_MANAGE_INCIDENTS", { projectId: membership.projectId }),
    hasPermission(user.id, "HSE_MANAGE_ACTIONS", { projectId: membership.projectId }),
    prisma.hseCorrectiveAction.findMany({
      where: { projectId: membership.projectId, sourceType: "HseIncident", sourceId: id },
      orderBy: { createdAt: "desc" },
      include: { assignedTo: true },
    }),
    getHseAuditTrail("HseIncident", id, membership.projectId),
    prisma.projectMember.findMany({ where: { projectId: membership.projectId }, include: { user: true }, orderBy: { user: { name: "asc" } } }),
  ]);

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between border-b border-border pb-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">Incident</p>
          <h1 className="mt-0.5 text-lg font-semibold tracking-tight text-text-primary">{incident.incidentNumber}</h1>
        </div>
        <Link href="/hse/incidents" className={buttonClass("secondary", "md")}>
          <ChevronLeft size={14} />
          Back
        </Link>
      </div>

      <div className="mx-auto w-full max-w-3xl rounded-[3px] border border-border bg-white">
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
          <StatusBadge label={INCIDENT_STATUS_LABELS[incident.status]} className={INCIDENT_STATUS_BADGE_CLASSES[incident.status]} />
          <StatusBadge label={`${SEVERITY_LABELS[incident.severity]} Severity`} className={SEVERITY_BADGE_CLASSES[incident.severity]} />
          <span className="text-[13px] text-text-secondary">{INCIDENT_TYPE_LABELS[incident.type]}</span>
        </div>

        <SectionHeader>Overview</SectionHeader>
        <div className="grid grid-cols-2 gap-x-8 gap-y-2 px-4 py-3 text-[13px]">
          <Row label="Title" value={incident.title} full />
          <Row label="Location" value={incident.location} />
          <Row label="Building / Floor / Area" value={[incident.building, incident.floor, incident.area].filter(Boolean).join(" / ") || "—"} />
          <Row label="Incident Date" value={incident.incidentDate.toLocaleDateString("en-GB")} />
          <Row label="Incident Time" value={incident.incidentTime ?? "—"} />
          <Row label="Reported By" value={incident.reportedBy.name} />
          <Row label="Reported At" value={incident.reportedAt.toLocaleString("en-GB")} />
        </div>

        <SectionHeader>Description</SectionHeader>
        <div className="whitespace-pre-wrap px-4 py-3 text-[13px] text-text-primary">{incident.description}</div>

        <SectionHeader>People ({incident.people.length})</SectionHeader>
        <div className="flex flex-col gap-3 px-4 py-3 text-[13px]">
          {incident.people.length === 0 ? (
            <p className="text-text-muted">No people recorded.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {incident.people.map((p) => (
                <li key={p.id} className="flex items-center justify-between">
                  <span>{p.name}</span>
                  <span className="text-text-muted">{p.role}{p.organization ? ` · ${p.organization}` : ""}</span>
                </li>
              ))}
            </ul>
          )}
          {canManage && (
            <IncidentPeopleForm
              incidentId={incident.id}
              members={projectMembers.map((m) => ({ id: m.user.id, name: m.user.name }))}
            />
          )}
        </div>

        <SectionHeader>Evidence</SectionHeader>
        <div className="px-4 py-3">
          <HseEvidencePanel
            recordType="HseIncident"
            recordId={incident.id}
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
            <SectionHeader>Investigation</SectionHeader>
            <div className="px-4 py-3">
              <IncidentInvestigationForm
                incidentId={incident.id}
                initial={{
                  immediateCause: incident.immediateCause ?? "",
                  contributingFactors: incident.contributingFactors ?? "",
                  rootCause: incident.rootCause ?? "",
                }}
              />
            </div>

            <SectionHeader>Status</SectionHeader>
            <div className="px-4 py-3">
              <HseStatusForm
                apiPath={`/api/hse/incidents/${incident.id}`}
                currentStatus={incident.status}
                options={Object.entries(INCIDENT_STATUS_LABELS).map(([value, label]) => ({ value, label }))}
              />
            </div>
          </>
        )}

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
          raiseHref={`/hse/corrective-actions/new?sourceType=HseIncident&sourceId=${incident.id}`}
          canRaise={canRaiseAction}
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
