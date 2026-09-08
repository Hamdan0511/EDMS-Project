"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { Button, buttonClass } from "@/components/ui/button";
import { UploadCloud, AlertCircle, Plus } from "@/components/ui/icons";
import { ACCEPT_ATTRIBUTE, formatBytes } from "@/lib/files/file-types";

export function UploadTemporaryFileButton({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [percent, setPercent] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setFile(null);
    setError(null);
    setUploading(false);
    setPercent(0);
    if (inputRef.current) inputRef.current.value = "";
  }

  function close() {
    if (uploading) return;
    setOpen(false);
    reset();
  }

  function upload() {
    if (!file) return;
    setError(null);
    setUploading(true);
    setPercent(0);

    const formData = new FormData();
    formData.append("projectId", projectId);
    formData.append("file", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/temporary-files");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) setPercent(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      let body: unknown = null;
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        // ignore parse failure, generic error handled below
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        setOpen(false);
        reset();
        router.refresh();
      } else {
        const message =
          body && typeof body === "object" && "error" in body
            ? String((body as { error: unknown }).error)
            : "Failed to upload the file. Please try again.";
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
    <>
      <button type="button" className={buttonClass("primary", "md")} onClick={() => setOpen(true)}>
        <Plus size={14} />
        Upload Temporary File
      </button>
      <Modal open={open} onClose={close} title="Upload Temporary File" width="max-w-lg">
        <div className="flex flex-col gap-3">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const f = e.dataTransfer.files[0];
              if (f) {
                setFile(f);
                setError(null);
              }
            }}
            onClick={() => !uploading && inputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[3px] border-2 border-dashed px-6 py-10 text-center transition-colors ${
              dragOver ? "border-brand-600 bg-brand-50" : "border-border bg-white hover:bg-brand-50/40"
            }`}
          >
            <UploadCloud size={24} strokeWidth={1.25} className="text-text-muted" />
            <p className="text-[13px] font-medium text-text-primary">
              {file ? file.name : "Select a file or drop one here."}
            </p>
            {file && <p className="text-xs text-text-secondary">{formatBytes(file.size)}</p>}
            <p className="mt-1 text-[11px] text-text-muted">
              PDF, Word, Excel, PowerPoint, images, DWG/DXF, TXT, CSV, ZIP. Maximum size 200MB.
            </p>
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT_ATTRIBUTE}
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  setFile(f);
                  setError(null);
                }
              }}
            />
          </div>

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
            <Button type="button" variant="primary" onClick={upload} disabled={!file || uploading}>
              {uploading ? "Uploading..." : "Upload"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
