"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function TerminateWorkflowButton({ workflowId }: { workflowId: string }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  async function terminate() {
    const reason = window.prompt("Reason for terminating this workflow:");
    if (!reason || !reason.trim()) return;
    if (!window.confirm("Terminate this workflow? All active/pending steps will be marked terminated. This cannot be undone.")) {
      return;
    }
    setSubmitting(true);
    const res = await fetch(`/api/workflows/${workflowId}/terminate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      window.alert(body.error ?? "Failed to terminate the workflow.");
      return;
    }
    router.refresh();
  }

  return (
    <Button type="button" variant="secondary" onClick={terminate} disabled={submitting}>
      {submitting ? "Terminating..." : "Terminate Workflow"}
    </Button>
  );
}
