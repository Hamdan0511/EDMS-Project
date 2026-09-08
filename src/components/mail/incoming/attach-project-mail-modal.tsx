"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type MailReference = {
  id: string;
  mailNumber: string;
  subject: string;
  senderName: string;
  typeName: string;
  date: string;
};

export function AttachProjectMailModal({
  open,
  onClose,
  projectId,
  excludeId,
  selected,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  projectId: string;
  excludeId?: string;
  selected: MailReference[];
  onAdd: (mail: MailReference) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MailReference[]>([]);
  const [loading, setLoading] = useState(false);

  // Debounced search-as-you-type against the live mail search API —
  // intentional use of setState in an effect.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setLoading(true);
    const timer = setTimeout(async () => {
      const params = new URLSearchParams({ projectId, q: query });
      if (excludeId) params.set("excludeId", excludeId);
      const res = await fetch(`/api/mail/search?${params.toString()}`, {
        signal: controller.signal,
      }).catch(() => null);
      if (res?.ok) setResults(await res.json());
      setLoading(false);
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [open, query, projectId, excludeId]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const selectedIds = new Set(selected.map((m) => m.id));

  return (
    <Modal open={open} onClose={onClose} title="Attach Project Mail" width="max-w-lg">
      <div className="flex flex-col gap-3">
        <Input
          placeholder="Search by mail number, subject, sender, or type…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
        <div className="max-h-72 overflow-y-auto rounded-[3px] border border-border">
          {loading && <p className="p-3 text-[13px] text-text-muted">Searching…</p>}
          {!loading && results.length === 0 && (
            <p className="p-3 text-[13px] text-text-muted">No project mail found.</p>
          )}
          {!loading &&
            results.map((mail) => {
              const isSelected = selectedIds.has(mail.id);
              return (
                <button
                  type="button"
                  key={mail.id}
                  disabled={isSelected}
                  onClick={() => onAdd(mail)}
                  className={`flex w-full flex-col items-start border-b border-border px-3 py-2 text-left text-[13px] last:border-b-0 ${
                    isSelected ? "cursor-not-allowed bg-brand-50 opacity-60" : "hover:bg-brand-50"
                  }`}
                >
                  <span className="font-medium text-text-primary">{mail.mailNumber}</span>
                  <span className="text-xs text-text-secondary">
                    {mail.subject} · {mail.senderName} · {new Date(mail.date).toLocaleDateString("en-GB")}
                  </span>
                  {isSelected && <span className="mt-0.5 text-xs text-brand-700">Already attached</span>}
                </button>
              );
            })}
        </div>
        <div className="flex justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </Modal>
  );
}
