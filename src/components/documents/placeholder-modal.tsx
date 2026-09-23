"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle, Search, UploadCloud } from "@/components/ui/icons";
import { ACCEPT_ATTRIBUTE, formatBytes } from "@/lib/files/file-types";
import type { DocumentReference } from "@/components/mail/incoming/attach-document-modal";

type Mode = "create" | "complete";

/** A placeholder is a real, registered Document — reserved number, title,
 * type, metadata — with no uploaded file yet. Completing one uploads its
 * first revision, which flips isPlaceholder off automatically. */
export function PlaceholderModal({
  projectId,
  documentTypeNames,
  registerScope,
  open,
  onClose,
}: {
  projectId: string;
  documentTypeNames: string[];
  /** Which register this modal was opened from — restricts "Complete a
   * Placeholder" search to that register's placeholders. */
  registerScope: "STANDALONE_DOCUMENT" | "DRAWING";
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("create");

  const [documentNo, setDocumentNo] = useState("");
  const [title, setTitle] = useState("");
  const [typeName, setTypeName] = useState("");
  const [discipline, setDiscipline] = useState("");
  const [description, setDescription] = useState("");

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<(DocumentReference & { isPlaceholder?: boolean })[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<DocumentReference | null>(null);
  const [completeRevision, setCompleteRevision] = useState("R0");
  const [completeFile, setCompleteFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setMode("create");
    setDocumentNo("");
    setTitle("");
    setTypeName("");
    setDiscipline("");
    setDescription("");
    setQuery("");
    setResults([]);
    setSelectedDoc(null);
    setCompleteRevision("R0");
    setCompleteFile(null);
    setError(null);
    setSubmitting(false);
  }

  function close() {
    if (submitting) return;
    onClose();
    reset();
  }

  async function searchPlaceholders(q: string) {
    setQuery(q);
    const res = await fetch(
      `/api/documents/search?projectId=${projectId}&q=${encodeURIComponent(q)}&placeholdersOnly=1&registerScope=${registerScope}`,
    ).catch(() => null);
    if (res?.ok) setResults(await res.json());
  }

  async function submitCreate() {
    if (!documentNo.trim() || !title.trim()) {
      setError("Document Number and Title are required.");
      return;
    }
    setError(null);
    setSubmitting(true);
    const res = await fetch("/api/documents/placeholders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, documentNo, title, typeName, discipline, description }),
    });
    const body = await res.json().catch(() => ({}));
    setSubmitting(false);
    if (!res.ok) {
      setError(body.error ?? "Failed to create the placeholder.");
      return;
    }
    close();
    router.refresh();
  }

  async function submitComplete() {
    if (!selectedDoc) return;
    if (!completeFile) {
      setError("Please select a file to complete this placeholder.");
      return;
    }
    setError(null);
    setSubmitting(true);
    const formData = new FormData();
    formData.append("revision", completeRevision);
    formData.append("file", completeFile);
    const res = await fetch(`/api/documents/${selectedDoc.id}/revisions`, { method: "POST", body: formData });
    const body = await res.json().catch(() => ({}));
    setSubmitting(false);
    if (!res.ok) {
      setError(body.error ?? "Failed to complete the placeholder.");
      return;
    }
    close();
    router.refresh();
  }

  return (
    <Modal open={open} onClose={close} title="Add or Update Placeholders" width="max-w-lg">
      <div className="flex flex-col gap-3">
        <div className="flex gap-2 border-b border-border pb-3">
          <Button type="button" variant={mode === "create" ? "primary" : "secondary"} size="sm" onClick={() => setMode("create")}>
            New Placeholder
          </Button>
          <Button type="button" variant={mode === "complete" ? "primary" : "secondary"} size="sm" onClick={() => setMode("complete")}>
            Complete a Placeholder
          </Button>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-[3px] border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
            <AlertCircle size={15} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {mode === "create" && (
          <>
            <p className="text-xs text-text-secondary">
              Reserves a document number and metadata with no file yet — clearly shown as a placeholder in the
              register until a file is uploaded against it.
            </p>
            <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
              Document Number *
              <Input value={documentNo} onChange={(e) => setDocumentNo(e.target.value)} placeholder="e.g. STFC-ARC-DR-000200" />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
              Title *
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
                Document Type
                <Input value={typeName} onChange={(e) => setTypeName(e.target.value)} list="placeholder-type-options" />
                <datalist id="placeholder-type-options">
                  {documentTypeNames.map((name) => (
                    <option key={name} value={name} />
                  ))}
                </datalist>
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
                Discipline
                <Input value={discipline} onChange={(e) => setDiscipline(e.target.value)} />
              </label>
            </div>
            <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
              Description
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full rounded-[3px] border border-border bg-white px-2.5 py-1.5 text-[13px] text-text-primary outline-none focus:border-accent focus:ring-1 focus:ring-accent"
              />
            </label>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={close}>
                Cancel
              </Button>
              <Button type="button" variant="primary" onClick={submitCreate} disabled={submitting}>
                {submitting ? "Creating..." : "Create Placeholder"}
              </Button>
            </div>
          </>
        )}

        {mode === "complete" && !selectedDoc && (
          <>
            <div className="relative">
              <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
              <Input
                className="pl-8"
                placeholder="Search placeholders by document number or title…"
                value={query}
                onChange={(e) => searchPlaceholders(e.target.value)}
                autoFocus
              />
            </div>
            <div className="max-h-72 overflow-y-auto rounded-[3px] border border-border">
              {results.length === 0 && <p className="p-3 text-[13px] text-text-muted">Search for a placeholder to complete.</p>}
              {results.map((doc) => (
                <button
                  type="button"
                  key={doc.id}
                  onClick={() => setSelectedDoc(doc)}
                  className="flex w-full flex-col items-start border-b border-border px-3 py-2 text-left text-[13px] last:border-b-0 hover:bg-brand-50"
                >
                  <span className="font-medium text-text-primary">{doc.documentNo}</span>
                  <span className="text-xs text-text-secondary">{doc.title}</span>
                </button>
              ))}
            </div>
            <div className="flex justify-end">
              <Button type="button" variant="secondary" onClick={close}>
                Cancel
              </Button>
            </div>
          </>
        )}

        {mode === "complete" && selectedDoc && (
          <>
            <p className="text-xs text-text-secondary">
              Completing{" "}
              <span className="font-medium text-text-primary">
                {selectedDoc.documentNo} — {selectedDoc.title}
              </span>
              .
            </p>
            <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
              Revision *
              <Input value={completeRevision} onChange={(e) => setCompleteRevision(e.target.value)} />
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[3px] border-2 border-dashed border-border bg-white px-6 py-8 text-center hover:bg-brand-50/40"
            >
              <UploadCloud size={22} strokeWidth={1.25} className="text-text-muted" />
              <p className="text-[13px] font-medium text-text-primary">{completeFile ? completeFile.name : "Select the file"}</p>
              {completeFile && <p className="text-xs text-text-secondary">{formatBytes(completeFile.size)}</p>}
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPT_ATTRIBUTE}
                className="hidden"
                onChange={(e) => setCompleteFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setSelectedDoc(null)} disabled={submitting}>
                Back
              </Button>
              <Button type="button" variant="primary" onClick={submitComplete} disabled={submitting}>
                {submitting ? "Uploading..." : "Complete Placeholder"}
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
