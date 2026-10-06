"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { AlertCircle, UploadCloud } from "@/components/ui/icons";
import { FieldAreaPicker, type FieldAreaOption } from "@/components/field/field-area-picker";
import { PHOTO_CATEGORIES } from "@/lib/field/status";

export function NewFieldPhotoForm({
  projectId,
  areaTree,
  siteWalkId,
  defaultAreaId,
}: {
  projectId: string;
  areaTree: FieldAreaOption[];
  siteWalkId?: string;
  defaultAreaId?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [areaId, setAreaId] = useState(defaultAreaId ?? "");
  const [category, setCategory] = useState("General");
  const [capturedAt, setCapturedAt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function submit() {
    if (!file) {
      setError("Select a photo to upload.");
      return;
    }
    setError(null);
    setSubmitting(true);
    const form = new FormData();
    form.set("projectId", projectId);
    form.set("file", file);
    if (areaId) form.set("areaId", areaId);
    if (siteWalkId) form.set("siteWalkId", siteWalkId);
    if (category) form.set("category", category);
    if (capturedAt) form.set("capturedAt", capturedAt);
    const res = await fetch("/api/field/photos", { method: "POST", body: form });
    const body = await res.json().catch(() => ({}));
    setSubmitting(false);
    if (!res.ok) {
      setError(body.error ?? "Failed to upload the photo.");
      return;
    }
    setOpen(false);
    setFile(null);
    router.refresh();
  }

  return (
    <>
      <Button type="button" variant="primary" onClick={() => setOpen(true)}>
        <UploadCloud size={14} />
        Upload Photo
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Upload Site Photo">
        <div className="flex flex-col gap-3">
          {siteWalkId && (
            <p className="rounded-[3px] border border-brand-200 bg-brand-50 px-3 py-2 text-[12px] text-brand-800">
              Capturing for the active site walk.
            </p>
          )}
          {error && (
            <div className="flex items-start gap-2 rounded-[3px] border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
              <AlertCircle size={15} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
            Photo *
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="rounded-[3px] border border-border bg-white px-2.5 py-1.5 text-[13px] text-text-primary"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
              Category
              <Select value={category} onChange={(e) => setCategory(e.target.value)}>
                {PHOTO_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </Select>
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
              Captured Date
              <Input type="date" value={capturedAt} onChange={(e) => setCapturedAt(e.target.value)} />
            </label>
          </div>
          <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
            Location
            <FieldAreaPicker tree={areaTree} value={areaId} onChange={setAreaId} />
          </label>
          <Button type="button" variant="primary" onClick={submit} disabled={submitting} className="self-start">
            {submitting ? "Uploading…" : "Upload"}
          </Button>
        </div>
      </Modal>
    </>
  );
}
