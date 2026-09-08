"use client";

import { useMemo, useRef, useState } from "react";
import { PDFDocument } from "pdf-lib";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type ExtractResult = {
  blob: Blob;
  fileName: string;
  pageCount: number;
  sourceFileName: string;
};

export function ExtractPdfTool({ projectId }: { projectId: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [totalPages, setTotalPages] = useState<number | null>(null);
  const [readingFile, setReadingFile] = useState(false);
  const [pageSelectionInput, setPageSelectionInput] = useState("");
  const [keepOriginalOrder, setKeepOriginalOrder] = useState(true);
  const [outputFileName, setOutputFileName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [percent, setPercent] = useState(0);
  const [result, setResult] = useState<ExtractResult | null>(null);
  const [savingToTemp, setSavingToTemp] = useState(false);
  const [savedToTemp, setSavedToTemp] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const selection = useMemo(() => {
    if (totalPages == null) return { pages: [], error: null as string | null };
    return parsePageSelection(pageSelectionInput, totalPages);
  }, [pageSelectionInput, totalPages]);

  const selectedSet = useMemo(() => new Set(selection.pages), [selection.pages]);

  function reset() {
    setFile(null);
    setTotalPages(null);
    setPageSelectionInput("");
    setKeepOriginalOrder(true);
    setOutputFileName("");
    setError(null);
    setExtracting(false);
    setPercent(0);
    setResult(null);
    setSavingToTemp(false);
    setSavedToTemp(false);
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
    } catch {
      setError(
        "Could not read this PDF. It may be corrupted or password-protected. The server will re-check this before processing.",
      );
      // Leave `file` set — the server performs the authoritative validation
      // and will report a precise error if this genuinely can't be processed.
      setTotalPages(null);
    }
    setReadingFile(false);
  }

  function togglePage(page: number) {
    const next = selectedSet.has(page)
      ? selection.pages.filter((p) => p !== page)
      : [...selection.pages, page];
    setPageSelectionInput(next.slice().sort((a, b) => a - b).join(", "));
  }

  function selectAll() {
    if (!totalPages) return;
    setPageSelectionInput(`1-${totalPages}`);
  }

  function clearSelection() {
    setPageSelectionInput("");
  }

  function extract() {
    if (!file || !totalPages) return;
    if (selection.error || selection.pages.length === 0) {
      setError(selection.error ?? "Select at least one page to extract.");
      return;
    }
    setError(null);
    setExtracting(true);
    setPercent(0);

    const formData = new FormData();
    formData.append("projectId", projectId);
    formData.append("file", file);
    formData.append("pageSelection", pageSelectionInput);
    formData.append("keepOriginalOrder", String(keepOriginalOrder));
    formData.append("outputFileName", outputFileName);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/documents/extract-pdf");
    xhr.responseType = "blob";
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) setPercent(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = async () => {
      setExtracting(false);
      if (xhr.status >= 200 && xhr.status < 300) {
        const blob = xhr.response as Blob;
        const fileName = decodeURIComponent(xhr.getResponseHeader("X-Output-File-Name") ?? outputFileName);
        const pageCount = Number(xhr.getResponseHeader("X-Extracted-Page-Count") ?? selection.pages.length);
        setResult({ blob, fileName, pageCount, sourceFileName: file.name });
      } else {
        const text = await (xhr.response as Blob).text();
        let message = "Failed to extract pages from the PDF. Please try again.";
        try {
          message = JSON.parse(text).error ?? message;
        } catch {
          // keep generic message
        }
        setError(message);
      }
    };
    xhr.onerror = () => {
      setExtracting(false);
      setError("Network error while processing the PDF. Please try again.");
    };
    xhr.send(formData);
  }

  function openResult() {
    if (!result) return;
    const url = URL.createObjectURL(result.blob);
    window.open(url, "_blank", "noopener,noreferrer");
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }

  function downloadResult() {
    if (!result) return;
    const url = URL.createObjectURL(result.blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = result.fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }

  async function saveToTemporaryFiles() {
    if (!result) return;
    setSavingToTemp(true);
    setError(null);
    try {
      const asFile = new File([result.blob], result.fileName, { type: "application/pdf" });
      const formData = new FormData();
      formData.append("projectId", projectId);
      formData.append("file", asFile);
      const res = await fetch("/api/temporary-files", { method: "POST", body: formData });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error ?? "Failed to save the extracted PDF to Temporary Files.");
        setSavingToTemp(false);
        return;
      }
      setSavedToTemp(true);
    } catch {
      setError("Network error while saving to Temporary Files.");
    }
    setSavingToTemp(false);
  }

  if (result) {
    return (
      <div className="max-w-2xl">
        <div className="rounded-[3px] border border-border bg-white p-5">
          <div className="mb-4 flex items-center gap-2">
            <FileCheck2 size={20} className="text-emerald-700" />
            <h2 className="text-[17px] font-semibold text-text-primary">Extraction Complete</h2>
          </div>
          <dl className="grid grid-cols-[120px_1fr] gap-y-2 text-[13px]">
            <dt className="text-text-muted">Source</dt>
            <dd className="text-text-primary">{result.sourceFileName}</dd>
            <dt className="text-text-muted">Pages extracted</dt>
            <dd className="text-text-primary">{result.pageCount}</dd>
            <dt className="text-text-muted">Output</dt>
            <dd className="text-text-primary">{result.fileName} ({formatBytes(result.blob.size)})</dd>
          </dl>

          {error && (
            <div className="mt-3 flex items-start gap-2 rounded-[3px] border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
              <AlertCircle size={15} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button type="button" variant="secondary" onClick={openResult}>
              <ExternalLink size={14} />
              Open PDF
            </Button>
            <Button type="button" variant="primary" onClick={downloadResult}>
              <Download size={14} />
              Download PDF
            </Button>
            <Button type="button" variant="secondary" onClick={saveToTemporaryFiles} disabled={savingToTemp || savedToTemp}>
              {savedToTemp ? "Saved to Temporary Files" : savingToTemp ? "Saving..." : "Save to Temporary Files"}
            </Button>
            <Button type="button" variant="ghost" onClick={reset}>
              <RotateCcw size={14} />
              Extract Another
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <h2 className="text-[17px] font-semibold text-text-primary">Extract PDF</h2>
      <p className="mt-1 text-[13px] text-text-secondary">
        Upload a PDF, choose the pages you need, and generate a new PDF containing only those
        pages.
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
          handleFile(e.dataTransfer.files[0]);
        }}
        onClick={() => inputRef.current?.click()}
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
        <div className="mt-4 rounded-[3px] border border-border bg-white p-4">
          <p className="text-[13px] font-medium text-text-primary">Total pages: {totalPages}</p>

          <label className="mt-3 block text-xs font-medium text-text-secondary">
            Select pages
            <Input
              value={pageSelectionInput}
              onChange={(e) => setPageSelectionInput(e.target.value)}
              placeholder="e.g. 3, 7, 10-15"
              className="mt-1"
            />
          </label>
          {selection.error && pageSelectionInput.trim() && (
            <p className="mt-1 text-[12px] text-red-700">{selection.error}</p>
          )}
          {!selection.error && selection.pages.length > 0 && (
            <p className="mt-1 text-[12px] text-text-secondary">
              {selection.pages.length} page{selection.pages.length === 1 ? "" : "s"} selected
            </p>
          )}

          <div className="mt-2 flex gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={selectAll}>
              Select All
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={clearSelection}>
              Clear Selection
            </Button>
          </div>

          {totalPages <= MAX_CHECKBOX_GRID_PAGES ? (
            <div className="mt-3 grid max-h-56 grid-cols-6 gap-1.5 overflow-y-auto rounded-[3px] border border-border bg-background p-2 sm:grid-cols-8">
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
            <p className="mt-2 text-[11px] text-text-muted">
              This document has {totalPages} pages — use the page selection field above to choose pages.
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
              Pages will appear in the exact order typed in the field above (e.g. 5, 2, 8, 1).
            </p>
          )}

          <label className="mt-4 block text-xs font-medium text-text-secondary">
            Output filename
            <Input
              value={outputFileName}
              onChange={(e) => setOutputFileName(e.target.value)}
              className="mt-1"
            />
          </label>

          {extracting && (
            <div className="mt-4 rounded-[3px] border border-border bg-white p-3">
              <p className="mb-1.5 text-[13px] text-text-secondary">Extracting… {percent}%</p>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-brand-100">
                <div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${percent}%` }} />
              </div>
            </div>
          )}

          <div className="mt-4">
            <Button
              type="button"
              variant="primary"
              onClick={extract}
              disabled={extracting || !!selection.error || selection.pages.length === 0}
            >
              <FileOutput size={14} />
              Extract PDF
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
