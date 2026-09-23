"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { RecipientPicker, type DirectoryPerson } from "@/components/mail/recipient-picker";
import { RichTextEditor } from "@/components/mail/editor/rich-text-editor";
import { MailRichContent } from "@/components/mail/mail-rich-content";
import { AttachDocumentModal, type DocumentReference } from "@/components/mail/incoming/attach-document-modal";
import { SelectAttributesModal } from "@/components/mail/incoming/select-attributes-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SectionHeader } from "@/components/ui/section-header";
import { Eye, X, FileText, Info } from "@/components/ui/icons";
import { REASON_FOR_ISSUE_OPTIONS, REASON_FOR_ISSUE_LABELS } from "@/lib/mail/reason-for-issue";
import { RESPONSE_TYPE_OPTIONS, RESPONSE_TYPE_LABELS } from "@/lib/mail/response-type";
import type { MailResponseType, MailReasonForIssue } from "@prisma/client";

type MailTypeData = {
  id: string;
  attribute1Label: string | null;
  attribute2Label: string | null;
  requiresAttribute1: boolean;
  requiresAttribute2: boolean;
};

export type TransmittalDraftData = {
  id: string;
  subject: string;
  messageHtml: string;
  attribute1: string | null;
  attribute2: string | null;
  reasonForIssue: MailReasonForIssue | null;
  responseType: MailResponseType | null;
  responseDueDate: string;
  to: DirectoryPerson[];
  cc: DirectoryPerson[];
  documents: DocumentReference[];
};

