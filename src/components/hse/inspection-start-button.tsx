"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function InspectionStartButton({ inspectionId }: { inspectionId: string }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setError(null);
    setSubmitting(true);
    const res = await fetch(`/api/hse/inspections/${inspectionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "start" }),
    });
    const body = await res.json().catch(() => ({}));
    setSubmitting(false);
    if (!res.ok) {
      setError(body.error ?? "Failed to start the inspection.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-1">
      {error && <p className="text-[12px] text-danger">{error}</p>}
      <Button type="button" variant="primary" onClick={start} disabled={submitting} className="w-fit">
        {submitting ? "Starting…" : "Start Inspection"}
      </Button>
    </div>
  );
}
