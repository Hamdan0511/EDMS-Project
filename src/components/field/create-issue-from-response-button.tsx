"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AlertCircle, TriangleAlert } from "@/components/ui/icons";

export function CreateIssueFromResponseButton({ responseId }: { responseId: string }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    setSubmitting(true);
    setError(null);
    const res = await fetch(`/api/field/inspection-responses/${responseId}/create-issue`, { method: "POST" });
    const body = await res.json().catch(() => ({}));
    setSubmitting(false);
    if (!res.ok) {
      setError(body.error ?? "Failed to create the issue.");
      return;
    }
    router.push(`/field/issues/${body.id}`);
  }

  return (
    <div className="flex items-center gap-2">
      {error && (
        <span className="flex items-center gap-1 text-[11px] text-danger">
          <AlertCircle size={12} />
          {error}
        </span>
      )}
      <Button type="button" variant="secondary" size="sm" onClick={create} disabled={submitting}>
        <TriangleAlert size={12} />
        {submitting ? "Creating…" : "Create Issue"}
      </Button>
    </div>
  );
}
