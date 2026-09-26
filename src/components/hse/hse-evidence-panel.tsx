"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Paperclip, ImageIcon, FileText, Trash2, UploadCloud } from "@/components/ui/icons";

export type HseEvidenceItem = {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedByName: string;
  uploadedAt: string;
  canDelete: boolean;
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Shared evidence upload + gallery, reused on every HSE record detail page.
 * Supports photos, videos, and PDFs — camera capture on mobile via the
 * `capture` attribute on the photo input, plain file selection everywhere
 * else (never a fake camera UI). */
export function HseEvidencePanel({
  recordType,
  recordId,
  items,
  canUpload,
}: {
  recordType: string;
  recordId: string;
  items: HseEvidenceItem[];
  canUpload: boolean;
}) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    setError(null);
    setUploading(true);
    const form = new FormData();
    form.set("recordType", recordType);
    form.set("recordId", recordId);
    form.set("file", file);
    const res = await fetch("/api/hse/attachments", { method: "POST", body: form });
    const body = await res.json().catch(() => ({}));
    setUploading(false);
    if (!res.ok) {
      setError(body.error ?? "Failed to upload the file.");
      return;
    }
    router.refresh();
  }

  async function remove(id: string) {
    if (!window.confirm("Remove this attachment?")) return;
    const res = await fetch(`/api/hse/attachments/${id}`, { method: "DELETE" });
    if (res.ok) router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      {error && <p className="text-[13px] text-danger">{error}</p>}

      {canUpload && (
        <div className="flex flex-wrap gap-2">
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*,application/pdf"
            multiple={false}
            className="hidden"
            onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
          />
          <Button type="button" variant="secondary" size="sm" onClick={() => photoInputRef.current?.click()} disabled={uploading}>
            <ImageIcon size={13} />
            Take / Upload Photo
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            <UploadCloud size={13} />
            Upload Video / File
          </Button>
          {uploading && <span className="self-center text-[12px] text-text-muted">Uploading…</span>}
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-[13px] text-text-muted">No evidence attached yet.</p>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {items.map((item) => {
            const isImage = item.mimeType.startsWith("image/");
            return (
              <div key={item.id} className="flex flex-col overflow-hidden rounded-[3px] border border-border bg-white">
                <a
                  href={`/api/hse/attachments/${item.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex aspect-[4/3] items-center justify-center bg-background"
                >
                  {isImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={`/api/hse/attachments/${item.id}`} alt={item.fileName} className="h-full w-full object-cover" />
                  ) : item.mimeType.startsWith("video/") ? (
                    <Paperclip size={22} className="text-text-muted" />
                  ) : (
                    <FileText size={22} className="text-text-muted" />
                  )}
                </a>
                <div className="flex items-center justify-between gap-1 px-2 py-1.5">
                  <div className="min-w-0">
                    <p className="truncate text-[11px] font-medium text-text-primary" title={item.fileName}>
                      {item.fileName}
                    </p>
                    <p className="text-[10px] text-text-muted">
                      {formatBytes(item.sizeBytes)} · {item.uploadedByName}
                    </p>
                  </div>
                  {item.canDelete && (
                    <button
                      type="button"
                      onClick={() => remove(item.id)}
                      aria-label={`Remove ${item.fileName}`}
                      className="shrink-0 text-text-muted hover:text-danger"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
