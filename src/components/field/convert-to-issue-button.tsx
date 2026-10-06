"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AlertCircle, TriangleAlert } from "@/components/ui/icons";

export function ConvertToIssueButton({ apiPath }: { apiPath: string }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function convert() {
    if (!window.confirm("Convert this observation into a Site Issue requiring action?")) return;
    setSubmitting(true);
    setError(null);
    const res = await fetch(apiPath, { method: "POST" });
    const body = await res.json().catch(() => ({}));
    setSubmitting(false);
    if (!res.ok) {
      setError(body.error ?? "Failed to convert to an issue.");
      return;
    }
    router.push(`/field/issues/${body.id}`);
  }

  return (
    <div className="flex items-center gap-2">
      {error && (
        <span className="flex items-center gap-1 text-[12px] text-danger">
          <AlertCircle size={13} />
          {error}
        </span>
      )}
      <Button type="button" variant="secondary" size="sm" onClick={convert} disabled={submitting}>
        <TriangleAlert size={13} />
        {submitting ? "Converting…" : "Convert to Issue"}
      </Button>
    </div>
  );
}
