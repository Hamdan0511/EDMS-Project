"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { AlertCircle, FileText, Link2 } from "@/components/ui/icons";

export type FieldDocumentReferenceItem = {
  id: string;
  documentId: string;
  documentNo: string;
  documentTitle: string;
  revisionAtIssue: string | null;
  linkedByName: string;
  linkedAt: string;
};

type DocumentSearchResult = { id: string; documentNo: string; title: string; revision: string; typeName: string | null };

export function FieldDocumentReferences({
  recordType,
  recordId,
  projectId,
  items,
  canLink,
  onChanged,
}: {
  recordType: string;
  recordId: string;
  projectId: string;
  items: FieldDocumentReferenceItem[];
  canLink: boolean;
  onChanged?: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<DocumentSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const alreadyLinkedIds = new Set(items.map((i) => i.documentId));

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const t = setTimeout(() => {
      if (cancelled) return;
      setSearching(true);
      fetch(`/api/documents/search?${new URLSearchParams({ projectId, q: query }).toString()}`)
        .then((res) => res.json())
        .catch(() => [])
        .then((body) => {
          if (cancelled) return;
          setResults(Array.isArray(body) ? body : []);
          setSearching(false);
        });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [open, query, projectId]);

  const filtered = results.filter((d) => !alreadyLinkedIds.has(d.id));

  async function link(documentId: string) {
    setError(null);
    setSubmitting(true);
    const res = await fetch("/api/field/document-references", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recordType, recordId, documentId }),
    });
    const body = await res.json().catch(() => ({}));
    setSubmitting(false);
    if (!res.ok) {
      setError(body.error ?? "Failed to link the document.");
      return;
    }
    setOpen(false);
    setQuery("");
    router.refresh();
    onChanged?.();
  }

  return (
    <div className="flex flex-col gap-3">
      {items.length === 0 ? (
        <p className="text-[13px] text-text-muted">No documents or drawings linked yet.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border rounded-[3px] border border-border bg-white">
          {items.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-2 px-3 py-2 text-[13px]">
              <Link href={`/documents/${item.documentId}`} className="flex items-center gap-2 text-brand-700 hover:underline">
                <FileText size={14} />
                {item.documentNo} — {item.documentTitle}
              </Link>
              <span className="shrink-0 text-[11px] text-text-muted">
                Rev {item.revisionAtIssue ?? "—"} · linked by {item.linkedByName}
              </span>
            </li>
          ))}
        </ul>
      )}

      {canLink && (
        <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(true)} className="self-start">
          <Link2 size={13} />
          Link Document / Drawing
        </Button>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Link Document / Drawing">
        <div className="flex flex-col gap-3">
          {error && (
            <div className="flex items-start gap-2 rounded-[3px] border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
              <AlertCircle size={15} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search document number or title…" autoFocus />
          <ul className="max-h-72 overflow-y-auto rounded-[3px] border border-border">
            {searching ? (
              <li className="px-3 py-2 text-[13px] text-text-muted">Searching…</li>
            ) : filtered.length === 0 ? (
              <li className="px-3 py-2 text-[13px] text-text-muted">No matching documents.</li>
            ) : (
              filtered.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-2 border-b border-border px-3 py-2 text-[13px] last:border-b-0">
                  <span className="min-w-0 truncate">{d.documentNo} — {d.title} <span className="text-text-muted">Rev {d.revision}</span></span>
                  <Button type="button" variant="secondary" size="sm" onClick={() => link(d.id)} disabled={submitting}>
                    Link
                  </Button>
                </li>
              ))
            )}
          </ul>
        </div>
      </Modal>
    </div>
  );
}
