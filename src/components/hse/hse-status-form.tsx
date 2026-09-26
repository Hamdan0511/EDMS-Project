"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

/** Shared status-transition control for HSE detail pages — every change is
 * a real PATCH, audited server-side, never a client-only state flip. */
export function HseStatusForm({
  apiPath,
  currentStatus,
  options,
  extraBody,
}: {
  apiPath: string;
  currentStatus: string;
  options: { value: string; label: string }[];
  extraBody?: Record<string, unknown>;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    setSubmitting(true);
    const res = await fetch(apiPath, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, ...extraBody }),
    });
    const body = await res.json().catch(() => ({}));
    setSubmitting(false);
    if (!res.ok) {
      setError(body.error ?? "Failed to update status.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      {error && <span className="text-[12px] text-danger">{error}</span>}
      <div className="w-56">
        <Select value={status} onChange={(e) => setStatus(e.target.value)}>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </div>
      <Button type="button" variant="secondary" onClick={submit} disabled={submitting || status === currentStatus}>
        {submitting ? "Saving…" : "Update Status"}
      </Button>
    </div>
  );
}
