"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { AlertCircle } from "@/components/ui/icons";

type OutcomeOption = { code: string; label: string };

export function ReviewStepForm({
  workflowId,
  stepId,
  commentsRequired,
  outcomeOptions,
}: {
  workflowId: string;
  stepId: string;
  commentsRequired: boolean;
  outcomeOptions: OutcomeOption[];
}) {
  const router = useRouter();
  const [outcomeCode, setOutcomeCode] = useState(outcomeOptions[0]?.code ?? "");
  const [comments, setComments] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (commentsRequired && !comments.trim()) {
      setError("Comments are required for this step.");
      return;
    }
    setError(null);
    setSubmitting(true);
    const res = await fetch(`/api/workflows/${workflowId}/steps/${stepId}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ outcomeCode, comments: comments.trim() || undefined }),
    });
    const body = await res.json().catch(() => ({}));
    setSubmitting(false);
    if (!res.ok) {
      setError(body.error ?? "Failed to submit the review.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="rounded-[3px] border border-brand-200 bg-brand-50 p-3" data-testid={`review-step-form-${stepId}`}>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-800">Submit Your Review</p>
      {error && (
        <div className="mb-2 flex items-start gap-2 rounded-[3px] border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
          <AlertCircle size={15} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      <label className="mb-2 flex flex-col gap-1 text-xs font-medium text-text-secondary">
        Outcome *
        <Select value={outcomeCode} onChange={(e) => setOutcomeCode(e.target.value)}>
          {outcomeOptions.map((o) => (
            <option key={o.code} value={o.code}>
              {o.label}
            </option>
          ))}
        </Select>
      </label>
      <label className="mb-2 flex flex-col gap-1 text-xs font-medium text-text-secondary">
        Comments {commentsRequired ? "*" : ""}
        <textarea
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          rows={3}
          className="w-full rounded-[3px] border border-border bg-white px-2.5 py-1.5 text-[13px] text-text-primary outline-none placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent"
        />
      </label>
      <Button type="button" variant="primary" onClick={submit} disabled={submitting}>
        {submitting ? "Submitting..." : "Submit Review"}
      </Button>
    </div>
  );
}
