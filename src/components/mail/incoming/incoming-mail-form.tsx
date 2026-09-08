"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { RecipientPicker, type DirectoryPerson } from "@/components/mail/recipient-picker";
import { RichTextEditor } from "@/components/mail/editor/rich-text-editor";
import { MailRichContent } from "@/components/mail/mail-rich-content";
import { AttachDropdown } from "./attach-dropdown";
import { AttachDocumentModal, type DocumentReference } from "./attach-document-modal";
import { AttachProjectMailModal, type MailReference } from "./attach-project-mail-modal";
import { SelectAttributesModal } from "./select-attributes-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SectionHeader } from "@/components/ui/section-header";
import { Paperclip, Eye, X, Link2 } from "@/components/ui/icons";
import { RESPONSE_TYPE_OPTIONS, RESPONSE_TYPE_LABELS } from "@/lib/mail/response-type";
import type { MailResponseType } from "@prisma/client";

type MailTypeData = {
  id: string;
  name: string;
  attribute1Label: string | null;
  attribute2Label: string | null;
  requiresAttribute1: boolean;
  requiresAttribute2: boolean;
};

export type IncomingDraftData = {
  id: string;
  typeId: string;
  subject: string;
  messageHtml: string;
  attribute1: string | null;
  attribute2: string | null;
  responseType: MailResponseType | null;
  responseDueDate: string;
  sender: DirectoryPerson;
  to: DirectoryPerson[];
  cc: DirectoryPerson[];
  attachments: { id: string; fileName: string; sizeBytes: number }[];
  documentReferences: DocumentReference[];
  relatedMails: MailReference[];
};

