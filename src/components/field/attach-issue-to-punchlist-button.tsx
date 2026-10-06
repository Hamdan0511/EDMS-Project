"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { AlertCircle, Link2 } from "@/components/ui/icons";

export function AttachIssueToPunchlistButton({
  punchlistId,
  availableIssues,
}: {
  punchlistId: string;
  availableIssues: { id: string; label: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [issueId, setIssueId] = useState(availableIssues[0]?.id ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!issueId) return;
    setSubmitting(true);
    setError(null);
    const res = await fetch(`/api/field/punchlists/${punchlistId}/attach-issue`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ issueId }),
    });
    const body = await res.json().catch(() => ({}));
    setSubmitting(false);
    if (!res.ok) {
      setError(body.error ?? "Failed to attach the issue.");
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(true)} disabled={availableIssues.length === 0}>
        <Link2 size={13} />
        Attach Existing Issue
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Attach Existing Issue">
        <div className="flex flex-col gap-3">
          {error && (
            <div className="flex items-start gap-2 rounded-[3px] border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
              <AlertCircle size={15} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
            Issue
            <Select value={issueId} onChange={(e) => setIssueId(e.target.value)}>
              {availableIssues.map((i) => (
                <option key={i.id} value={i.id}>{i.label}</option>
              ))}
            </Select>
          </label>
          <Button type="button" variant="primary" onClick={submit} disabled={submitting} className="self-start">
            {submitting ? "Attaching…" : "Attach Issue"}
          </Button>
        </div>
      </Modal>
    </>
  );
}
