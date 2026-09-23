"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { AlertCircle } from "@/components/ui/icons";
import { DOCUMENT_STATUS_OPTIONS } from "@/lib/documents/status";

type Field = "typeName" | "discipline" | "status" | "description";

const FIELD_OPTIONS: { value: Field; label: string }[] = [
  { value: "typeName", label: "Document Type" },
  { value: "discipline", label: "Discipline" },
  { value: "status", label: "Status" },
  { value: "description", label: "Description" },
];

/** Tools > Update — controlled bulk metadata editing. Deliberately excludes
 * Document Number and Title (must stay unique/meaningful per document). */
export function BulkMetadataModal({
  documentIds,
  documentTypeNames,
  open,
  onClose,
}: {
  documentIds: string[];
  documentTypeNames: string[];
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [field, setField] = useState<Field>("status");
  const [value, setValue] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function close() {
    if (submitting) return;
    onClose();
    setField("status");
    setValue("");
    setConfirming(false);
    setError(null);
  }

  async function submit() {
    setError(null);
    setSubmitting(true);
    const res = await fetch("/api/documents/bulk/metadata", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentIds, field, value }),
    });
    const body = await res.json().catch(() => ({}));
    setSubmitting(false);
    if (!res.ok) {
      setError(body.error ?? "Failed to update the selected documents.");
      return;
    }
    close();
    router.refresh();
  }

  const fieldLabel = FIELD_OPTIONS.find((f) => f.value === field)?.label ?? field;

  return (
    <Modal open={open} onClose={close} title="Update — Bulk Metadata Change" width="max-w-md">
      <div className="flex flex-col gap-3">
        <p className="text-xs text-text-secondary">
          Updating <span className="font-medium text-text-primary">{documentIds.length}</span> selected document(s).
        </p>

        {error && (
          <div className="flex items-start gap-2 rounded-[3px] border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
            <AlertCircle size={15} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!confirming ? (
          <>
            <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
              Field
              <Select
                value={field}
                onChange={(e) => {
                  setField(e.target.value as Field);
                  setValue("");
                }}
              >
                {FIELD_OPTIONS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </Select>
            </label>

            {field === "status" ? (
              <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
                New Value
                <Select value={value} onChange={(e) => setValue(e.target.value)}>
                  <option value="">-- Select --</option>
                  {DOCUMENT_STATUS_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </Select>
              </label>
            ) : field === "typeName" ? (
              <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
                New Value
                <Input value={value} onChange={(e) => setValue(e.target.value)} list="bulk-type-options" placeholder="e.g. Shop Drawing" />
                <datalist id="bulk-type-options">
                  {documentTypeNames.map((name) => (
                    <option key={name} value={name} />
                  ))}
                </datalist>
              </label>
            ) : field === "description" ? (
              <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
                New Value
                <textarea
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  rows={3}
                  className="w-full rounded-[3px] border border-border bg-white px-2.5 py-1.5 text-[13px] text-text-primary outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                />
              </label>
            ) : (
              <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
                New Value
                <Input value={value} onChange={(e) => setValue(e.target.value)} />
              </label>
            )}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={close}>
                Cancel
              </Button>
              <Button type="button" variant="primary" disabled={field === "status" && !value} onClick={() => setConfirming(true)}>
                Preview
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="rounded-[3px] border border-amber-200 bg-amber-50 px-3 py-2 text-[13px] text-amber-800">
              This will set <span className="font-medium">{fieldLabel}</span> to{" "}
              <span className="font-medium">{value || "(empty)"}</span> on all{" "}
              <span className="font-medium">{documentIds.length}</span> selected document(s). This cannot be undone
              automatically.
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setConfirming(false)} disabled={submitting}>
                Back
              </Button>
              <Button type="button" variant="primary" onClick={submit} disabled={submitting}>
                {submitting ? "Updating..." : "Confirm Update"}
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
