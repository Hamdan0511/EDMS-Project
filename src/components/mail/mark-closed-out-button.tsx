"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "@/components/ui/icons";

export function MarkClosedOutButton({
  mailId,
  currentStatus,
}: {
  mailId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (currentStatus === "Closed-Out") return null;

  async function markClosedOut() {
    setPending(true);
    setError(null);
    const res = await fetch(`/api/mail/${mailId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workflowStatus: "CLOSED_OUT" }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to update status");
      setPending(false);
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      <Button type="button" variant="secondary" disabled={pending} onClick={markClosedOut}>
        <CheckCircle2 size={14} />
        {pending ? "Updating..." : "Mark as Closed-Out"}
      </Button>
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  );
}
