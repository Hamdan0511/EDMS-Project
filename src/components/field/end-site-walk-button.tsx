"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function EndSiteWalkButton({ walkId }: { walkId: string }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function end() {
    if (!window.confirm("End this site walk? New observations, issues, punch items, and photos will no longer be tagged to it.")) return;
    setSubmitting(true);
    setError(null);
    const res = await fetch(`/api/field/site-walks/${walkId}/end`, { method: "POST" });
    const body = await res.json().catch(() => ({}));
    setSubmitting(false);
    if (!res.ok) {
      setError(body.error ?? "Failed to end the site walk.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      {error && <span className="text-[12px] text-danger">{error}</span>}
      <Button type="button" variant="secondary" onClick={end} disabled={submitting}>
        {submitting ? "Ending…" : "End Walk"}
      </Button>
    </div>
  );
}
