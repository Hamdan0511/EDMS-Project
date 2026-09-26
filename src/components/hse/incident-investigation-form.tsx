"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

const textareaClass =
  "w-full rounded-[3px] border border-border bg-white px-2.5 py-1.5 text-[13px] text-text-primary outline-none placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent";

export function IncidentInvestigationForm({
  incidentId,
  initial,
}: {
  incidentId: string;
  initial: { immediateCause: string; contributingFactors: string; rootCause: string };
}) {
  const router = useRouter();
  const [immediateCause, setImmediateCause] = useState(initial.immediateCause);
  const [contributingFactors, setContributingFactors] = useState(initial.contributingFactors);
  const [rootCause, setRootCause] = useState(initial.rootCause);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    setSubmitting(true);
    const res = await fetch(`/api/hse/incidents/${incidentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ immediateCause, contributingFactors, rootCause }),
    });
    const body = await res.json().catch(() => ({}));
    setSubmitting(false);
    if (!res.ok) {
      setError(body.error ?? "Failed to save the investigation.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      {error && <p className="text-[13px] text-danger">{error}</p>}
      <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
        Immediate Cause
        <textarea rows={2} className={textareaClass} value={immediateCause} onChange={(e) => setImmediateCause(e.target.value)} />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
        Contributing Factors
        <textarea rows={2} className={textareaClass} value={contributingFactors} onChange={(e) => setContributingFactors(e.target.value)} />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
        Root Cause
        <textarea rows={2} className={textareaClass} value={rootCause} onChange={(e) => setRootCause(e.target.value)} />
      </label>
      <Button type="button" variant="secondary" onClick={submit} disabled={submitting} className="w-fit">
        {submitting ? "Saving…" : "Save Investigation"}
      </Button>
    </div>
  );
}
