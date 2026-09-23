"use client";

import { useState } from "react";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Plus } from "@/components/ui/icons";

type DateField = "uploaded" | "modified";

const FIELD_LABELS: Record<DateField, string> = {
  uploaded: "Date Uploaded",
  modified: "Date Modified",
};

/** Real "Date Type" + "Date Range" + "Add another date query" control. Only
 * the two dates that actually exist on Document (createdAt/updatedAt) are
 * offered — no fabricated date fields. Each row writes into the same
 * dateUploadedFrom/To / dateModifiedFrom/To params buildWhere already
 * understands, so no server-side change is needed to support this UI. */
export function DateQueryFilters({
  initial,
}: {
  initial: { uploadedFrom: string; uploadedTo: string; modifiedFrom: string; modifiedTo: string };
}) {
  const initialActive: DateField[] = [];
  if (initial.uploadedFrom || initial.uploadedTo) initialActive.push("uploaded");
  if (initial.modifiedFrom || initial.modifiedTo) initialActive.push("modified");
  if (initialActive.length === 0) initialActive.push("uploaded");

  const [rows, setRows] = useState<DateField[]>(initialActive);
  const [values, setValues] = useState<Record<DateField, { from: string; to: string }>>({
    uploaded: { from: initial.uploadedFrom, to: initial.uploadedTo },
    modified: { from: initial.modifiedFrom, to: initial.modifiedTo },
  });

  function setRowField(idx: number, field: DateField) {
    setRows((prev) => prev.map((f, i) => (i === idx ? field : f)));
  }

  function setRange(field: DateField, key: "from" | "to", value: string) {
    setValues((prev) => ({ ...prev, [field]: { ...prev[field], [key]: value } }));
  }

  function addRow() {
    const unused = (["uploaded", "modified"] as DateField[]).find((f) => !rows.includes(f));
    if (unused) setRows((prev) => [...prev, unused]);
  }

  function removeRow(idx: number) {
    if (rows.length <= 1) return;
    const removedField = rows[idx];
    setValues((prev) => ({ ...prev, [removedField]: { from: "", to: "" } }));
    setRows((prev) => prev.filter((_, i) => i !== idx));
  }

  return (
    <div className="flex flex-col gap-2">
      {rows.map((field, idx) => (
        <div key={idx} className="grid grid-cols-[1fr_1fr_1fr_auto] items-end gap-2">
          <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
            {idx === 0 ? "Date Type" : ""}
            <Select value={field} onChange={(e) => setRowField(idx, e.target.value as DateField)}>
              {(["uploaded", "modified"] as DateField[]).map((f) => (
                <option key={f} value={f} disabled={rows.includes(f) && f !== field}>
                  {FIELD_LABELS[f]}
                </option>
              ))}
            </Select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
            {idx === 0 ? "Date Range (from)" : ""}
            <Input type="date" value={values[field].from} onChange={(e) => setRange(field, "from", e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
            {idx === 0 ? "Date Range (to)" : ""}
            <Input type="date" value={values[field].to} onChange={(e) => setRange(field, "to", e.target.value)} />
          </label>
          {rows.length > 1 && (
            <button
              type="button"
              onClick={() => removeRow(idx)}
              className="h-8 rounded-[3px] border border-border px-2 text-xs text-text-muted hover:bg-brand-50"
            >
              Remove
            </button>
          )}
        </div>
      ))}
      {rows.length < 2 && (
        <button
          type="button"
          onClick={addRow}
          className="flex w-fit items-center gap-1 text-xs font-medium text-brand-700 hover:underline"
        >
          <Plus size={12} />
          Add another date query
        </button>
      )}

      <input type="hidden" name="dateUploadedFrom" value={rows.includes("uploaded") ? values.uploaded.from : ""} readOnly />
      <input type="hidden" name="dateUploadedTo" value={rows.includes("uploaded") ? values.uploaded.to : ""} readOnly />
      <input type="hidden" name="dateModifiedFrom" value={rows.includes("modified") ? values.modified.from : ""} readOnly />
      <input type="hidden" name="dateModifiedTo" value={rows.includes("modified") ? values.modified.to : ""} readOnly />
    </div>
  );
}
