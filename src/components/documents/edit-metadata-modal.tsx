"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { AlertCircle, Pencil } from "@/components/ui/icons";
import { DOCUMENT_STATUS_OPTIONS, DISCIPLINE_OPTIONS } from "@/lib/documents/status";
import type { DocumentStatus } from "@prisma/client";

export type DocumentMetadataInitial = {
  title: string;
  typeName: string;
  discipline: string;
  status: DocumentStatus;
  description: string;
};

/** Controlled modal — see NewRevisionModal for why this doesn't own a
 * trigger button or its own open state. */
export function EditMetadataModal({
  documentId,
  initial,
  documentTypeNames,
  open,
  onClose,
}: {
  documentId: string;
  initial: DocumentMetadataInitial;
  documentTypeNames: string[];
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState(initial.title);
  const [typeName, setTypeName] = useState(initial.typeName);
  const [discipline, setDiscipline] = useState(initial.discipline);
  const [status, setStatus] = useState<DocumentStatus>(initial.status);
  const [description, setDescription] = useState(initial.description);

  async function submit() {
    if (!title.trim()) {
      setError("Title cannot be empty.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/documents/${documentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, typeName, discipline, status, description }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error ?? "Failed to update the document.");
        setSubmitting(false);
        return;
      }
      onClose();
      setSubmitting(false);
      router.refresh();
    } catch {
      setError("Network error while saving. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={() => !submitting && onClose()} title="Edit Document Metadata" width="max-w-lg">
      <div className="flex flex-col gap-3">
        {error && (
          <div className="flex items-start gap-2 rounded-[3px] border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
            <AlertCircle size={15} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
          Title *
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
            Document Type
            <Input value={typeName} onChange={(e) => setTypeName(e.target.value)} list="edit-document-type-options" />
            <datalist id="edit-document-type-options">
              {documentTypeNames.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
            Discipline
            <Input value={discipline} onChange={(e) => setDiscipline(e.target.value)} list="edit-discipline-options" />
            <datalist id="edit-discipline-options">
              {DISCIPLINE_OPTIONS.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </label>
        </div>

        <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
          Status
          <Select value={status} onChange={(e) => setStatus(e.target.value as DocumentStatus)}>
            {DOCUMENT_STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
        </label>

        <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
          Description
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full rounded-[3px] border border-border bg-white px-2.5 py-1.5 text-[13px] text-text-primary outline-none placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent"
          />
        </label>

        <div className="mt-1 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => onClose()} disabled={submitting}>
            Cancel
          </Button>
          <Button type="button" variant="primary" onClick={submit} disabled={submitting}>
            {submitting ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/** Self-contained convenience wrapper for use outside of dropdown menus. */
export function EditMetadataButton({
  documentId,
  initial,
  documentTypeNames,
}: {
  documentId: string;
  initial: DocumentMetadataInitial;
  documentTypeNames: string[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
        <Pencil size={14} />
        Edit Metadata
      </Button>
      <EditMetadataModal documentId={documentId} initial={initial} documentTypeNames={documentTypeNames} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
