"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/table";
import { RegisterAsDocumentModal } from "@/components/documents/register-as-document-modal";
import { UploadCloud, FileText, Trash2, Download, AlertCircle, Scissors } from "@/components/ui/icons";

const MAX_SIZE_BYTES = 200 * 1024 * 1024;
const MAX_PAGES = 60;

type ResultFile = {
  id: string;
  originalFileName: string;
  sizeBytes: number;
  uploadedByName: string;
  uploadedAt: string;
  status: string;
};

type SplitResult = {
  originalFileName: string;
  pageCount: number;
  temporaryFiles: ResultFile[];
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function SplitPdfTool({ projectId }: { projectId: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<"idle" | "uploading" | "processing" | "done">("idle");
  const [uploadPercent, setUploadPercent] = useState(0);
  const [result, setResult] = useState<SplitResult | null>(null);
  const [removing, setRemoving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function validateAndSetFile(candidate: File | undefined | null) {
    setError(null);
    if (!candidate) return;
    if (!candidate.name.toLowerCase().endsWith(".pdf") && candidate.type !== "application/pdf") {
      setError("Only PDF files can be split. Please select a .pdf file.");
      setFile(null);
      return;
    }
    if (candidate.size > MAX_SIZE_BYTES) {
      setError("The file is too large. Maximum file size is 200MB.");
      setFile(null);
      return;
    }
    setFile(candidate);
  }

  function reset() {
    setFile(null);
    setResult(null);
    setError(null);
    setPhase("idle");
    setUploadPercent(0);
    if (inputRef.current) inputRef.current.value = "";
  }

  function submit() {
    if (!file) return;
    setError(null);
    setPhase("uploading");
    setUploadPercent(0);

    const formData = new FormData();
    formData.append("projectId", projectId);
    formData.append("file", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/documents/split-pdf");

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        setUploadPercent(Math.round((event.loaded / event.total) * 100));
        if (event.loaded >= event.total) setPhase("processing");
      }
    };

    xhr.onload = () => {
      let body: unknown = null;
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        // fall through to generic error below
      }
      if (xhr.status >= 200 && xhr.status < 300 && body) {
        setResult(body as SplitResult);
        setPhase("done");
      } else {
        const message =
          body && typeof body === "object" && "error" in body
            ? String((body as { error: unknown }).error)
            : "Failed to process the PDF. Please try again.";
        setError(message);
        setPhase("idle");
      }
    };

    xhr.onerror = () => {
      setError("Network error while uploading the file. Please try again.");
      setPhase("idle");
    };

    xhr.send(formData);
  }

  async function removeResult() {
    if (!result) return;
    if (
      !window.confirm(
        `Remove all ${result.temporaryFiles.length} split page(s) from Temporary Files? This cannot be undone.`,
      )
    ) {
      return;
    }
    setRemoving(true);
    const outcomes = await Promise.all(
      result.temporaryFiles.map((f) =>
        fetch(`/api/temporary-files/${f.id}`, { method: "DELETE" })
          .then((res) => res.ok)
          .catch(() => false),
      ),
    );
    setRemoving(false);
    const failedCount = outcomes.filter((ok) => !ok).length;
    if (failedCount > 0) {
      setError(
        `${failedCount} of ${outcomes.length} file(s) could not be removed — they may already be registered as documents.`,
      );
      return;
    }
    reset();
  }

  if (result) {
    return (
      <div className="max-w-4xl">
        <div className="mb-4 flex items-center justify-between rounded-[3px] border border-border bg-white p-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
              PDF Details
            </p>
            <p className="mt-1 text-[15px] font-medium text-text-primary">{result.originalFileName}</p>
            <p className="text-xs text-text-secondary">{result.pageCount} pages</p>
          </div>
          <Button variant="secondary" onClick={removeResult} disabled={removing}>
            <Trash2 size={14} />
            {removing ? "Removing..." : "Remove"}
          </Button>
        </div>

        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-[3px] border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
            <AlertCircle size={15} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <p className="mb-3 text-[13px] text-text-secondary">
          These pages have been saved as Temporary Files — they are not yet part of the Document
          Register. Register each one explicitly when you are ready.
        </p>

        <Table>
          <Thead>
            <Tr>
              <Th>Uploaded By</Th>
              <Th>Date Uploaded</Th>
              <Th>File</Th>
              <Th>Status</Th>
              <Th>Actions</Th>
            </Tr>
          </Thead>
          <Tbody>
            {result.temporaryFiles.map((f) => (
              <Tr key={f.id}>
                <Td className="text-text-secondary">{f.uploadedByName}</Td>
                <Td className="text-text-secondary">
                  {new Date(f.uploadedAt).toLocaleString()}
                </Td>
                <Td>
                  <span className="flex items-center gap-1.5">
                    <FileText size={14} className="text-brand-700" />
                    {f.originalFileName}
                    <span className="text-text-muted">({formatBytes(f.sizeBytes)})</span>
                  </span>
                </Td>
                <Td>
                  <span className="rounded-[3px] bg-brand-100 px-2 py-0.5 text-[11px] font-medium text-brand-800">
                    Temporary
                  </span>
                </Td>
                <Td>
                  <div className="flex items-center gap-3">
                    <a
                      href={`/api/temporary-files/${f.id}/file?download=1`}
                      className="inline-flex items-center gap-1 text-brand-700 hover:underline"
                    >
                      <Download size={13} />
                      Download
                    </a>
                    <RegisterAsDocumentModal
                      temporaryFileId={f.id}
                      fileName={f.originalFileName}
                      suggestedTitle={f.originalFileName.replace(/\.pdf$/i, "")}
                      documentTypeNames={[]}
                    />
                  </div>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>

        <div className="mt-4">
          <Button variant="secondary" onClick={reset}>
            Split Another PDF
          </Button>
        </div>
      </div>
    );
  }

  const busy = phase === "uploading" || phase === "processing";

  return (
    <div className="max-w-2xl">
      <h2 className="text-[17px] font-semibold text-text-primary">Split a PDF</h2>
      <p className="mt-1 text-[13px] text-text-secondary">
        Upload a PDF and it will be split into individual, one-page PDFs saved as Temporary Files
        in this project. Register the ones you need as official documents afterward.
      </p>

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
        onClick={() => !busy && inputRef.current?.click()}
        className={`mt-4 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[3px] border-2 border-dashed px-6 py-14 text-center transition-colors ${
          dragOver ? "border-brand-600 bg-brand-50" : "border-border bg-white hover:bg-brand-50/40"
        }`}
      >
        <UploadCloud size={28} strokeWidth={1.25} className="text-text-muted" />
        <p className="text-[13px] font-medium text-text-primary">
          {file ? file.name : "Select a PDF file or drop one here."}
        </p>
        {file && <p className="text-xs text-text-secondary">{formatBytes(file.size)}</p>}
        <p className="mt-1 text-[11px] text-text-muted">
          Maximum file size is 200MB. Maximum number of pages is {MAX_PAGES}.
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={(e) => validateAndSetFile(e.target.files?.[0])}
        />
      </div>

      {error && (
        <div className="mt-3 flex items-start gap-2 rounded-[3px] border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
          <AlertCircle size={15} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {busy && (
        <div className="mt-3 rounded-[3px] border border-border bg-white p-3">
          <p className="mb-1.5 text-[13px] text-text-secondary">
            {phase === "uploading" ? `Uploading… ${uploadPercent}%` : "Splitting PDF into pages…"}
          </p>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-brand-100">
            <div
              className="h-full rounded-full bg-brand-600 transition-all"
              style={{
                width: phase === "uploading" ? `${uploadPercent}%` : "100%",
              }}
            />
          </div>
        </div>
      )}

      <div className="mt-4">
        <Button variant="primary" onClick={submit} disabled={!file || busy}>
          <Scissors size={14} />
          Split PDF
        </Button>
      </div>
    </div>
  );
}
