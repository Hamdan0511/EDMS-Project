"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type DocumentReference = {
  id: string;
  documentNo: string;
  title: string;
  revision: string;
  typeName: string | null;
};

export function AttachDocumentModal({
  open,
  onClose,
  projectId,
  selected,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  projectId: string;
  selected: DocumentReference[];
  onAdd: (doc: DocumentReference) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<DocumentReference[]>([]);
  const [loading, setLoading] = useState(false);

  // Debounced search-as-you-type against the live directory/document API —
  // intentional use of setState in an effect.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setLoading(true);
    const timer = setTimeout(async () => {
      const res = await fetch(
        `/api/documents/search?projectId=${projectId}&q=${encodeURIComponent(query)}`,
        { signal: controller.signal },
      ).catch(() => null);
      if (res?.ok) setResults(await res.json());
      setLoading(false);
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [open, query, projectId]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const selectedIds = new Set(selected.map((d) => d.id));

  return (
    <Modal open={open} onClose={onClose} title="Attach Document" width="max-w-lg">
      <div className="flex flex-col gap-3">
        <Input
          placeholder="Search by document number, title, or type…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
        <div className="max-h-72 overflow-y-auto rounded-[3px] border border-border">
          {loading && <p className="p-3 text-[13px] text-text-muted">Searching…</p>}
          {!loading && results.length === 0 && (
            <p className="p-3 text-[13px] text-text-muted">No documents found in this project.</p>
          )}
          {!loading &&
            results.map((doc) => {
              const isSelected = selectedIds.has(doc.id);
              return (
                <button
                  type="button"
                  key={doc.id}
                  disabled={isSelected}
                  onClick={() => onAdd(doc)}
                  className={`flex w-full flex-col items-start border-b border-border px-3 py-2 text-left text-[13px] last:border-b-0 ${
                    isSelected ? "cursor-not-allowed bg-brand-50 opacity-60" : "hover:bg-brand-50"
                  }`}
                >
                  <span className="font-medium text-text-primary">
                    {doc.documentNo} — Rev {doc.revision}
                  </span>
                  <span className="text-xs text-text-secondary">
                    {doc.title} {doc.typeName ? `· ${doc.typeName}` : ""}
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
