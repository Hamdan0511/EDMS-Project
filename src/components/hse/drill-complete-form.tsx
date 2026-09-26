"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "@/components/ui/icons";
import { EMERGENCY_DRILL_RESULT_LABELS } from "@/lib/hse/status";

const textareaClass =
  "w-full rounded-[3px] border border-border bg-white px-2.5 py-1.5 text-[13px] text-text-primary outline-none placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent";

export function DrillCompleteForm({ drillId, defaultParticipants }: { drillId: string; defaultParticipants?: number }) {
  const router = useRouter();
  const [result, setResult] = useState("SATISFACTORY");
  const [actualParticipants, setActualParticipants] = useState(defaultParticipants ? String(defaultParticipants) : "");
  const [observations, setObservations] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    setSubmitting(true);
    const res = await fetch(`/api/hse/emergency/drills/${drillId}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        result,
        actualParticipants: actualParticipants ? Number(actualParticipants) : undefined,
        observations: observations || undefined,
      }),
    });
    const body = await res.json().catch(() => ({}));
    setSubmitting(false);
    if (!res.ok) {
      setError(body.error ?? "Failed to complete the drill.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <div className="flex items-start gap-2 rounded-[3px] border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
          <AlertCircle size={15} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
          Overall Result
          <Select value={result} onChange={(e) => setResult(e.target.value)}>
            {Object.entries(EMERGENCY_DRILL_RESULT_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </Select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
          Actual Participants
          <Input type="number" min={0} value={actualParticipants} onChange={(e) => setActualParticipants(e.target.value)} />
        </label>
      </div>
      <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
        Observations
        <textarea rows={3} className={textareaClass} value={observations} onChange={(e) => setObservations(e.target.value)} />
      </label>
      <Button type="button" variant="primary" onClick={submit} disabled={submitting} className="self-start">
        {submitting ? "Completing…" : "Complete Drill"}
      </Button>
    </div>
  );
}