export function IncomingMailForm({
  projectId,
  mailTypes,
  draft,
  canManageAttributeOptions,
}: {
  projectId: string;
  mailTypes: MailTypeData[];
  draft: IncomingDraftData | null;
  canManageAttributeOptions: boolean;
}) {
  const router = useRouter();

  const [typeId, setTypeId] = useState(draft?.typeId ?? "");
  const [sender, setSender] = useState<DirectoryPerson[]>(draft ? [draft.sender] : []);
  const [senderQuery, setSenderQuery] = useState("");
  const [to, setTo] = useState<DirectoryPerson[]>(draft?.to ?? []);
  const [toQuery, setToQuery] = useState("");
  const [cc, setCc] = useState<DirectoryPerson[]>(draft?.cc ?? []);
  const [ccQuery, setCcQuery] = useState("");
  const [responseType, setResponseType] = useState<MailResponseType | "">(draft?.responseType ?? "");
  const [responseDueDate, setResponseDueDate] = useState(draft?.responseDueDate ?? "");
  const [subject, setSubject] = useState(draft?.subject ?? "");
  const [attribute1, setAttribute1] = useState(draft?.attribute1 ?? "");
  const [attribute2, setAttribute2] = useState(draft?.attribute2 ?? "");
  const [messageHtml, setMessageHtml] = useState(draft?.messageHtml ?? "");
  const [existingAttachments, setExistingAttachments] = useState(draft?.attachments ?? []);
  const [removedAttachmentIds, setRemovedAttachmentIds] = useState<string[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [documentReferences, setDocumentReferences] = useState<DocumentReference[]>(
    draft?.documentReferences ?? [],
  );
  const [relatedMails, setRelatedMails] = useState<MailReference[]>(draft?.relatedMails ?? []);

  const [attachDocOpen, setAttachDocOpen] = useState(false);
  const [attachMailOpen, setAttachMailOpen] = useState(false);
  const [selectAttributesOpen, setSelectAttributesOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<"draft" | "register" | null>(null);
  const [preview, setPreview] = useState(false);

  const selectedType = useMemo(() => mailTypes.find((t) => t.id === typeId) ?? null, [mailTypes, typeId]);
  const senderPerson = sender[0] ?? null;

  function removeExistingAttachment(id: string) {
    setExistingAttachments((prev) => prev.filter((a) => a.id !== id));
    setRemovedAttachmentIds((prev) => [...prev, id]);
  }

  async function submit(action: "draft" | "register") {
    setError(null);

    if (!typeId) {
      setError("Type is required");
      return;
    }
    if (!senderPerson) {
      setError("Sent From is required");
      return;
    }
    if (!subject.trim()) {
      setError("Subject is required");
      return;
    }
    if (senderQuery.trim() || toQuery.trim() || ccQuery.trim()) {
      const field = senderQuery.trim() ? "Sent From" : toQuery.trim() ? "Sent To" : "Cc";
      setError(
        `You typed a name in the ${field} field but haven't selected it from the directory. ` +
          `Click a matching contact in the dropdown, or press Enter to pick the highlighted match.`,
      );
      return;
    }
    if (action === "register" && to.length === 0) {
      setError("At least one recipient in Sent To is required to register");
      return;
    }
    if (selectedType?.requiresAttribute1 && !attribute1.trim()) {
      setError(`${selectedType.attribute1Label ?? "Attribute 1"} is required`);
      return;
    }
    if (selectedType?.requiresAttribute2 && !attribute2.trim()) {
      setError(`${selectedType.attribute2Label ?? "Attribute 2"} is required`);
      return;
    }
    if (responseType && !responseDueDate) {
      setError("A due date is required when a response requirement is selected");
      return;
    }

    setSubmitting(action);

    const form = new FormData();
    form.set("projectId", projectId);
    form.set("action", action);
    if (draft) form.set("mailId", draft.id);
    form.set("typeId", typeId);
    form.set("senderUserId", senderPerson.userId);
    form.set("subject", subject);
    form.set("messageHtml", messageHtml);
    form.set("attribute1", attribute1);
    form.set("attribute2", attribute2);
    if (responseType) form.set("responseType", responseType);
    if (responseDueDate) form.set("responseDueDate", responseDueDate);
    form.set("toUserIds", JSON.stringify(to.map((p) => p.userId)));
    form.set("ccUserIds", JSON.stringify(cc.map((p) => p.userId)));
    form.set("removeAttachmentIds", JSON.stringify(removedAttachmentIds));
    form.set("documentReferenceIds", JSON.stringify(documentReferences.map((d) => d.id)));
    form.set("relatedMailIds", JSON.stringify(relatedMails.map((m) => m.id)));
    newFiles.forEach((f) => form.append("files", f));

    const res = await fetch("/api/mail/incoming", { method: "POST", body: form });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setError(data.error ?? "Failed to save incoming mail");
      setSubmitting(null);
      return;
    }

    if (action === "register") {
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
        <div className="flex items-center gap-2">
          <AttachDropdown
            onDocument={() => setAttachDocOpen(true)}
            onProjectMail={() => setAttachMailOpen(true)}
            onLocalFile={() => fileInputRef.current?.click()}
          />
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => setNewFiles((prev) => [...prev, ...Array.from(e.target.files ?? [])])}
          />
          <Button type="button" variant="ghost" size="sm" onClick={() => setPreview((v) => !v)}>
            <Eye size={14} />
            {preview ? "Back to edit" : "Preview"}
          </Button>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" disabled={submitting !== null} onClick={() => submit("draft")}>
            {submitting === "draft" ? "Saving..." : "Save To Draft"}
          </Button>
          <Button type="button" variant="primary" disabled={submitting !== null} onClick={() => submit("register")}>
            {submitting === "register" ? "Registering..." : "Register"}
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-[3px] border border-danger/30 bg-red-50 px-3 py-2 text-sm text-danger">
          {error}
        </div>
      )}

      {preview ? (
        <IncomingMailPreview
          typeName={selectedType?.name ?? "—"}
          sender={senderPerson}
          to={to}
          cc={cc}
          subject={subject}
          attribute1Label={selectedType?.attribute1Label}
          attribute1={attribute1}
          attribute2Label={selectedType?.attribute2Label}
          attribute2={attribute2}
          responseType={responseType || null}
          responseDueDate={responseDueDate}
          messageHtml={messageHtml}
          documentReferences={documentReferences}
          relatedMails={relatedMails}
          attachments={[...existingAttachments, ...newFiles.map((f) => ({ id: f.name, fileName: f.name, sizeBytes: f.size }))]}
        />
      ) : (
        <>
          <div className="mb-4 rounded-[3px] border border-border bg-white p-4">
            <label className={labelClass}>
              Type <span className="text-danger">*</span>
            </label>
            <div className="max-w-xs">
              <Select data-testid="type-select" value={typeId} onChange={(e) => setTypeId(e.target.value)}>
                <option value="">-- Select --</option>
                {mailTypes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="mb-4 flex flex-col gap-4 rounded-[3px] border border-border bg-white p-4">
            <RecipientPicker
              label="Sent From"
              projectId={projectId}
              selected={sender}
              onChange={setSender}
              onQueryChange={setSenderQuery}
              multiple={false}
              allowCreateGuest
              testId="sent-from-picker"
            />
            <RecipientPicker
              label="Sent To"
              projectId={projectId}
              selected={to}
              onChange={setTo}
              onQueryChange={setToQuery}
              testId="sent-to-picker"
            />
            <RecipientPicker
              label="Cc"
              projectId={projectId}
              selected={cc}
              onChange={setCc}
              onQueryChange={setCcQuery}
              testId="cc-picker"
            />

            <div className="flex items-center gap-3">
              <label className="text-xs font-medium text-text-secondary">Response Required</label>
              <div className="w-56">
                <Select
                  data-testid="response-type-select"
                  value={responseType}
                  onChange={(e) => setResponseType(e.target.value as MailResponseType | "")}
                >
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
                  <Input
                    type="date"
                    data-testid="response-due-date"
                    value={responseDueDate}
                    onChange={(e) => setResponseDueDate(e.target.value)}
                  />
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

          {(selectedType?.requiresAttribute1 ||
            selectedType?.requiresAttribute2 ||
            attribute1 ||
            attribute2) && (
            <div className="mb-4 rounded-[3px] border border-border bg-white">
              <SectionHeader
                actions={
                  <button
                    type="button"
                    onClick={() => setSelectAttributesOpen(true)}
                    disabled={!selectedType}
                    className="text-xs font-medium text-brand-700 hover:underline disabled:text-text-muted"
                  >
                    Select Attributes
                  </button>
                }
              >
                Attributes
              </SectionHeader>
              <div className="flex flex-col gap-3 p-4">
                {(selectedType?.attribute1Label || attribute1) && (
                  <div>
                    <label className={labelClass}>
                      {selectedType?.attribute1Label ?? "Attribute 1"}
                      {selectedType?.requiresAttribute1 && <span className="text-danger"> *</span>}
                    </label>
                    <Input value={attribute1} readOnly onClick={() => setSelectAttributesOpen(true)} />
                  </div>
                )}
                {(selectedType?.attribute2Label || attribute2) && (
                  <div>
                    <label className={labelClass}>
                      {selectedType?.attribute2Label ?? "Attribute 2"}
                      {selectedType?.requiresAttribute2 && <span className="text-danger"> *</span>}
                    </label>
                    <Input value={attribute2} readOnly onClick={() => setSelectAttributesOpen(true)} />
                  </div>
                )}
              </div>
            </div>
          )}

          {!selectedType?.requiresAttribute1 &&
            !selectedType?.requiresAttribute2 &&
            !attribute1 &&
            !attribute2 &&
            selectedType && (
              <div className="mb-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectAttributesOpen(true)}
                  className="text-xs font-medium text-brand-700 hover:underline"
                >
                  + Select Attributes
                </button>
              </div>
            )}

          <div className="mb-4">
            <RichTextEditor projectId={projectId} value={messageHtml} onChange={setMessageHtml} />
          </div>

          {(documentReferences.length > 0 || relatedMails.length > 0) && (
            <div className="mb-4 rounded-[3px] border border-border bg-white">
              <SectionHeader>Related Records</SectionHeader>
              <div className="flex flex-col gap-2 p-4">
                {documentReferences.map((d) => (
                  <div key={d.id} className="flex items-center justify-between text-[13px]">
                    <span className="flex items-center gap-1.5">
                      <Link2 size={13} className="text-text-muted" />
                      {d.documentNo} — {d.title} (Rev {d.revision})
                    </span>
                    <button
                      type="button"
                      onClick={() => setDocumentReferences((prev) => prev.filter((x) => x.id !== d.id))}
                      className="flex items-center gap-1 text-xs text-danger hover:underline"
                    >
                      <X size={12} />
                      Remove
                    </button>
                  </div>
                ))}
                {relatedMails.map((m) => (
                  <div key={m.id} className="flex items-center justify-between text-[13px]">
                    <span className="flex items-center gap-1.5">
                      <Link2 size={13} className="text-text-muted" />
                      {m.mailNumber} — {m.subject}
                    </span>
                    <button
                      type="button"
                      onClick={() => setRelatedMails((prev) => prev.filter((x) => x.id !== m.id))}
                      className="flex items-center gap-1 text-xs text-danger hover:underline"
                    >
                      <X size={12} />
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mb-4 rounded-[3px] border border-border bg-white">
            <SectionHeader>Attachments</SectionHeader>
            <div className="flex flex-col gap-2 p-4">
              {existingAttachments.map((a) => (
                <div key={a.id} className="flex items-center justify-between text-[13px]">
                  <span className="flex items-center gap-1.5">
                    <Paperclip size={13} className="text-text-muted" />
                    {a.fileName} <span className="text-text-muted">({Math.ceil(a.sizeBytes / 1024)} KB)</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => removeExistingAttachment(a.id)}
                    className="flex items-center gap-1 text-xs text-danger hover:underline"
                  >
                    <X size={12} />
                    Remove
                  </button>
                </div>
              ))}
              {newFiles.map((f, i) => (
                <div key={`${f.name}-${f.size}-${f.lastModified}`} className="flex items-center justify-between text-[13px]">
                  <span className="flex items-center gap-1.5">
                    <Paperclip size={13} className="text-text-muted" />
                    {f.name} <span className="text-text-muted">({Math.ceil(f.size / 1024)} KB)</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setNewFiles((prev) => prev.filter((_, idx) => idx !== i))}
                    className="flex items-center gap-1 text-xs text-danger hover:underline"
                  >
                    <X size={12} />
                    Remove
                  </button>
                </div>
              ))}
              {existingAttachments.length === 0 && newFiles.length === 0 && (
                <p className="text-[13px] text-text-muted">
                  No local files attached — use Attach {String.fromCharCode(8594)} Local File above.
                </p>
              )}
            </div>
          </div>
        </>
      )}

      <AttachDocumentModal
        open={attachDocOpen}
        onClose={() => setAttachDocOpen(false)}
        projectId={projectId}
        selected={documentReferences}
        onAdd={(doc) => setDocumentReferences((prev) => [...prev, doc])}
      />
      <AttachProjectMailModal
        open={attachMailOpen}
        onClose={() => setAttachMailOpen(false)}
        projectId={projectId}
        excludeId={draft?.id}
        selected={relatedMails}
        onAdd={(mail) => setRelatedMails((prev) => [...prev, mail])}
      />
      {selectedType && (
        <SelectAttributesModal
          open={selectAttributesOpen}
          onClose={() => setSelectAttributesOpen(false)}
          mailTypeId={selectedType.id}
          canAddValues={canManageAttributeOptions}
          slots={[
            { slot: 1, label: selectedType.attribute1Label ?? "Attribute 1", currentValue: attribute1 },
            { slot: 2, label: selectedType.attribute2Label ?? "Attribute 2", currentValue: attribute2 },
          ]}
          onConfirm={(values) => {
            setAttribute1(values[1]);
            setAttribute2(values[2]);
          }}
        />
      )}
    </div>
  );
}

function IncomingMailPreview({
  typeName,
  sender,
  to,
  cc,
  subject,
  attribute1Label,
  attribute1,
  attribute2Label,
  attribute2,
  responseType,
  responseDueDate,
  messageHtml,
  documentReferences,
  relatedMails,
  attachments,
}: {
  typeName: string;
  sender: DirectoryPerson | null;
  to: DirectoryPerson[];
  cc: DirectoryPerson[];
  subject: string;
  attribute1Label?: string | null;
  attribute1: string;
  attribute2Label?: string | null;
  attribute2: string;
  responseType: MailResponseType | null;
  responseDueDate: string;
  messageHtml: string;
  documentReferences: DocumentReference[];
  relatedMails: MailReference[];
  attachments: { id: string; fileName: string; sizeBytes: number }[];
}) {
  return (
    <div className="rounded-[3px] border border-border bg-white">
      <div className="border-b border-border px-4 py-3 text-xs text-text-muted">{typeName} · Incoming</div>
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-base font-semibold text-text-primary">{subject || "(No subject)"}</h2>
      </div>
      <div className="flex flex-col gap-2 border-b border-border px-4 py-3 text-[13px]">
        <PreviewRow label="Sent From" value={sender ? `${sender.name} - ${sender.organization}` : "—"} />
        <PreviewRow label="Sent To" value={to.map((p) => p.name).join(", ") || "—"} />
        {cc.length > 0 && <PreviewRow label="Cc" value={cc.map((p) => p.name).join(", ")} />}
        {responseType && (
          <PreviewRow
            label="Response"
            value={`${RESPONSE_TYPE_LABELS[responseType]} ${responseDueDate ? `— ${responseDueDate}` : ""}`}
          />
        )}
        {(attribute1Label || attribute1) && (
          <PreviewRow label={attribute1Label ?? "Attribute 1"} value={attribute1 || "—"} />
        )}
        {(attribute2Label || attribute2) && (
          <PreviewRow label={attribute2Label ?? "Attribute 2"} value={attribute2 || "—"} />
        )}
      </div>
      {(documentReferences.length > 0 || relatedMails.length > 0) && (
        <div className="flex flex-col gap-1 border-b border-border px-4 py-3 text-[13px]">
          {documentReferences.map((d) => (
            <PreviewRow key={d.id} label="Related Document" value={`${d.documentNo} — ${d.title}`} />
          ))}
          {relatedMails.map((m) => (
            <PreviewRow key={m.id} label="Related Mail" value={`${m.mailNumber} — ${m.subject}`} />
          ))}
        </div>
      )}
      {attachments.length > 0 && (
        <div className="flex flex-col gap-1 border-b border-border px-4 py-3 text-[13px]">
          {attachments.map((a) => (
            <PreviewRow key={a.id} label="Attachment" value={a.fileName} />
          ))}
        </div>
      )}
      <div className="px-4 py-3">
        <MailRichContent html={messageHtml} />
      </div>
    </div>
  );
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="w-28 shrink-0 text-text-muted">{label}</span>
      <span className="text-text-primary">{value}</span>
    </div>
  );
}
