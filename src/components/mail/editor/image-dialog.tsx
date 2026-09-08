"use client";

import { useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToolbarButton } from "./toolbar-button";
import { ImagePlus, AlertCircle } from "@/components/ui/icons";

/** Uploads a real image file through the secure inline-image endpoint and
 * inserts the resulting served URL into the editor — never a base64 data
 * URI, so the database never stores large embedded blobs. */
export async function uploadAndInsertImage(editor: Editor, projectId: string, file: File): Promise<string | null> {
  const form = new FormData();
  form.set("projectId", projectId);
  form.set("file", file);
  const res = await fetch("/api/mail/inline-images", { method: "POST", body: form });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    return body.error ?? "Failed to upload the image.";
  }
  editor.chain().focus().setImage({ src: body.url, alt: file.name }).run();
  return null;
}

export function ImageDialog({ editor, projectId }: { editor: Editor; projectId: string }) {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [altText, setAltText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  function close() {
    if (uploading) return;
    setOpen(false);
    setPendingFile(null);
    setAltText("");
    setError(null);
  }

  async function submit() {
    if (!pendingFile) {
      setError("Choose an image file.");
      return;
    }
    setUploading(true);
    setError(null);
    const form = new FormData();
    form.set("projectId", projectId);
    form.set("file", pendingFile);
    const res = await fetch("/api/mail/inline-images", { method: "POST", body: form });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(body.error ?? "Failed to upload the image.");
      setUploading(false);
      return;
    }
    editor.chain().focus().setImage({ src: body.url, alt: altText || pendingFile.name }).run();
    setUploading(false);
    close();
  }

  return (
    <>
      <ToolbarButton onClick={() => setOpen(true)} label="Insert image">
        <ImagePlus size={14} />
      </ToolbarButton>
      <Modal open={open} onClose={close} title="Insert Image" width="max-w-sm">
        <div className="flex flex-col gap-3">
          <div
            onClick={() => !uploading && inputRef.current?.click()}
            className="flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-[3px] border-2 border-dashed border-border bg-white px-4 py-6 text-center hover:bg-brand-50/40"
          >
            <ImagePlus size={20} strokeWidth={1.25} className="text-text-muted" />
            <p className="text-[13px] text-text-primary">
              {pendingFile ? pendingFile.name : "Select an image (PNG, JPEG, GIF, WEBP)"}
            </p>
            <input
              ref={inputRef}
              type="file"
              accept="image/png,image/jpeg,image/gif,image/webp"
              className="hidden"
              onChange={(e) => setPendingFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
            Alt text (for accessibility)
            <Input value={altText} onChange={(e) => setAltText(e.target.value)} placeholder="Describe the image" />
          </label>
          {error && (
            <div className="flex items-start gap-2 rounded-[3px] border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
              <AlertCircle size={15} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <div className="mt-1 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={close} disabled={uploading}>
              Cancel
            </Button>
            <Button type="button" variant="primary" onClick={submit} disabled={uploading}>
              {uploading ? "Uploading..." : "Insert"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
