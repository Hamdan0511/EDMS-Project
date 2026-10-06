"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "@/components/ui/icons";
import { CHECKLIST_RESULT_LABELS } from "@/lib/field/status";
import type { FieldChecklistResult } from "@prisma/client";

export type ExecutionItem = {
  responseId: string;
  label: string;
  responseType: string;
  isMandatory: boolean;
  result: FieldChecklistResult | null;
  textValue: string | null;
  note: string | null;
};

const RESULT_OPTIONS: Record<string, FieldChecklistResult[]> = {
  PASS_FAIL: ["PASS", "FAIL", "NA"],
  YES_NO: ["YES", "NO", "NA"],
};

export function FieldInspectionExecutionForm({ inspectionId, items }: { inspectionId: string; items: ExecutionItem[] }) {
  const router = useRouter();
  const [state, setState] = useState<ExecutionItem[]>(items);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update(responseId: string, patch: Partial<ExecutionItem>) {
    setState((prev) => prev.map((it) => (it.responseId === responseId ? { ...it, ...patch } : it)));
  }

  async function save() {
    setError(null);
    setSaving(true);
    const res = await fetch(`/api/field/inspections/${inspectionId}/responses`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        responses: state.map((it) => ({ responseId: it.responseId, result: it.result ?? undefined, textValue: it.textValue ?? undefined, note: it.note ?? undefined })),
      }),
    });
    const body = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError(body.error ?? "Failed to save responses.");
      return;
    }
    router.refresh();
  }

  async function submitInspection() {
    setError(null);
    setSubmitting(true);
    await save();
    const res = await fetch(`/api/field/inspections/${inspectionId}/submit`, { method: "POST" });
    const body = await res.json().catch(() => ({}));
    setSubmitting(false);
    if (!res.ok) {
      setError(body.error ?? "Failed to submit the inspection.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3 px-4 py-3">
      {error && (
        <div className="flex items-start gap-2 rounded-[3px] border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
          <AlertCircle size={15} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      <div className="flex flex-col divide-y divide-border rounded-[3px] border border-border">
        {state.map((item) => (
          <div key={item.responseId} className="grid grid-cols-[1fr_140px_1fr] items-center gap-3 px-3 py-2.5">
            <span className="text-[13px] font-medium text-text-primary">
              {item.label}
              {item.isMandatory && <span className="ml-1 text-red-600">*</span>}
            </span>
            {RESULT_OPTIONS[item.responseType] ? (
              <Select
                value={item.result ?? ""}
                onChange={(e) => update(item.responseId, { result: (e.target.value || null) as FieldChecklistResult | null })}
              >
                <option value="">—</option>
                {RESULT_OPTIONS[item.responseType].map((r) => (
                  <option key={r} value={r}>{CHECKLIST_RESULT_LABELS[r]}</option>
                ))}
              </Select>
            ) : item.responseType === "NUMBER" ? (
              <Input type="number" value={item.textValue ?? ""} onChange={(e) => update(item.responseId, { textValue: e.target.value })} />
            ) : item.responseType === "DATE" ? (
              <Input type="date" value={item.textValue ?? ""} onChange={(e) => update(item.responseId, { textValue: e.target.value })} />
            ) : (
              <Input value={item.textValue ?? ""} onChange={(e) => update(item.responseId, { textValue: e.target.value })} />
            )}
            <Input
              value={item.note ?? ""}
              onChange={(e) => update(item.responseId, { note: e.target.value })}
              placeholder={item.result === "FAIL" || item.result === "NO" ? "Finding / comment (recommended)" : "Comment (optional)"}
            />
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="secondary" onClick={save} disabled={saving || submitting}>
          {saving ? "Saving…" : "Save Progress"}
        </Button>
        <Button type="button" variant="primary" onClick={submitInspection} disabled={saving || submitting}>
          {submitting ? "Submitting…" : "Submit Inspection"}
        </Button>
      </div>
    </div>
  );
}
