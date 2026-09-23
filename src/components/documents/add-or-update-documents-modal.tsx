"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { UploadCloud, AlertCircle, Search } from "@/components/ui/icons";
import { ACCEPT_ATTRIBUTE, formatBytes } from "@/lib/files/file-types";
import { DOCUMENT_REVIEW_STATUS_OPTIONS } from "@/lib/documents/status";
import type { DocumentReviewStatus } from "@prisma/client";
import type { DocumentReference } from "@/components/mail/incoming/attach-document-modal";

type Mode = "new" | "update";
type NewPhase = "select-file" | "metadata";
type UpdatePhase = "search" | "revision";

/**
 * A single guided flow for "Add or Update Documents": for a brand-new
 * document it still performs the real Temporary-File-then-Register steps
 * this app's EDMS lifecycle requires (never skipped), just presented as one
 * seamless wizard. For updating an existing document it searches the real
 * Document Register, then reuses the same revision-upload endpoint the
 * per-row "Create New Revision" action uses.
 */
export function AddOrUpdateDocumentsModal({
  projectId,
  documentTypeNames,
  disciplineOptions,
  functionalBreakdownOptions,
  spatialBreakdownOptions,
  registerScope,
  open,
  onClose,
}: {
  projectId: string;
  documentTypeNames: string[];
  disciplineOptions: string[];
  functionalBreakdownOptions: string[];
  spatialBreakdownOptions: string[];
  /** Which register this modal was opened from — restricts "Update Existing
   * Document" search so a Document Register user can't accidentally update
   * a drawing (and vice versa). */
  registerScope: "STANDALONE_DOCUMENT" | "DRAWING";
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("new");

  // New document state
  const [newPhase, setNewPhase] = useState<NewPhase>("select-file");
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [documentNo, setDocumentNo] = useState("");
  const [title, setTitle] = useState("");
  const [revision, setRevision] = useState("R0");
  const [typeName, setTypeName] = useState("");
  const [discipline, setDiscipline] = useState("");
  const [functionalBreakdown, setFunctionalBreakdown] = useState("");
  const [spatialBreakdown, setSpatialBreakdown] = useState("");
  const [reviewStatus, setReviewStatus] = useState<DocumentReviewStatus | "">("");
  const [description, setDescription] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Update existing document state
  const [updatePhase, setUpdatePhase] = useState<UpdatePhase>("search");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<DocumentReference[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<DocumentReference | null>(null);
  const [updateRevision, setUpdateRevision] = useState("");
  const [updateFile, setUpdateFile] = useState<File | null>(null);
  const updateFileInputRef = useRef<HTMLInputElement>(null);

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setMode("new");
    setNewPhase("select-file");
    setFile(null);
    setDocumentNo("");
    setTitle("");
    setRevision("R0");
    setTypeName("");
    setDiscipline("");
    setFunctionalBreakdown("");
    setSpatialBreakdown("");
    setReviewStatus("");
    setDescription("");
    setUpdatePhase("search");
    setQuery("");
    setResults([]);
    setSelectedDoc(null);
    setUpdateRevision("");
    setUpdateFile(null);
    setError(null);
    setSubmitting(false);
  }

  function close() {
    if (submitting) return;
    onClose();
    reset();
  }

  function validateAndSetFile(candidate: File | undefined | null) {
    if (!candidate) return;
    setFile(candidate);
    setTitle((prev) => prev || candidate.name.replace(/\.[^.]+$/, ""));
  }

  async function searchDocuments(q: string) {
    setQuery(q);
    const res = await fetch(
      `/api/documents/search?projectId=${projectId}&q=${encodeURIComponent(q)}&registerScope=${registerScope}`,
    ).catch(() => null);
    if (res?.ok) setResults(await res.json());
  }

  async function submitNewDocument() {
    if (!file) return;
    if (!documentNo.trim() || !title.trim() || !revision.trim()) {
      setError("Document Number, Title, and Revision are required.");
      return;
    }
    setError(null);
    setSubmitting(true);

    const formData = new FormData();
    formData.append("projectId", projectId);
    formData.append("file", file);
    const uploadRes = await fetch("/api/temporary-files", { method: "POST", body: formData });
    const uploadBody = await uploadRes.json().catch(() => ({}));
    if (!uploadRes.ok) {
      setError(uploadBody.error ?? "Failed to upload the file.");
      setSubmitting(false);
      return;
    }

    const registerRes = await fetch(`/api/temporary-files/${uploadBody.id}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        documentNo,
        title,
        revision,
        typeName,
        discipline,
        functionalBreakdown,
        spatialBreakdown,
        reviewStatus,
        description,
      }),
    });
    const registerBody = await registerRes.json().catch(() => ({}));
    setSubmitting(false);
    if (!registerRes.ok) {
      setError(registerBody.error ?? "Failed to register the document.");
      return;
    }
    close();
    router.refresh();
  }

  async function submitUpdateRevision() {
    if (!selectedDoc) return;
    if (!updateRevision.trim()) {
      setError("Revision is required.");
      return;
    }
    if (!updateFile) {
      setError("Please select a file for this revision.");
      return;
    }
    setError(null);
    setSubmitting(true);

    const formData = new FormData();
    formData.append("revision", updateRevision);
    formData.append("file", updateFile);
    const res = await fetch(`/api/documents/${selectedDoc.id}/revisions`, { method: "POST", body: formData });
    const body = await res.json().catch(() => ({}));
    setSubmitting(false);
    if (!res.ok) {
      setError(body.error ?? "Failed to add the revision.");
      return;
    }
    close();
    router.refresh();
  }

  return (
    <Modal open={open} onClose={close} title="Add or Update Documents" width="max-w-lg">
      <div className="flex flex-col gap-3">
        <div className="flex gap-2 border-b border-border pb-3">
          <Button type="button" variant={mode === "new" ? "primary" : "secondary"} size="sm" onClick={() => setMode("new")}>
            New Document
          </Button>
          <Button type="button" variant={mode === "update" ? "primary" : "secondary"} size="sm" onClick={() => setMode("update")}>
            Update Existing Document
          </Button>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-[3px] border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
            <AlertCircle size={15} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {mode === "new" && newPhase === "select-file" && (
          <>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                validateAndSetFile(e.dataTransfer.files[0]);
              }}
              onClick={() => inputRef.current?.click()}
              className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[3px] border-2 border-dashed px-6 py-10 text-center transition-colors ${
                dragOver ? "border-brand-600 bg-brand-50" : "border-border bg-white hover:bg-brand-50/40"
              }`}
            >
              <UploadCloud size={24} strokeWidth={1.25} className="text-text-muted" />
              <p className="text-[13px] font-medium text-text-primary">{file ? file.name : "Select a file or drop one here."}</p>
              {file && <p className="text-xs text-text-secondary">{formatBytes(file.size)}</p>}
              <input
                ref={inputRef}
                type="file"
                accept={ACCEPT_ATTRIBUTE}
                className="hidden"
                onChange={(e) => validateAndSetFile(e.target.files?.[0])}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={close}>
                Cancel
              </Button>
              <Button type="button" variant="primary" disabled={!file} onClick={() => setNewPhase("metadata")}>
                Next: Metadata
              </Button>
            </div>
          </>
        )}

        {mode === "new" && newPhase === "metadata" && (
          <>
            <p className="text-xs text-text-secondary">
              Creating a new document from <span className="font-medium text-text-primary">{file?.name}</span>.
            </p>
            <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
              Document Number *
              <Input value={documentNo} onChange={(e) => setDocumentNo(e.target.value)} placeholder="e.g. STFC-ARC-DR-000123" />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
              Title *
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
                Revision *
                <Input value={revision} onChange={(e) => setRevision(e.target.value)} />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
                Document Type
                <Input value={typeName} onChange={(e) => setTypeName(e.target.value)} placeholder="e.g. Shop Drawing" list="add-document-type-options" />
                <datalist id="add-document-type-options">
                  {documentTypeNames.map((name) => (
                    <option key={name} value={name} />
                  ))}
                </datalist>
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
                Discipline
                <Input value={discipline} onChange={(e) => setDiscipline(e.target.value)} list="add-discipline-options" />
                <datalist id="add-discipline-options">
                  {disciplineOptions.map((name) => (
                    <option key={name} value={name} />
                  ))}
                </datalist>
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
                Review Status
                <Select value={reviewStatus} onChange={(e) => setReviewStatus(e.target.value as DocumentReviewStatus | "")}>
                  <option value="">None</option>
                  {DOCUMENT_REVIEW_STATUS_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </Select>
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
                Functional Breakdown
                <Input
                  value={functionalBreakdown}
                  onChange={(e) => setFunctionalBreakdown(e.target.value)}
                  list="add-functional-breakdown-options"
                />
                <datalist id="add-functional-breakdown-options">
                  {functionalBreakdownOptions.map((name) => (
                    <option key={name} value={name} />
                  ))}
                </datalist>
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
                Spatial Breakdown
                <Input
                  value={spatialBreakdown}
                  onChange={(e) => setSpatialBreakdown(e.target.value)}
                  list="add-spatial-breakdown-options"
                />
                <datalist id="add-spatial-breakdown-options">
                  {spatialBreakdownOptions.map((name) => (
                    <option key={name} value={name} />
                  ))}
                </datalist>
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
              <Button type="button" variant="secondary" onClick={() => setNewPhase("select-file")} disabled={submitting}>
                Back
              </Button>
              <Button type="button" variant="primary" onClick={submitNewDocument} disabled={submitting}>
                {submitting ? "Creating..." : "Create Document"}
              </Button>
            </div>
          </>
        )}

        {mode === "update" && updatePhase === "search" && (
          <>
            <div className="relative">
              <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
              <Input
                className="pl-8"
                placeholder="Search by document number, title, or type…"
                value={query}
                onChange={(e) => searchDocuments(e.target.value)}
                autoFocus
              />
            </div>
            <div className="max-h-72 overflow-y-auto rounded-[3px] border border-border">
              {results.length === 0 && <p className="p-3 text-[13px] text-text-muted">Search for a document to update.</p>}
              {results.map((doc) => (
                <button
                  type="button"
                  key={doc.id}
                  onClick={() => {
                    setSelectedDoc(doc);
                    setUpdateRevision(nextRevisionGuess(doc.revision));
                    setUpdatePhase("revision");
                  }}
                  className="flex w-full flex-col items-start border-b border-border px-3 py-2 text-left text-[13px] last:border-b-0 hover:bg-brand-50"
                >
                  <span className="font-medium text-text-primary">
                    {doc.documentNo} — Rev {doc.revision}
                  </span>
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

        {mode === "update" && updatePhase === "revision" && selectedDoc && (
          <>
            <p className="text-xs text-text-secondary">
              Adding a new revision to{" "}
              <span className="font-medium text-text-primary">
                {selectedDoc.documentNo} — {selectedDoc.title}
              </span>{" "}
              (currently Rev {selectedDoc.revision}).
            </p>
            <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
              Revision *
              <Input value={updateRevision} onChange={(e) => setUpdateRevision(e.target.value)} />
            </label>
            <div
              onClick={() => updateFileInputRef.current?.click()}
              className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[3px] border-2 border-dashed border-border bg-white px-6 py-8 text-center hover:bg-brand-50/40"
            >
              <UploadCloud size={22} strokeWidth={1.25} className="text-text-muted" />
              <p className="text-[13px] font-medium text-text-primary">
                {updateFile ? updateFile.name : "Select the new revision's file"}
              </p>
              {updateFile && <p className="text-xs text-text-secondary">{formatBytes(updateFile.size)}</p>}
              <input
                ref={updateFileInputRef}
                type="file"
                accept={ACCEPT_ATTRIBUTE}
                className="hidden"
                onChange={(e) => setUpdateFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setUpdatePhase("search")} disabled={submitting}>
                Back
              </Button>
              <Button type="button" variant="primary" onClick={submitUpdateRevision} disabled={submitting}>
                {submitting ? "Uploading..." : "Create Revision"}
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

function nextRevisionGuess(current: string): string {
  const match = /^([A-Za-z]*)(\d+)$/.exec(current.trim());
  if (match) return `${match[1]}${Number(match[2]) + 1}`;
  return current;
}
