"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { AlertCircle, UploadCloud } from "@/components/ui/icons";

export function ReplaceVersionButton({ documentId, currentRevision }: { documentId: string; currentRevision: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [revision, setRevision] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!revision.trim()) {
      setError("A new revision number is required.");
      return;
    }
    if (!file) {
      setError("Select the replacement file.");
      return;
    }
    setError(null);
    setSubmitting(true);
    const form = new FormData();
    form.set("revision", revision);
    form.set("notes", notes);
    form.set("file", file);
    const res = await fetch(`/api/management-system/documents/${documentId}/versions`, { method: "POST", body: form });
    const body = await res.json().catch(() => ({}));
    setSubmitting(false);
    if (!res.ok) {
      setError(body.error ?? "Failed to replace the version.");
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <UploadCloud size={13} />
        Replace Version
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Replace Controlled Document Version">
        <div className="flex flex-col gap-3">
          {error && (
            <div className="flex items-start gap-2 rounded-[3px] border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
              <AlertCircle size={15} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <p className="text-[12px] text-text-muted">Current revision: {currentRevision}. The previous version is preserved in history, never overwritten.</p>
          <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
            New Revision *
            <Input value={revision} onChange={(e) => setRevision(e.target.value)} placeholder="e.g. 02" />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
            Replacement File *
            <input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="rounded-[3px] border border-border bg-white px-2.5 py-1.5 text-[13px] text-text-primary"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
            Notes
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Reason for this revision (optional)" />
          </label>
          <Button type="button" variant="primary" onClick={submit} disabled={submitting} className="self-start">
            {submitting ? "Uploading…" : "Replace Version"}
          </Button>
        </div>
      </Modal>
    </>
  );
}
