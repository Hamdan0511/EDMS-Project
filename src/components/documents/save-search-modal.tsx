"use client";

import { useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle } from "@/components/ui/icons";

/** Persists the CURRENT Document Register search/filter/sort state as a
 * real SavedSearch row (module: DOCUMENTS) — not just in-memory UI state.
 * The sidebar listens for the "saved-search-created" event to refresh. */
export function SaveSearchModal({ projectId, open, onClose }: { projectId: string; open: boolean; onClose: () => void }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function close() {
    if (submitting) return;
    onClose();
    setName("");
    setError(null);
  }

  async function submit() {
    if (!name.trim()) {
      setError("A name is required.");
      return;
    }
    setError(null);
    setSubmitting(true);
    // Stash which register page (Document Register vs. Drawings) this
    // search was saved from, so re-running it lands back on the right page
    // instead of always /documents.
    const filters = { ...Object.fromEntries(searchParams.entries()), __path: pathname };
    const res = await fetch("/api/saved-searches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, module: "DOCUMENTS", name, filters }),
    });
    const body = await res.json().catch(() => ({}));
    setSubmitting(false);
    if (!res.ok) {
      setError(body.error ?? "Failed to save the search.");
      return;
    }
    window.dispatchEvent(new Event("saved-search-created"));
    close();
  }

  return (
    <Modal open={open} onClose={close} title="Save Search As" width="max-w-sm">
      <div className="flex flex-col gap-3">
        <p className="text-xs text-text-secondary">Saves the current search, filters, and sort for reuse later.</p>
        {error && (
          <div className="flex items-start gap-2 rounded-[3px] border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
            <AlertCircle size={15} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
          Name *
          <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </label>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={close} disabled={submitting}>
            Cancel
          </Button>
          <Button type="button" variant="primary" onClick={submit} disabled={submitting}>
            {submitting ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