export function TransmittalForm({
  projectId,
  kind,
  mailType,
  fromLabel,
  draft,
  initialDocuments,
  canManageAttributeOptions,
}: {
  projectId: string;
  kind: "transmittal" | "tender";
  mailType: MailTypeData;
  fromLabel: string;
  draft: TransmittalDraftData | null;
  initialDocuments: DocumentReference[];
  canManageAttributeOptions: boolean;
}) {
  const router = useRouter();

  const [to, setTo] = useState<DirectoryPerson[]>(draft?.to ?? []);
  const [toQuery, setToQuery] = useState("");
  const [cc, setCc] = useState<DirectoryPerson[]>(draft?.cc ?? []);
  const [ccQuery, setCcQuery] = useState("");
  const [reasonForIssue, setReasonForIssue] = useState<MailReasonForIssue | "">(draft?.reasonForIssue ?? "");
  const [responseType, setResponseType] = useState<MailResponseType | "">(draft?.responseType ?? "");
  const [responseDueDate, setResponseDueDate] = useState(draft?.responseDueDate ?? "");
  const [subject, setSubject] = useState(draft?.subject ?? "");
  const [attribute1, setAttribute1] = useState(draft?.attribute1 ?? "");
  const [attribute2, setAttribute2] = useState(draft?.attribute2 ?? "");
  const [description, setDescription] = useState(draft?.messageHtml ?? "");
  const [documents, setDocuments] = useState<DocumentReference[]>(draft?.documents ?? initialDocuments);
  const [removedDocumentIds, setRemovedDocumentIds] = useState<string[]>([]);
  const [expandedDocId, setExpandedDocId] = useState<string | null>(null);

  const [attachDocOpen, setAttachDocOpen] = useState(false);
  const [selectAttributesOpen, setSelectAttributesOpen] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<"draft" | "send" | null>(null);
  const [preview, setPreview] = useState(false);

  const title = kind === "tender" ? "Tender Transmittal" : "Transmittal";

  function removeDocument(id: string) {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
    if (draft?.documents.some((d) => d.id === id)) {
      setRemovedDocumentIds((prev) => [...prev, id]);
    }
  }

  async function submit(action: "draft" | "send") {
    setError(null);

    if (!subject.trim()) {
      setError("Subject is required");
      return;
    }
    if (toQuery.trim() || ccQuery.trim()) {
      setError(
        `You typed a name in the ${toQuery.trim() ? "To" : "Cc"} field but haven't selected it from the directory. ` +
          `Click a matching contact in the dropdown, or press Enter to pick the highlighted match.`,
      );
      return;
    }
    if (action === "send" && to.length === 0) {
      setError("At least one recipient in To is required to send");
      return;
    }
    if (action === "send" && documents.length === 0) {
      setError("At least one document is required to send a transmittal");
      return;
    }
    if (mailType.requiresAttribute1 && !attribute1.trim()) {
      setError(`${mailType.attribute1Label ?? "Attribute 1"} is required`);
      return;
    }
    if (mailType.requiresAttribute2 && !attribute2.trim()) {
      setError(`${mailType.attribute2Label ?? "Attribute 2"} is required`);
      return;
    }
    if (responseType && !responseDueDate) {
      setError("A due date is required when a response requirement is selected");
      return;
    }

    setSubmitting(action);

    const res = await fetch("/api/mail/transmittals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId,
        action,
        kind,
        mailId: draft?.id,
        toUserIds: to.map((p) => p.userId),
        ccUserIds: cc.map((p) => p.userId),
        reasonForIssue: reasonForIssue || undefined,
        responseType: responseType || undefined,
        responseDueDate: responseDueDate || undefined,
        subject,
        attribute1,
        attribute2,
        description,
        documentIds: documents.map((d) => d.id),
        removeDocumentIds: removedDocumentIds,
      }),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setError(data.error ?? "Failed to save the transmittal");
      setSubmitting(null);
      return;
    }

    if (action === "send") {
      router.push(`/mail/${data.id}`);
    } else {
      router.push(`/mail?tab=drafts`);
    }
    router.refresh();
  }

  const labelClass = "mb-1 block text-xs font-medium text-text-secondary";

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex items-center justify-between rounded-[3px] border border-border bg-white px-3 py-2">
        <Button type="button" variant="ghost" size="sm" onClick={() => setPreview((v) => !v)}>
          <Eye size={14} />
          {preview ? "Back to edit" : "Preview"}
        </Button>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" disabled={submitting !== null} onClick={() => submit("draft")}>
            {submitting === "draft" ? "Saving..." : "Save To Draft"}
          </Button>
          <Button type="button" variant="primary" disabled={submitting !== null} onClick={() => submit("send")}>
            {submitting === "send" ? "Sending..." : "Send"}
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-[3px] border border-danger/30 bg-red-50 px-3 py-2 text-sm text-danger">
          {error}
        </div>
      )}

      <div className="mb-4 rounded-[3px] border border-border bg-white px-4 py-2 text-xs text-text-muted">
        {title} · From {fromLabel}
      </div>

      {preview ? (
        <div className="rounded-[3px] border border-border bg-white">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-base font-semibold text-text-primary">{subject || "(No subject)"}</h2>
          </div>
          <div className="flex flex-col gap-2 border-b border-border px-4 py-3 text-[13px]">
            <PreviewRow label="To" value={to.map((p) => p.name).join(", ") || "—"} />
            {cc.length > 0 && <PreviewRow label="Cc" value={cc.map((p) => p.name).join(", ")} />}
            {reasonForIssue && <PreviewRow label="Reason for Issue" value={REASON_FOR_ISSUE_LABELS[reasonForIssue]} />}
            {responseType && (
              <PreviewRow label="Response" value={`${RESPONSE_TYPE_LABELS[responseType]} ${responseDueDate ? `— ${responseDueDate}` : ""}`} />
            )}
            {(mailType.attribute1Label || attribute1) && (
              <PreviewRow label={mailType.attribute1Label ?? "Attribute 1"} value={attribute1 || "—"} />
            )}
            {(mailType.attribute2Label || attribute2) && (
              <PreviewRow label={mailType.attribute2Label ?? "Attribute 2"} value={attribute2 || "—"} />
            )}
          </div>
          {documents.length > 0 && (
            <div className="flex flex-col gap-1 border-b border-border px-4 py-3 text-[13px]">
              {documents.map((d) => (
                <PreviewRow key={d.id} label="Attachment" value={`${d.documentNo} — ${d.title} (Rev ${d.revision})`} />
              ))}
            </div>
          )}
          <div className="px-4 py-3">
            <MailRichContent html={description} />
          </div>
        </div>
      ) : (
        <>
          <div className="mb-4 flex flex-col gap-4 rounded-[3px] border border-border bg-white p-4">
            <RecipientPicker label="To" projectId={projectId} selected={to} onChange={setTo} onQueryChange={setToQuery} testId="to-picker" />
            <RecipientPicker label="Cc" projectId={projectId} selected={cc} onChange={setCc} onQueryChange={setCcQuery} testId="cc-picker" />

            <div>
              <label className={labelClass}>Reason for Issue</label>
              <div className="max-w-xs">
                <Select value={reasonForIssue} onChange={(e) => setReasonForIssue(e.target.value as MailReasonForIssue | "")}>
                  <option value="">{"<Select>"}</option>
                  {REASON_FOR_ISSUE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <label className="text-xs font-medium text-text-secondary">Response Required</label>
              <div className="w-56">
                <Select value={responseType} onChange={(e) => setResponseType(e.target.value as MailResponseType | "")}>
                  <option value="">-- Select --</option>
                  {RESPONSE_TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              </div>
              {responseType && (
                <div className="w-40">
                  <Input type="date" value={responseDueDate} onChange={(e) => setResponseDueDate(e.target.value)} />
                </div>
              )}
            </div>

            <div>
              <label className={labelClass}>
                Subject <span className="text-danger">*</span>
              </label>
              <Input data-testid="subject-input" value={subject} onChange={(e) => setSubject(e.target.value)} />
            </div>
          </div>

          <div className="mb-4 rounded-[3px] border border-border bg-white">
            <SectionHeader
              actions={
                <button
                  type="button"
                  onClick={() => setSelectAttributesOpen(true)}
                  className="text-xs font-medium text-brand-700 hover:underline"
                >
                  Select Attributes
                </button>
              }
            >
              Attributes
            </SectionHeader>
            <div className="flex flex-col gap-3 p-4">
              <div>
                <label className={labelClass}>
                  {mailType.attribute1Label ?? "Attribute 1"}
                  {mailType.requiresAttribute1 && <span className="text-danger"> *</span>}
                </label>
                <Input value={attribute1} readOnly onClick={() => setSelectAttributesOpen(true)} />
              </div>
              <div>
                <label className={labelClass}>
                  {mailType.attribute2Label ?? "Attribute 2"}
                  {mailType.requiresAttribute2 && <span className="text-danger"> *</span>}
                </label>
                <Input value={attribute2} readOnly onClick={() => setSelectAttributesOpen(true)} />
              </div>
            </div>
          </div>

          <div className="mb-4 rounded-[3px] border border-border bg-white">
            <SectionHeader>Details</SectionHeader>
            <div className="p-4">
              <label className={labelClass}>Description</label>
              <RichTextEditor projectId={projectId} value={description} onChange={setDescription} />
            </div>
          </div>

          <div className="mb-4 rounded-[3px] border border-border bg-white">
            <SectionHeader
              actions={
                <button
                  type="button"
                  onClick={() => setAttachDocOpen(true)}
                  className="text-xs font-medium text-brand-700 hover:underline"
                >
                  Attach Document
                </button>
              }
            >
              Attachments ({documents.length})
            </SectionHeader>
            <div className="flex flex-col gap-2 p-4">
              {documents.length === 0 && (
                <p className="text-[13px] text-text-muted">No documents attached yet.</p>
              )}
              {documents.map((d) => (
                <div key={d.id} className="flex flex-col gap-1 border-b border-border pb-2 last:border-b-0 last:pb-0">
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="flex items-center gap-1.5">
                      <FileText size={13} className="text-brand-700" />
                      {d.documentNo} — {d.title} (Rev {d.revision})
                    </span>
                    <span className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setExpandedDocId((prev) => (prev === d.id ? null : d.id))}
                        className="flex items-center gap-1 text-xs text-text-secondary hover:text-brand-700"
                      >
                        <Info size={12} />
                        View File Properties
                      </button>
                      <button
                        type="button"
                        onClick={() => removeDocument(d.id)}
                        className="flex items-center gap-1 text-xs text-danger hover:underline"
                      >
                        <X size={12} />
                        Remove
                      </button>
                    </span>
                  </div>
                  {expandedDocId === d.id && (
                    <div className="ml-5 rounded-[3px] bg-background px-2 py-1.5 text-xs text-text-secondary">
                      Document Type: {d.typeName ?? "—"} · Revision at time of transmission: {d.revision}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <AttachDocumentModal
        open={attachDocOpen}
        onClose={() => setAttachDocOpen(false)}
        projectId={projectId}
        selected={documents}
        onAdd={(doc) => setDocuments((prev) => [...prev, doc])}
      />
      <SelectAttributesModal
        open={selectAttributesOpen}
        onClose={() => setSelectAttributesOpen(false)}
        mailTypeId={mailType.id}
        canAddValues={canManageAttributeOptions}
        slots={useMemo(
          () => [
            { slot: 1 as const, label: mailType.attribute1Label ?? "Attribute 1", currentValue: attribute1 },
            { slot: 2 as const, label: mailType.attribute2Label ?? "Attribute 2", currentValue: attribute2 },
          ],
          [mailType.attribute1Label, mailType.attribute2Label, attribute1, attribute2],
        )}
        onConfirm={(values) => {
          setAttribute1(values[1]);
          setAttribute2(values[2]);
        }}
      />
    </div>
  );
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="w-32 shrink-0 text-text-muted">{label}</span>
      <span className="text-text-primary">{value}</span>
    </div>
  );
}
