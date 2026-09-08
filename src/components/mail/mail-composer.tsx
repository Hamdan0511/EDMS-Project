"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { RecipientPicker, type DirectoryPerson } from "./recipient-picker";
import { RichTextEditor } from "./editor/rich-text-editor";
import { MailRichContent } from "./mail-rich-content";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SectionHeader } from "@/components/ui/section-header";
import { Paperclip, Eye, X } from "@/components/ui/icons";

type MailType = {
  id: string;
  name: string;
  attribute1Label: string | null;
  attribute2Label: string | null;
  requiresAttribute1: boolean;
  requiresAttribute2: boolean;
};

type DraftData = {
  id: string;
  typeId: string;
  subject: string;
  messageHtml: string;
  attribute1: string | null;
  attribute2: string | null;
  responseRequired: boolean;
  responseDueDate: string;
  to: DirectoryPerson[];
  cc: DirectoryPerson[];
  attachments: { id: string; fileName: string; sizeBytes: number }[];
  parentMailId: string | null;
};

export type PrefillData = {
  to: DirectoryPerson[];
  cc: DirectoryPerson[];
  subject: string;
  typeId: string;
  parentMailId: string;
  parentMailNumber: string;
  forwardAttachments: { id: string; fileName: string; sizeBytes: number }[];
  contextLabel: string;
  initialMessageHtml: string;
};

