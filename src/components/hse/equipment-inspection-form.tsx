"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/ui/section-header";
import { AlertCircle } from "@/components/ui/icons";
import { CHECKLIST_RESULT_LABELS } from "@/lib/hse/status";
import type { HseChecklistResult } from "@prisma/client";

type ChecklistItemState = { label: string; result: HseChecklistResult; comment: string };

export function EquipmentInspectionForm({
  equipmentId,
  checklist,
  mode,
}: {
  equipmentId: string;
  checklist: string[];
  mode: "inspect" | "reinspect";
}) {
  const router = useRouter();
  const [items, setItems] = useState<ChecklistItemState[]>(
    checklist.map((label) => ({ label, result: "PASS" as HseChecklistResult, comment: "" })),
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateItem(index: number, patch: Partial<ChecklistItemState>) {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  const anyFail = items.some((i) => i.result === "FAIL");

  async function submit() {
    setError(null);
    setSubmitting(true);
    const apiPath = mode === "reinspect" ? `/api/hse/equipment/${equipmentId}/reinspect` : `/api/hse/equipment/${equipmentId}/inspections`;
    const res = await fetch(apiPath, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: items.map((i) => ({ label: i.label, result: i.result, comment: i.comment || undefined })),
      }),
    });
    const body = await res.json().catch(() => ({}));
    setSubmitting(false);
    if (!res.ok) {
      setError(body.error ?? "Failed to record the inspection.");
      return;
    }
    router.push(`/hse/equipment/${equipmentId}`);
    router.refresh();
  }

  return (
    <div className="flex flex-col rounded-[3px] border border-border bg-white">
      {error && (
        <div className="m-4 mb-0 flex items-start gap-2 rounded-[3px] border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
          <AlertCircle size={15} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <SectionHeader>Checklist</SectionHeader>
      <div className="flex flex-col divide-y divide-border">
        {items.map((item, i) => (
          <div key={item.label} className="grid grid-cols-[1fr_140px_1fr] items-center gap-3 px-4 py-2.5">
            <span className="text-[13px] font-medium text-text-primary">{item.label}</span>
            <Select value={item.result} onChange={(e) => updateItem(i, { result: e.target.value as HseChecklistResult })}>
              {Object.entries(CHECKLIST_RESULT_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </Select>
            <Input
              value={item.comment}
              onChange={(e) => updateItem(i, { comment: e.target.value })}
              placeholder={item.result === "FAIL" ? "Finding / comment (recommended)" : "Comment (optional)"}
            />
          </div>
        ))}
      </div>

      {anyFail && (
        <div className="mx-4 mb-3 flex items-start gap-2 rounded-[3px] border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
          <AlertCircle size={15} className="mt-0.5 shrink-0" />
          <span>
            One or more items are marked Fail. Submitting will mark this inspection FAILED, place the equipment OUT OF SERVICE, and
            automatically raise a corrective action.
          </span>
        </div>
      )}

      <div className="px-4 py-3">
        <Button type="button" variant="primary" onClick={submit} disabled={submitting}>
          {submitting ? "Submitting…" : mode === "reinspect" ? "Submit Reinspection" : "Submit Inspection"}
        </Button>
      </div>
    </div>
  );
}
