"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Drawer, DrawerHeader, DrawerTabs } from "@/components/ui/drawer";
import { StatusBadge } from "@/components/ui/status-badge";
import { buttonClass } from "@/components/ui/button";
import { FieldEvidencePanel } from "@/components/field/field-evidence-panel";
import { FieldComments } from "@/components/field/field-comments";
import { FieldAuditTrail } from "@/components/field/field-audit-trail";
import { FieldDocumentReferences } from "@/components/field/field-document-references";
import { ConvertToIssueButton } from "@/components/field/convert-to-issue-button";
import { ExternalLink, FileText, ImageIcon, Loader2 } from "@/components/ui/icons";
import {
  OBSERVATION_STATUS_LABELS,
  OBSERVATION_STATUS_BADGE_CLASSES,
  PRIORITY_LABELS,
  PRIORITY_BADGE_CLASSES,
} from "@/lib/field/status";

type ObservationDetail = {
  id: string;
  observationNumber: string;
  title: string;
  description: string;
  status: keyof typeof OBSERVATION_STATUS_LABELS;
  priority: keyof typeof PRIORITY_LABELS;
  isPositive: boolean;
  typeName: string | null;
  areaId: string | null;
  areaName: string | null;
  areaPath: string | null;
  responsibleUserName: string | null;
  responsibleOrgName: string | null;
  dueDate: string | null;
  createdByName: string;
  createdAt: string;
  canManage: boolean;
  attachments: { id: string; fileName: string; mimeType: string; sizeBytes: number; uploadedByName: string; uploadedAt: string; canDelete: boolean; category: string | null }[];
  comments: { id: string; authorName: string; body: string; createdAt: string }[];
  documentReferences: { id: string; documentId: string; documentNo: string; documentTitle: string; revisionAtIssue: string | null; linkedByName: string; linkedAt: string }[];
  auditTrail: { id: string; actorName: string; label: string; detail: string | null; createdAt: string }[];
  convertedIssue: { id: string; issueNumber: string; status: string } | null;
};

const TABS = [
  { key: "details", label: "Details" },
  { key: "evidence", label: "Evidence" },
  { key: "related", label: "Related" },
  { key: "activity", label: "Activity" },
];