export function MailComposer({
  projectId,
  mailTypes,
  draft,
  initialTypeId,
  prefill,
}: {
  projectId: string;
  mailTypes: MailType[];
  draft: DraftData | null;
  initialTypeId?: string;
  prefill?: PrefillData | null;
}) {
  const router = useRouter();

  const [typeId, setTypeId] = useState(draft?.typeId ?? initialTypeId ?? prefill?.typeId ?? "");
  const [subject, setSubject] = useState(draft?.subject ?? prefill?.subject ?? "");
  const [messageHtml, setMessageHtml] = useState(draft?.messageHtml ?? prefill?.initialMessageHtml ?? "");
  const [attribute1, setAttribute1] = useState(draft?.attribute1 ?? "");
  const [attribute2, setAttribute2] = useState(draft?.attribute2 ?? "");
  const [responseRequired, setResponseRequired] = useState(draft?.responseRequired ?? false);
  const [responseDueDate, setResponseDueDate] = useState(draft?.responseDueDate ?? "");
  const [to, setTo] = useState<DirectoryPerson[]>(draft?.to ?? prefill?.to ?? []);
  const [cc, setCc] = useState<DirectoryPerson[]>(draft?.cc ?? prefill?.cc ?? []);
  const [toQuery, setToQuery] = useState("");
  const [ccQuery, setCcQuery] = useState("");
  const [existingAttachments, setExistingAttachments] = useState(draft?.attachments ?? []);
  const [removedAttachmentIds, setRemovedAttachmentIds] = useState<string[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<"draft" | "send" | null>(null);
  const [preview, setPreview] = useState(false);

  const parentMailId = draft?.parentMailId ?? prefill?.parentMailId ?? null;
  const forwardAttachments = draft ? [] : (prefill?.forwardAttachments ?? []);

  const selectedType = useMemo(
    () => mailTypes.find((t) => t.id === typeId) ?? null,
    [mailTypes, typeId],
  );

  function removeExistingAttachment(id: string) {
    setExistingAttachments((prev) => prev.filter((a) => a.id !== id));
    setRemovedAttachmentIds((prev) => [...prev, id]);
  }

  async function submit(action: "draft" | "send") {
    setError(null);

    if (!typeId) {
      setError("Type is required");
      return;
    }
    if (!subject.trim()) {
      setError("Subject is required");
      return;
    }
    // Typing a name is not the same as selecting it — catch orphaned
    // search text before it's silently dropped on save/send.
    if (toQuery.trim() || ccQuery.trim()) {
      const field = toQuery.trim() ? "To" : "Cc";
      setError(
        `You typed a name in the ${field} field but haven't selected it from the directory. ` +
          `Click a matching contact in the dropdown, or press Enter to pick the highlighted match.`,
      );
      return;
    }
    if (action === "send" && to.length === 0) {
      setError("At least one recipient in To is required to send");
      return;
    }

    setSubmitting(action);

    const form = new FormData();
    form.set("projectId", projectId);
    form.set("action", action);
    if (draft) form.set("mailId", draft.id);
    form.set("typeId", typeId);
    form.set("subject", subject);
    form.set("messageHtml", messageHtml);
    form.set("attribute1", attribute1);
    form.set("attribute2", attribute2);
    form.set("responseRequired", String(responseRequired));
    if (responseDueDate) form.set("responseDueDate", responseDueDate);
    form.set("toUserIds", JSON.stringify(to.map((p) => p.userId)));
    form.set("ccUserIds", JSON.stringify(cc.map((p) => p.userId)));
    form.set("removeAttachmentIds", JSON.stringify(removedAttachmentIds));
    if (parentMailId) form.set("parentMailId", parentMailId);
    if (forwardAttachments.length > 0) {
      form.set("forwardAttachmentIds", JSON.stringify(forwardAttachments.map((a) => a.id)));
    }
    newFiles.forEach((f) => form.append("files", f));

    const res = await fetch("/api/mail", { method: "POST", body: form });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setError(data.error ?? "Failed to save mail");
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
      {/* Toolbar */}
      <div className="mb-4 flex items-center justify-between rounded-[3px] border border-border bg-white px-3 py-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setPreview((v) => !v)}
        >
          <Eye size={14} />
          {preview ? "Back to edit" : "Preview"}
        </Button>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={submitting !== null}
            onClick={() => submit("draft")}
          >
            {submitting === "draft" ? "Saving..." : "Save To Draft"}
          </Button>
          <Button
            type="button"
            variant="primary"
            disabled={submitting !== null}
            onClick={() => submit("send")}
          >
            {submitting === "send" ? "Sending..." : "Send"}
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-[3px] border border-danger/30 bg-red-50 px-3 py-2 text-sm text-danger">
          {error}
        </div>
      )}

      {!draft && prefill?.contextLabel && (
        <div className="mb-4 rounded-[3px] border border-brand-200 bg-brand-50 px-3 py-2 text-xs text-brand-800">
          {prefill.contextLabel}
        </div>
      )}

      {preview ? (
        <MailPreview
          typeName={selectedType?.name ?? "—"}
          to={to}
          cc={cc}
          subject={subject}
          attribute1Label={selectedType?.attribute1Label}
          attribute1={attribute1}
          attribute2Label={selectedType?.attribute2Label}
          attribute2={attribute2}
          messageHtml={messageHtml}
        />
      ) : (
        <>
          <div className="mb-4 rounded-[3px] border border-border bg-white p-4">
            <label className={labelClass}>
              Type <span className="text-danger">*</span>
            </label>
            <div className="max-w-xs">
              <Select name="typeId" value={typeId} onChange={(e) => setTypeId(e.target.value)}>
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
              label="To"
              projectId={projectId}
              selected={to}
              onChange={setTo}
              onQueryChange={setToQuery}
              testId="to-picker"
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
              <div className="w-32">
                <Select
                  value={responseRequired ? "yes" : "no"}
                  onChange={(e) => setResponseRequired(e.target.value === "yes")}
                >
                  <option value="no">-- Select --</option>
                  <option value="yes">Yes</option>
                </Select>
              </div>
              {responseRequired && (
                <div className="w-40">
                  <Input
                    type="date"
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
              <Input name="subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
            </div>
          </div>

          {(selectedType?.requiresAttribute1 ||
            selectedType?.requiresAttribute2 ||
            attribute1 ||
            attribute2) && (
            <div className="mb-4 rounded-[3px] border border-border bg-white">
              <SectionHeader>Attributes</SectionHeader>
              <div className="flex flex-col gap-3 p-4">
                {(selectedType?.attribute1Label || attribute1) && (
                  <div>
                    <label className={labelClass}>
                      {selectedType?.attribute1Label ?? "Attribute 1"}
                    </label>
                    <Input value={attribute1} onChange={(e) => setAttribute1(e.target.value)} />
                  </div>
                )}
                {(selectedType?.attribute2Label || attribute2) && (
                  <div>
                    <label className={labelClass}>
                      {selectedType?.attribute2Label ?? "Attribute 2"}
                    </label>
                    <Input value={attribute2} onChange={(e) => setAttribute2(e.target.value)} />
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="mb-4">
            <RichTextEditor projectId={projectId} value={messageHtml} onChange={setMessageHtml} />
          </div>

          <div className="mb-4 rounded-[3px] border border-border bg-white">
            <SectionHeader>Attachments</SectionHeader>
            <div className="flex flex-col gap-2 p-4">
              {forwardAttachments.map((a) => (
                <div key={`fwd-${a.id}`} className="flex items-center justify-between text-[13px]">
                  <span className="flex items-center gap-1.5">
                    <Paperclip size={13} className="text-text-muted" />
                    {a.fileName}{" "}
                    <span className="text-text-muted">
                      ({Math.ceil(a.sizeBytes / 1024)} KB) — forwarded
                    </span>
                  </span>
                </div>
              ))}
              {existingAttachments.map((a) => (
                <div key={a.id} className="flex items-center justify-between text-[13px]">
                  <span className="flex items-center gap-1.5">
                    <Paperclip size={13} className="text-text-muted" />
                    {a.fileName}{" "}
                    <span className="text-text-muted">({Math.ceil(a.sizeBytes / 1024)} KB)</span>
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
              <label className="mt-1 inline-flex w-fit cursor-pointer items-center gap-1.5 rounded-[3px] border border-border bg-white px-2.5 py-1.5 text-xs font-medium text-text-primary hover:bg-brand-50">
                <Paperclip size={13} />
                Add files
                <input
                  type="file"
                  multiple
                  onChange={(e) =>
                    setNewFiles((prev) => [...prev, ...Array.from(e.target.files ?? [])])
                  }
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function MailPreview({
  typeName,
  to,
  cc,
  subject,
  attribute1Label,
  attribute1,
  attribute2Label,
  attribute2,
  messageHtml,
}: {
  typeName: string;
  to: DirectoryPerson[];
  cc: DirectoryPerson[];
  subject: string;
  attribute1Label?: string | null;
  attribute1: string;
  attribute2Label?: string | null;
  attribute2: string;
  messageHtml: string;
}) {
  return (
    <div className="rounded-[3px] border border-border bg-white">
      <div className="border-b border-border px-4 py-3 text-xs text-text-muted">{typeName}</div>
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-base font-semibold text-text-primary">{subject || "(No subject)"}</h2>
      </div>
      <div className="flex flex-col gap-2 border-b border-border px-4 py-3 text-[13px]">
        <PreviewRow label="To" value={to.map((p) => p.name).join(", ") || "—"} />
        {cc.length > 0 && <PreviewRow label="Cc" value={cc.map((p) => p.name).join(", ")} />}
        {(attribute1Label || attribute1) && (
          <PreviewRow label={attribute1Label ?? "Attribute 1"} value={attribute1 || "—"} />
        )}
        {(attribute2Label || attribute2) && (
          <PreviewRow label={attribute2Label ?? "Attribute 2"} value={attribute2 || "—"} />
        )}
      </div>
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
