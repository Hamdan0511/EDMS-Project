"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function ItpItemActions({
  itemId,
  status,
  canManage,
  canApprove,
}: {
  itemId: string;
  status: string;
  canManage: boolean;
  canApprove: boolean;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function requestInspection() {
    setSubmitting(true);
    setError(null);
    const res = await fetch(`/api/field/itp-items/${itemId}/request-inspection`, { method: "POST" });
    const body = await res.json().catch(() => ({}));
    setSubmitting(false);
    if (!res.ok) {
      setError(body.error ?? "Failed.");
      return;
    }
    router.refresh();
  }

  async function decide(decision: "approve" | "reject") {
    setSubmitting(true);
    setError(null);
    const res = await fetch(`/api/field/itp-items/${itemId}/decision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision }),
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
      {status === "HOLD_ACTIVE" && canManage && (
        <Button type="button" variant="secondary" size="sm" onClick={requestInspection} disabled={submitting}>
          Request Inspection
        </Button>
      )}
      {status === "INSPECTION_REQUESTED" && canApprove && (
        <>
          <Button type="button" variant="primary" size="sm" onClick={() => decide("approve")} disabled={submitting}>
            Approve &amp; Release
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={() => decide("reject")} disabled={submitting}>
            Reject
          </Button>
        </>
      )}
    </div>
  );
}