export function ObservationDetailDrawer({
  observationId,
  projectId,
  onClose,
}: {
  observationId: string;
  projectId: string;
  onClose: () => void;
}) {
  const [tab, setTab] = useState("details");
  const [data, setData] = useState<ObservationDetail | null>(null);
  const [loading, setLoading] = useState(true);

  function reload() {
    fetch(`/api/field/observations/${observationId}/detail`)
      .then((r) => r.json())
      .then((d) => setData(d));
  }

  // Mounted with key={observationId} by the caller, so a new observation
  // selection always starts this component fresh (loading=true, data=null,
  // tab="details" from the initial useState values) rather than needing a
  // synchronous reset here.
  useEffect(() => {
    fetch(`/api/field/observations/${observationId}/detail`)
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      });
  }, [observationId]);

  return (
    <Drawer open onClose={onClose}>
      {loading || !data ? (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 size={20} className="animate-spin text-text-muted" />
        </div>
      ) : (
        <>
          <DrawerHeader
            eyebrow="Site Observation"
            title={`${data.observationNumber} — ${data.title}`}
            badges={
              <>
                <StatusBadge label={OBSERVATION_STATUS_LABELS[data.status]} className={OBSERVATION_STATUS_BADGE_CLASSES[data.status]} />
                <StatusBadge label={PRIORITY_LABELS[data.priority]} className={PRIORITY_BADGE_CLASSES[data.priority]} />
                {data.isPositive && <StatusBadge label="Positive" className="bg-emerald-100 text-emerald-800" />}
              </>
            }
            actions={
              <>
                {data.canManage && !data.convertedIssue && (
                  <ConvertToIssueButton apiPath={`/api/field/observations/${data.id}/convert-to-issue`} />
                )}
                <Link href={`/field/observations/${data.id}`} className={buttonClass("ghost", "sm")} title="Open full page">
                  <ExternalLink size={13} />
                </Link>
              </>
            }
            onClose={onClose}
          />
          <DrawerTabs tabs={TABS} active={tab} onChange={setTab} />

          <div className="flex-1 overflow-y-auto">
            {tab === "details" && (
              <div className="flex flex-col gap-4 px-4 py-4">
                <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-[13px]">
                  <Field label="Location" value={data.areaPath ?? data.areaName ?? "—"} />
                  <Field label="Type" value={data.typeName ?? "—"} />
                  <Field label="Priority" value={PRIORITY_LABELS[data.priority]} />
                  <Field label="Responsible" value={data.responsibleUserName ?? data.responsibleOrgName ?? "—"} />
                  <Field label="Due Date" value={data.dueDate ? new Date(data.dueDate).toLocaleDateString("en-GB") : "—"} />
                  <Field label="Created By" value={`${data.createdByName} · ${new Date(data.createdAt).toLocaleDateString("en-GB")}`} />
                </div>

                <div>
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-text-muted">Description</p>
                  <p className="whitespace-pre-wrap text-[13px] text-text-primary">{data.description}</p>
                </div>

                {data.convertedIssue && (
                  <Link
                    href={`/field/issues/${data.convertedIssue.id}`}
                    className="flex items-center justify-between rounded-[3px] border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-900 hover:border-amber-300"
                  >
                    <span>Converted to Issue {data.convertedIssue.issueNumber}</span>
                    <ExternalLink size={13} />
                  </Link>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <MiniCard
                    title={`Site Photos (${data.attachments.length})`}
                    action={
                      <Link href={`/field/photos${data.areaId ? `?areaId=${data.areaId}` : ""}`} className="text-[11px] font-medium text-brand-700 hover:underline">
                        View All
                      </Link>
                    }
                  >
                    {data.attachments.length === 0 ? (
                      <p className="text-[12px] text-text-muted">No photos yet.</p>
                    ) : (
                      <div className="flex gap-1.5">
                        {data.attachments.slice(0, 3).map((a) => (
                          <a key={a.id} href={`/api/field/attachments/${a.id}`} target="_blank" rel="noopener noreferrer">
                            {a.mimeType.startsWith("image/") ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={`/api/field/attachments/${a.id}`} alt={a.fileName} className="h-12 w-12 rounded-[3px] border border-border object-cover" />
                            ) : (
                              <span className="flex h-12 w-12 items-center justify-center rounded-[3px] border border-border bg-background text-text-muted">
                                <ImageIcon size={16} />
                              </span>
                            )}
                          </a>
                        ))}
                      </div>
                    )}
                  </MiniCard>

                  <MiniCard
                    title="Drawing Location"
                    action={
                      data.documentReferences[0] ? (
                        <Link href={`/documents/${data.documentReferences[0].documentId}`} className="text-[11px] font-medium text-brand-700 hover:underline">
                          View on Drawing
                        </Link>
                      ) : undefined
                    }
                  >
                    {data.documentReferences[0] ? (
                      <div className="flex items-start gap-2">
                        <FileText size={14} className="mt-0.5 shrink-0 text-text-muted" />
                        <div className="min-w-0">
                          <p className="truncate text-[12px] font-medium text-text-primary">{data.documentReferences[0].documentNo}</p>
                          <p className="truncate text-[11px] text-text-muted">Rev {data.documentReferences[0].revisionAtIssue ?? "—"} · {data.documentReferences[0].documentTitle}</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-[12px] text-text-muted">No drawing linked yet.</p>
                    )}
                  </MiniCard>
                </div>
              </div>
            )}

            {tab === "evidence" && (
              <div className="px-4 py-4">
                <FieldEvidencePanel
                  recordType="FieldObservation"
                  recordId={data.id}
                  canUpload={data.canManage}
                  items={data.attachments}
                  onChanged={reload}
                />
              </div>
            )}

            {tab === "related" && (
              <div className="px-4 py-4">
                <FieldDocumentReferences
                  recordType="FieldObservation"
                  recordId={data.id}
                  projectId={projectId}
                  canLink={data.canManage}
                  items={data.documentReferences}
                  onChanged={reload}
                />
              </div>
            )}

            {tab === "activity" && (
              <div className="flex flex-col divide-y divide-border">
                <FieldComments recordType="FieldObservation" recordId={data.id} canComment={data.canManage} items={data.comments} onChanged={reload} />
                <FieldAuditTrail events={data.auditTrail.map((e) => ({ ...e, createdAt: new Date(e.createdAt) }))} />
              </div>
            )}
          </div>
        </>
      )}
    </Drawer>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] text-text-muted">{label}</p>
      <p className="text-text-primary">{value}</p>
    </div>
  );
}

function MiniCard({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-[3px] border border-border bg-background p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">{title}</p>
        {action}
      </div>
      {children}
    </div>
  );
}
