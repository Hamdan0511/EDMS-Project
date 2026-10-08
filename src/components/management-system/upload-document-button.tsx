"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { AlertCircle, Plus } from "@/components/ui/icons";
import { MANAGEMENT_SYSTEM_LABELS, MANAGEMENT_SYSTEM_ORDER } from "@/lib/management-system/status";
import type { ManagementSystemCategory } from "@prisma/client";

const DOCUMENT_TYPE_SUGGESTIONS = ["Form", "Procedure", "Work Instruction", "Guidance Note", "Policy", "Plan", "Organisation Chart", "Report"];

export function UploadDocumentButton({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [documentNo, setDocumentNo] = useState("");
  const [title, setTitle] = useState("");
  const [managementSystem, setManagementSystem] = useState<ManagementSystemCategory>("QUALITY");
  const [documentType, setDocumentType] = useState("");
  const [documentOwner, setDocumentOwner] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!documentNo.trim() || !title.trim() || !documentType.trim() || !file) {
      setError("Document number, title, document type, and file are all required.");
      return;
    }
    setError(null);
    setSubmitting(true);
    const form = new FormData();
    form.set("projectId", projectId);
    form.set("documentNo", documentNo);
    form.set("title", title);
    form.set("managementSystem", managementSystem);
    form.set("documentType", documentType);
    if (documentOwner) form.set("documentOwner", documentOwner);
    form.set("file", file);
    const res = await fetch("/api/management-system/documents", { method: "POST", body: form });
    const body = await res.json().catch(() => ({}));
    setSubmitting(false);
    if (!res.ok) {
      setError(body.error ?? "Failed to upload the document.");
      return;
    }
    setOpen(false);
    setDocumentNo("");
    setTitle("");
    setDocumentType("");
    setDocumentOwner("");
    setFile(null);
    router.refresh();
  }

  return (
    <>
      <Button type="button" variant="primary" onClick={() => setOpen(true)}>
        <Plus size={14} />
        Upload Document
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Upload Management System Document">
        <div className="flex flex-col gap-3">
          {error && (
            <div className="flex items-start gap-2 rounded-[3px] border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
              <AlertCircle size={15} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
              Document Number *
              <Input value={documentNo} onChange={(e) => setDocumentNo(e.target.value)} placeholder="e.g. QU-P-31" />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
              Management System *
              <Select value={managementSystem} onChange={(e) => setManagementSystem(e.target.value as ManagementSystemCategory)}>
                {MANAGEMENT_SYSTEM_ORDER.map((ms) => (
                  <option key={ms} value={ms}>{MANAGEMENT_SYSTEM_LABELS[ms]}</option>
                ))}
              </Select>
            </label>
          </div>
          <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
            Document Title *
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
              Document Type *
              <Input value={documentType} onChange={(e) => setDocumentType(e.target.value)} list="doc-type-suggestions" placeholder="e.g. Procedure" />
              <datalist id="doc-type-suggestions">
                {DOCUMENT_TYPE_SUGGESTIONS.map((t) => <option key={t} value={t} />)}
              </datalist>
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
              Document Owner
              <Input value={documentOwner} onChange={(e) => setDocumentOwner(e.target.value)} placeholder="e.g. QA/QC" />
            </label>
          </div>
          <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
            File *
            <input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="rounded-[3px] border border-border bg-white px-2.5 py-1.5 text-[13px] text-text-primary"
            />
          </label>
          <Button type="button" variant="primary" onClick={submit} disabled={submitting} className="self-start">
            {submitting ? "Uploading…" : "Upload Document"}
          </Button>
        </div>
      </Modal>
    </>
  );
}
