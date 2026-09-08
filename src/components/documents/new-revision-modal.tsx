"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UploadCloud, AlertCircle, GitBranch } from "@/components/ui/icons";
import { ACCEPT_ATTRIBUTE, formatBytes } from "@/lib/files/file-types";

/** Controlled modal — mount it wherever, its visibility is entirely driven
 * by `open`/`onClose` so it survives an ancestor (e.g. a dropdown menu)
 * unmounting after the trigger is clicked. */
export function NewRevisionModal({
  documentId,
  suggestedRevision,
  open,
  onClose,
}: {
  documentId: string;
  suggestedRevision: string;
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [revision, setRevision] = useState(suggestedRevision);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [percent, setPercent] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  function close() {
    if (uploading) return;
    onClose();
    setFile(null);
    setError(null);
    setPercent(0);
  }

  function submit() {
    if (!file) {
      setError("Please select a file for this revision.");
      return;
    }
    if (!revision.trim()) {
      setError("Revision is required.");
      return;
    }
    setError(null);
    setUploading(true);

    const formData = new FormData();
    formData.append("revision", revision);
    formData.append("notes", notes);
    formData.append("file", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `/api/documents/${documentId}/revisions`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) setPercent(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      let body: unknown = null;
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        // handled generically below
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        onClose();
        setFile(null);
        setUploading(false);
        router.refresh();
      } else {
        const message =
          body && typeof body === "object" && "error" in body
            ? String((body as { error: unknown }).error)
            : "Failed to add the revision. Please try again.";
        setError(message);
        setUploading(false);
      }
    };
    xhr.onerror = () => {
      setError("Network error while uploading. Please try again.");
      setUploading(false);
    };
    xhr.send(formData);
  }

  return (
    <Modal open={open} onClose={close} title="Create New Revision" width="max-w-lg">
      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
          Revision *
          <Input value={revision} onChange={(e) => setRevision(e.target.value)} placeholder="e.g. R2" />
        </label>

        <div
          onClick={() => !uploading && inputRef.current?.click()}
          className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[3px] border-2 border-dashed border-border bg-white px-6 py-8 text-center hover:bg-brand-50/40"
        >
          <UploadCloud size={22} strokeWidth={1.25} className="text-text-muted" />
          <p className="text-[13px] font-medium text-text-primary">
            {file ? file.name : "Select the new revision's file"}
          </p>
          {file && <p className="text-xs text-text-secondary">{formatBytes(file.size)}</p>}
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT_ATTRIBUTE}
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </div>

        <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
          Notes
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full rounded-[3px] border border-border bg-white px-2.5 py-1.5 text-[13px] text-text-primary outline-none placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent"
          />
        </label>

        {error && (
          <div className="flex items-start gap-2 rounded-[3px] border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
            <AlertCircle size={15} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {uploading && (
          <div className="rounded-[3px] border border-border bg-white p-3">
            <p className="mb-1.5 text-[13px] text-text-secondary">Uploading… {percent}%</p>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-brand-100">
              <div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${percent}%` }} />
            </div>
          </div>
        )}

        <div className="mt-1 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={close} disabled={uploading}>
            Cancel
          </Button>
          <Button type="button" variant="primary" onClick={submit} disabled={uploading}>
            {uploading ? "Uploading..." : "Create Revision"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/** Self-contained convenience wrapper: renders its own trigger button and
 * manages the open state — use this outside of dropdown menus. */
export function NewRevisionButton({
  documentId,
  suggestedRevision,
}: {
  documentId: string;
  suggestedRevision: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
        <GitBranch size={14} />
        Create New Revision
      </Button>
      <NewRevisionModal documentId={documentId} suggestedRevision={suggestedRevision} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
