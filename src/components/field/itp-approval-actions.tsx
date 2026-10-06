"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function ItpApprovalActions({ itpId }: { itpId: string }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function decide(status: "APPROVED" | "REJECTED") {
    if (status === "APPROVED" && !window.confirm("Approve this ITP? Any Hold Point activities will become active.")) return;
    setSubmitting(true);
    setError(null);
    const res = await fetch(`/api/field/itp/${itpId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const body = await res.json().catch(() => ({}));
    setSubmitting(false);
    if (!res.ok) {
      setError(body.error ?? "Failed.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      {error && <span className="text-[11px] text-danger">{error}</span>}
      <Button type="button" variant="primary" size="sm" onClick={() => decide("APPROVED")} disabled={submitting}>
        Approve ITP
      </Button>
      <Button type="button" variant="secondary" size="sm" onClick={() => decide("REJECTED")} disabled={submitting}>
        Reject
      </Button>
    </div>
  );
}
