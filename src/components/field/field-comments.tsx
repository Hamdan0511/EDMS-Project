"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export type FieldCommentItem = {
  id: string;
  authorName: string;
  body: string;
  createdAt: string;
};

/** Simple polymorphic comment thread reused by every Field detail page. */
export function FieldComments({
  recordType,
  recordId,
  items,
  canComment,
  onChanged,
}: {
  recordType: string;
  recordId: string;
  items: FieldCommentItem[];
  canComment: boolean;
  /** Called in addition to router.refresh() — lets a client-side consumer
   * (e.g. a detail drawer holding its own fetched copy of this data) also
   * re-fetch, since refresh() alone only re-runs server components. */
  onChanged?: () => void;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!body.trim()) return;
    setError(null);
    setSubmitting(true);
    const res = await fetch("/api/field/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recordType, recordId, body }),
    });
    const resBody = await res.json().catch(() => ({}));
    setSubmitting(false);
    if (!res.ok) {
      setError(resBody.error ?? "Failed to add the comment.");
      return;
    }
    setBody("");
    router.refresh();
    onChanged?.();
  }

  return (
    <div className="flex flex-col gap-3 px-4 py-3">
      {items.length === 0 ? (
        <p className="text-[13px] text-text-muted">No comments yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((c) => (
            <li key={c.id} className="rounded-[3px] border border-border bg-background px-3 py-2">
              <p className="text-[13px] text-text-primary">{c.body}</p>
              <p className="mt-1 text-[11px] text-text-muted">
                {c.authorName} · {new Date(c.createdAt).toLocaleString("en-GB")}
              </p>
            </li>
          ))}
        </ul>
      )}

      {canComment && (
        <div className="flex flex-col gap-2">
          {error && <p className="text-[12px] text-danger">{error}</p>}
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={2}
            placeholder="Add a comment…"
            className="w-full rounded-[3px] border border-border bg-white px-2.5 py-1.5 text-[13px] text-text-primary outline-none placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent"
          />
          <Button type="button" variant="secondary" size="sm" onClick={submit} disabled={submitting || !body.trim()} className="self-start">
            {submitting ? "Posting…" : "Post Comment"}
          </Button>
        </div>
      )}
    </div>
  );
}
