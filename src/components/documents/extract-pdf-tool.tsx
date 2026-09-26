"use client";

import { useMemo, useRef, useState } from "react";
import { PDFDocument } from "pdf-lib";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RegisterAsDocumentModal } from "@/components/documents/register-as-document-modal";
import {
  UploadCloud,
  AlertCircle,
  FileOutput,
  Download,
  ExternalLink,
  RotateCcw,
  FileCheck2,
} from "@/components/ui/icons";
import { parsePageSelection } from "@/lib/documents/page-range";

const MAX_SIZE_BYTES = 200 * 1024 * 1024;
const MAX_CHECKBOX_GRID_PAGES = 300;

type Mode = "range" | "specific" | "multi";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type ExtractResult = {
  id: string;
  originalFileName: string;
  sizeBytes: number;
  sourceFileName: string;
  pageCount: number;
};

export function ExtractPdfTool({ projectId }: { projectId: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [totalPages, setTotalPages] = useState<number | null>(null);
  const [readingFile, setReadingFile] = useState(false);

  const [mode, setMode] = useState<Mode>("range");
  const [rangeFrom, setRangeFrom] = useState("");
  const [rangeTo, setRangeTo] = useState("");
  const [specificInput, setSpecificInput] = useState("");
  const [multiInput, setMultiInput] = useState("");

  const [keepOriginalOrder, setKeepOriginalOrder] = useState(true);
  const [outputFileName, setOutputFileName] = useState("");
  const [filenameEdited, setFilenameEdited] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<"idle" | "uploading" | "processing" | "done">("idle");
  const [uploadPercent, setUploadPercent] = useState(0);
  const [result, setResult] = useState<ExtractResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const pageSelectionInput = useMemo(() => {
    if (mode === "range") {
      if (!rangeFrom.trim() || !rangeTo.trim()) return "";
      return `${rangeFrom.trim()}-${rangeTo.trim()}`;
    }
    if (mode === "specific") return specificInput;
    return multiInput;
  }, [mode, rangeFrom, rangeTo, specificInput, multiInput]);

  const selection = useMemo(() => {
    if (totalPages == null) return { pages: [], error: null as string | null };
    return parsePageSelection(pageSelectionInput, totalPages);
  }, [pageSelectionInput, totalPages]);

  const selectedSet = useMemo(() => new Set(selection.pages), [selection.pages]);

  function reset() {
    setFile(null);
    setTotalPages(null);
    setMode("range");
    setRangeFrom("");
    setRangeTo("");
    setSpecificInput("");
    setMultiInput("");
    setKeepOriginalOrder(true);
    setOutputFileName("");
    setFilenameEdited(false);
    setError(null);
    setPhase("idle");
    setUploadPercent(0);
    setResult(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleFile(candidate: File | undefined | null) {
    setError(null);
    setResult(null);
    if (!candidate) return;

    if (!candidate.name.toLowerCase().endsWith(".pdf") && candidate.type !== "application/pdf") {
      setError("Only PDF files can be processed. Please select a .pdf file.");
      return;
    }
    if (candidate.size > MAX_SIZE_BYTES) {
      setError("The file is too large. Maximum file size is 200MB.");
      return;
    }

    setFile(candidate);
    setTotalPages(null);
    setReadingFile(true);
    try {
      const bytes = await candidate.arrayBuffer();
      const doc = await PDFDocument.load(bytes, { ignoreEncryption: false });
      const count = doc.getPageCount();
      if (count === 0) {
        setError("This PDF contains no pages.");
        setFile(null);
        setReadingFile(false);
        return;
      }
      setTotalPages(count);
      setOutputFileName(`${candidate.name.replace(/\.pdf$/i, "")}-extracted.pdf`);
      setFilenameEdited(false);
    } catch {
      setError(
        "Unable to read this PDF. It may be corrupted or password-protected. The server will re-check this before processing.",
      );
      setTotalPages(null);
    }
    setReadingFile(false);
  }

  /** Any manual pick (checkbox or preset) represents an arbitrary set of
   * pages, which only "Specific Pages" mode can express — switching there
   * keeps the active mode's input always an honest reflection of the
   * current selection. */
  function applySpecificPages(pages: number[]) {
    setMode("specific");
    setSpecificInput(pages.slice().sort((a, b) => a - b).join(", "));
  }

  function togglePage(page: number) {
    const next = selectedSet.has(page)
      ? selection.pages.filter((p) => p !== page)
      : [...selection.pages, page];
    applySpecificPages(next);
  }

  function selectAll() {
    if (!totalPages) return;
    applySpecificPages(Array.from({ length: totalPages }, (_, i) => i + 1));
  }

  function clearSelection() {
    setRangeFrom("");
    setRangeTo("");
    setSpecificInput("");
    setMultiInput("");
  }

  function applyPreset(preset: "first" | "last" | "first5" | "last5" | "odd" | "even") {
    if (!totalPages) return;
    if (preset === "first") return applySpecificPages([1]);
    if (preset === "last") return applySpecificPages([totalPages]);
    if (preset === "first5") return applySpecificPages(Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1));
    if (preset === "last5") {
      const start = Math.max(1, totalPages - 4);
      return applySpecificPages(Array.from({ length: totalPages - start + 1 }, (_, i) => start + i));
    }
    if (preset === "odd") return applySpecificPages(Array.from({ length: totalPages }, (_, i) => i + 1).filter((p) => p % 2 === 1));
    if (preset === "even") return applySpecificPages(Array.from({ length: totalPages }, (_, i) => i + 1).filter((p) => p % 2 === 0));
  }

  function extract() {
    if (!file || !totalPages) return;
    if (selection.error || selection.pages.length === 0) {
      setError(selection.error ?? "Select at least one page to extract.");
      return;
    }
    setError(null);
    setPhase("uploading");
    setUploadPercent(0);

    const formData = new FormData();
    formData.append("projectId", projectId);
    formData.append("file", file);
    formData.append("pageSelection", pageSelectionInput);
    formData.append("keepOriginalOrder", String(keepOriginalOrder));
    formData.append("outputFileName", outputFileName);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/documents/extract-pdf");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        setUploadPercent(Math.round((e.loaded / e.total) * 100));
        if (e.loaded >= e.total) setPhase("processing");
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
        const r = body as ExtractResult;
        setResult(r);
        setPhase("done");
      } else {
        const message =
          body && typeof body === "object" && "error" in body
            ? String((body as { error: unknown }).error)
            : "We couldn't create the extracted PDF. The original file has not been changed.";
        setError(message);
        setPhase("idle");
      }
    };
    xhr.onerror = () => {
      setError("Network error while processing the PDF. Please try again.");
      setPhase("idle");
    };
    xhr.send(formData);
  }

  if (result) {
    return (
      <div className="max-w-2xl">
        <div className="rounded-[3px] border border-border bg-white p-5">
          <div className="mb-4 flex items-center gap-2">
            <FileCheck2 size={20} className="text-emerald-700" />
            <h2 className="text-[17px] font-semibold text-text-primary">Extraction Complete</h2>
          </div>
          <p className="mb-3 text-[13px] text-emerald-700">
            ✓ {result.pageCount} page{result.pageCount === 1 ? "" : "s"} extracted successfully.
          </p>
          <dl className="grid grid-cols-[120px_1fr] gap-y-2 text-[13px]">
            <dt className="text-text-muted">Source</dt>
            <dd className="text-text-primary">{result.sourceFileName}</dd>
            <dt className="text-text-muted">Pages</dt>
            <dd className="text-text-primary">{result.pageCount} page{result.pageCount === 1 ? "" : "s"}</dd>
            <dt className="text-text-muted">Output</dt>
            <dd className="text-text-primary">{result.originalFileName} ({formatBytes(result.sizeBytes)})</dd>
          </dl>

          <p className="mt-3 text-[12px] text-text-secondary">
            Saved to Temporary Files — it is not yet part of the Document Register. Register it when you are ready.
          </p>

          {error && (
            <div className="mt-3 flex items-start gap-2 rounded-[3px] border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
              <AlertCircle size={15} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <a
              href={`/api/temporary-files/${result.id}/file`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 rounded-[3px] border border-border bg-white px-3.5 py-1.5 text-[13px] font-medium text-text-primary transition-colors hover:bg-brand-50"
            >
              <ExternalLink size={14} />
              Open Temporary File
            </a>
            <a
              href={`/api/temporary-files/${result.id}/file?download=1`}
              className="inline-flex items-center justify-center gap-1.5 rounded-[3px] bg-brand-700 px-3.5 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-brand-800"
            >
              <Download size={14} />
              Download
            </a>
            <RegisterAsDocumentModal
              temporaryFileId={result.id}
              fileName={result.originalFileName}
              suggestedTitle={result.originalFileName.replace(/\.pdf$/i, "")}
              documentTypeNames={[]}
            />
            <Button type="button" variant="ghost" onClick={reset}>
              <RotateCcw size={14} />
              Extract Another
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const busy = phase === "uploading" || phase === "processing";

  return (
    <div className="max-w-2xl">
      <h2 className="text-[17px] font-semibold text-text-primary">Extract PDF Pages</h2>
      <p className="mt-1 text-[13px] text-text-secondary">
        Create a new PDF containing only selected pages from this file. The original file is never changed.
      </p>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!busy) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (!busy) handleFile(e.dataTransfer.files[0]);
        }}
        onClick={() => !busy && inputRef.current?.click()}
        className={`mt-4 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[3px] border-2 border-dashed px-6 py-10 text-center transition-colors ${
          dragOver ? "border-brand-600 bg-brand-50" : "border-border bg-white hover:bg-brand-50/40"
        }`}
      >
        <UploadCloud size={26} strokeWidth={1.25} className="text-text-muted" />
        <p className="text-[13px] font-medium text-text-primary">
          {file ? file.name : "Select a PDF file or drop one here."}
        </p>
        {file && (
          <p className="text-xs text-text-secondary">
            {formatBytes(file.size)}
            {totalPages != null && ` · ${totalPages} pages`}
            {readingFile && " · Reading..."}
          </p>
        )}
        <p className="mt-1 text-[11px] text-text-muted">Maximum file size is 200MB.</p>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>

      {error && (
        <div className="mt-3 flex items-start gap-2 rounded-[3px] border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
          <AlertCircle size={15} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {totalPages != null && (
        <div className="mt-4 rounded-[3px] border border-border bg-white">
          <div className="border-b border-border px-4 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
              Extraction Method
            </p>
          </div>
          <div className="flex flex-col gap-3 border-b border-border px-4 py-3">
            <label className="flex items-center gap-2 text-[13px] font-medium text-text-primary">
              <input type="radio" name="mode" checked={mode === "range"} onChange={() => setMode("range")} className="accent-brand-700" />
              Page Range
            </label>
            {mode === "range" && (
              <div className="ml-5 flex items-center gap-3">
                <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
                  From
                  <Input
                    type="number"
                    min={1}
                    max={totalPages}
                    value={rangeFrom}
                    onChange={(e) => {
                      setRangeFrom(e.target.value);
                      if (!filenameEdited && file && e.target.value && rangeTo) {
                        setOutputFileName(`${file.name.replace(/\.pdf$/i, "")}_P${e.target.value}-P${rangeTo}.pdf`);
                      }
                    }}
                    className="w-20"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
                  To
                  <Input
                    type="number"
                    min={1}
                    max={totalPages}
                    value={rangeTo}
                    onChange={(e) => {
                      setRangeTo(e.target.value);
                      if (!filenameEdited && file && rangeFrom && e.target.value) {
                        setOutputFileName(`${file.name.replace(/\.pdf$/i, "")}_P${rangeFrom}-P${e.target.value}.pdf`);
                      }
                    }}
                    className="w-20"
                  />
                </label>
              </div>
            )}

            <label className="flex items-center gap-2 text-[13px] font-medium text-text-primary">
              <input type="radio" name="mode" checked={mode === "specific"} onChange={() => setMode("specific")} className="accent-brand-700" />
              Specific Pages
            </label>
            {mode === "specific" && (
              <div className="ml-5">
                <Input
                  value={specificInput}
                  onChange={(e) => setSpecificInput(e.target.value)}
                  placeholder="e.g. 2, 5, 8, 12, 18"
                  className="w-full"
                />
              </div>
            )}

            <label className="flex items-center gap-2 text-[13px] font-medium text-text-primary">
              <input type="radio" name="mode" checked={mode === "multi"} onChange={() => setMode("multi")} className="accent-brand-700" />
              Multiple Ranges
            </label>
            {mode === "multi" && (
              <div className="ml-5">
                <Input
                  value={multiInput}
                  onChange={(e) => setMultiInput(e.target.value)}
                  placeholder="e.g. 1-4, 8-12, 20-22"
                  className="w-full"
                />
              </div>
            )}

            {selection.error && pageSelectionInput.trim() && (
              <p className="text-[12px] text-red-700">{selection.error}</p>
            )}
            {!selection.error && selection.pages.length > 0 && (
              <p className="text-[12px] text-text-secondary">
                {selection.pages.length} page{selection.pages.length === 1 ? "" : "s"} selected
              </p>
            )}
          </div>

          <div className="border-b border-border px-4 py-3">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-text-secondary">Quick Presets</p>
            <div className="flex flex-wrap gap-1.5">
              <Button type="button" variant="ghost" size="sm" onClick={() => applyPreset("first")}>First Page</Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => applyPreset("last")}>Last Page</Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => applyPreset("first5")}>First 5 Pages</Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => applyPreset("last5")}>Last 5 Pages</Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => applyPreset("odd")}>Odd Pages</Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => applyPreset("even")}>Even Pages</Button>
              <Button type="button" variant="ghost" size="sm" onClick={selectAll}>Select All</Button>
              <Button type="button" variant="ghost" size="sm" onClick={clearSelection}>Clear Selection</Button>
            </div>
          </div>

          <div className="border-b border-border px-4 py-3">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-text-secondary">Page Selection</p>
            {totalPages <= MAX_CHECKBOX_GRID_PAGES ? (
              <div className="grid max-h-56 grid-cols-6 gap-1.5 overflow-y-auto rounded-[3px] border border-border bg-background p-2 sm:grid-cols-8">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <label
                    key={page}
                    className={`flex items-center gap-1 rounded-[2px] px-1.5 py-1 text-[12px] ${
                      selectedSet.has(page) ? "bg-brand-100 text-brand-800" : "text-text-secondary hover:bg-brand-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedSet.has(page)}
                      onChange={() => togglePage(page)}
                      className="h-3.5 w-3.5 accent-brand-700"
                    />
                    {page}
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-text-muted">
                This document has {totalPages} pages — use the fields above to choose pages (a visual grid is only shown up to {MAX_CHECKBOX_GRID_PAGES} pages for performance).
              </p>
            )}

            <label className="mt-4 flex items-center gap-1.5 text-[13px] text-text-primary">
              <input
                type="checkbox"
                checked={keepOriginalOrder}
                onChange={(e) => setKeepOriginalOrder(e.target.checked)}
                className="h-3.5 w-3.5 accent-brand-700"
              />
              Keep original page order
            </label>
            {!keepOriginalOrder && (
              <p className="mt-1 text-[11px] text-text-muted">
                Pages will appear in the exact order entered (e.g. 5, 2, 8, 1).
              </p>
            )}
          </div>

          <div className="px-4 py-3">
            <label className="block text-xs font-medium text-text-secondary">
              Output filename
              <Input
                value={outputFileName}
                onChange={(e) => {
                  setOutputFileName(e.target.value);
                  setFilenameEdited(true);
                }}
                className="mt-1"
              />
            </label>
          </div>

          {busy && (
            <div className="mx-4 mb-3 rounded-[3px] border border-border bg-white p-3">
              <p className="mb-1.5 text-[13px] text-text-secondary">
                {phase === "uploading" ? `Uploading… ${uploadPercent}%` : "Extracting pages and creating PDF…"}
              </p>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-brand-100">
                <div
                  className="h-full rounded-full bg-brand-600 transition-all"
                  style={{ width: phase === "uploading" ? `${uploadPercent}%` : "100%" }}
                />
              </div>
            </div>
          )}

          <div className="px-4 py-3">
            <Button
              type="button"
              variant="primary"
              onClick={extract}
              disabled={busy || !!selection.error || selection.pages.length === 0}
            >
              <FileOutput size={14} />
              Extract Pages
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
