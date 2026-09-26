"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { LIKELIHOOD_OPTIONS, SEVERITY_OPTIONS } from "@/lib/hse/risk-matrix";

/** Sets the residual risk (post-controls) on a Hazard or Risk Assessment —
 * a real recalculation via calculateRiskLevel on the server, not free text. */
export function HseResidualRiskForm({ apiPath }: { apiPath: string }) {
  const router = useRouter();
  const [likelihood, setLikelihood] = useState(LIKELIHOOD_OPTIONS[0].value);
  const [severity, setSeverity] = useState(SEVERITY_OPTIONS[0].value);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    setSubmitting(true);
    const res = await fetch(apiPath, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ residualLikelihood: likelihood, residualSeverity: severity }),
    });
    const body = await res.json().catch(() => ({}));
    setSubmitting(false);
    if (!res.ok) {
      setError(body.error ?? "Failed to update residual risk.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-end gap-2">
      {error && <p className="w-full text-[12px] text-danger">{error}</p>}
      <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
        Residual Likelihood
        <Select value={likelihood} onChange={(e) => setLikelihood(e.target.value as never)} className="w-44">
          {LIKELIHOOD_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </Select>
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
        Residual Severity
        <Select value={severity} onChange={(e) => setSeverity(e.target.value as never)} className="w-44">
          {SEVERITY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </Select>
      </label>
      <Button type="button" variant="secondary" onClick={submit} disabled={submitting}>
        {submitting ? "Saving…" : "Set Residual Risk"}
      </Button>
    </div>
  );
}
