"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle, FileCheck2 } from "@/components/ui/icons";

export function RegisterAsDocumentModal({
  temporaryFileId,
  fileName,
  documentTypeNames,
  suggestedTitle,
  onRegistered,
}: {
  temporaryFileId: string;
  fileName: string;
  documentTypeNames: string[];
  suggestedTitle: string;
  onRegistered?: (documentId: string) => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [documentNo, setDocumentNo] = useState("");
  const [title, setTitle] = useState(suggestedTitle);
  const [revision, setRevision] = useState("R1");
  const [typeName, setTypeName] = useState("");
  const [discipline, setDiscipline] = useState("");
  const [description, setDescription] = useState("");

  async function submit() {
    setError(null);
    if (!documentNo.trim() || !title.trim() || !revision.trim()) {
      setError("Document Number, Title, and Revision are required.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/temporary-files/${temporaryFileId}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentNo, title, revision, typeName, discipline, description }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error ?? "Failed to register the document.");
        setSubmitting(false);
        return;
      }
      setOpen(false);
      setSubmitting(false);
      onRegistered?.(body.id);
      router.refresh();
    } catch {
      setError("Network error while registering the document. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <>
      <Button type="button" variant="primary" size="sm" onClick={() => setOpen(true)}>
        <FileCheck2 size={13} />
        Register as Document
      </Button>
      <Modal open={open} onClose={() => !submitting && setOpen(false)} title="Register as Document" width="max-w-lg">
        <div className="flex flex-col gap-3">
          <p className="text-xs text-text-secondary">
            Creating an official document from <span className="font-medium text-text-primary">{fileName}</span>.
            The original file will be reused — nothing is re-uploaded.
          </p>

          {error && (
            <div className="flex items-start gap-2 rounded-[3px] border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
              <AlertCircle size={15} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
            Document Number *
            <Input value={documentNo} onChange={(e) => setDocumentNo(e.target.value)} placeholder="e.g. STFC-DRG-001" />
          </label>

          <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
            Title *
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
              Revision *
              <Input value={revision} onChange={(e) => setRevision(e.target.value)} placeholder="e.g. R1" />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
              Discipline
              <Input value={discipline} onChange={(e) => setDiscipline(e.target.value)} placeholder="e.g. Architectural" />
            </label>
          </div>

          <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
            Document Type
            <Input
              value={typeName}
              onChange={(e) => setTypeName(e.target.value)}
              list="document-type-options"
              placeholder="e.g. Shop Drawing"
            />
            <datalist id="document-type-options">
              {documentTypeNames.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
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
            <Button type="button" variant="secondary" onClick={() => setOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="button" variant="primary" onClick={submit} disabled={submitting}>
              {submitting ? "Registering..." : "Register Document"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
