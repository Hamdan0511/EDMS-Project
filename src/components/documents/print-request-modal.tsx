"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2 } from "@/components/ui/icons";

/** A real, persisted print request — distinct from the existing browser
 * Print action, which never creates a record. */
export function PrintRequestModal({
  projectId,
  documentIds,
  open,
  onClose,
}: {
  projectId: string;
  documentIds: string[];
  open: boolean;
  onClose: () => void;
}) {
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedId, setSubmittedId] = useState<string | null>(null);

  function close() {
    if (submitting) return;
    onClose();
    setDetails("");
    setError(null);
    setSubmittedId(null);
  }

  async function submit() {
    if (!details.trim()) {
      setError("Please describe what you need printed (copies, delivery, print shop, etc.).");
      return;
    }
    setError(null);
    setSubmitting(true);
    const res = await fetch("/api/print-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, details, documentIds }),
    });
    const body = await res.json().catch(() => ({}));
    setSubmitting(false);
    if (!res.ok) {
      setError(body.error ?? "Failed to submit the print request.");
      return;
    }
    setSubmittedId(body.id);
  }

  return (
    <Modal open={open} onClose={close} title="Submit a Print Request" width="max-w-md">
      <div className="flex flex-col gap-3">
        {submittedId ? (
          <>
            <div className="flex items-center gap-2 rounded-[3px] border border-emerald-200 bg-emerald-50 px-3 py-2 text-[13px] text-emerald-800">
              <CheckCircle2 size={15} />
              Print request submitted for {documentIds.length} document(s).
            </div>
            <div className="flex justify-end">
              <Button type="button" variant="primary" onClick={close}>
                Done
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-xs text-text-secondary">
              Requesting print for <span className="font-medium text-text-primary">{documentIds.length}</span> selected
              document(s).
            </p>
            {error && (
              <div className="flex items-start gap-2 rounded-[3px] border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
                <AlertCircle size={15} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
              Request Details *
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                rows={4}
                placeholder="e.g. 2 hard copies, A1 size, deliver to site office by Thursday"
                className="w-full rounded-[3px] border border-border bg-white px-2.5 py-1.5 text-[13px] text-text-primary outline-none focus:border-accent focus:ring-1 focus:ring-accent"
              />
            </label>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={close} disabled={submitting}>
                Cancel
              </Button>
              <Button type="button" variant="primary" onClick={submit} disabled={submitting}>
                {submitting ? "Submitting..." : "Submit Request"}
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
