"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { DocumentReference } from "@/components/mail/incoming/attach-document-modal";

type HistoryRow = {
  id: string;
  documentNo: string;
  title: string;
  revisionAtIssue: string;
  isOutdated: boolean;
  mailNumber: string;
  subject: string;
  date: string;
  sender: string;
  senderOrg: string;
  recipients: { name: string; organization: string; type: string }[];
  status: string;
};

export function TransmittalHistoryModal({
  projectId,
  mode,
  organizationOptions,
  onClose,
}: {
  projectId: string;
  mode: "document" | "organization" | null;
  organizationOptions?: { id: string; name: string }[];
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [docResults, setDocResults] = useState<DocumentReference[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (mode !== "document" || selectedDocId) return;
    if (!query.trim()) {
      setDocResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      const res = await fetch(`/api/documents/search?projectId=${projectId}&q=${encodeURIComponent(query)}`).catch(() => null);
      if (res?.ok) setDocResults(await res.json());
    }, 200);
    return () => clearTimeout(timer);
  }, [mode, query, projectId, selectedDocId]);

  useEffect(() => {
    if (!mode) return;
    const param = mode === "document" ? selectedDocId : selectedOrgId;
    if (!param) {
      setRows([]);
      return;
    }
    setLoading(true);
    const key = mode === "document" ? "documentId" : "organizationId";
    fetch(`/api/documents/transmittal-history?projectId=${projectId}&${key}=${param}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        setRows(data);
        setLoading(false);
      });
  }, [mode, selectedDocId, selectedOrgId, projectId]);
  /* eslint-enable react-hooks/set-state-in-effect */

  function close() {
    onClose();
    setQuery("");
    setDocResults([]);
    setSelectedDocId(null);
    setSelectedOrgId("");
    setRows([]);
  }

  return (
    <Modal
      open={mode !== null}
      onClose={close}
      title={mode === "organization" ? "Transmittal History by Organization" : "Transmittal History By Document"}
      width="max-w-2xl"
    >
      <div className="flex flex-col gap-3">
        {mode === "document" && !selectedDocId && (
          <>
            <Input
              placeholder="Search by document number or title…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
            <div className="max-h-56 overflow-y-auto rounded-[3px] border border-border">
              {docResults.map((d) => (
                <button
                  type="button"
                  key={d.id}
                  onClick={() => setSelectedDocId(d.id)}
                  className="flex w-full flex-col items-start border-b border-border px-3 py-2 text-left text-[13px] last:border-b-0 hover:bg-brand-50"
                >
                  <span className="font-medium text-text-primary">{d.documentNo}</span>
                  <span className="text-xs text-text-secondary">{d.title}</span>
                </button>
              ))}
              {query.trim() && docResults.length === 0 && (
                <p className="p-3 text-[13px] text-text-muted">No matching documents.</p>
              )}
            </div>
          </>
        )}

        {mode === "organization" && (
          <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
            Organization
            <Select value={selectedOrgId} onChange={(e) => setSelectedOrgId(e.target.value)}>
              <option value="">-- Select --</option>
              {(organizationOptions ?? []).map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </Select>
          </label>
        )}

        {(selectedDocId || selectedOrgId) && (
          <div className="max-h-96 overflow-y-auto rounded-[3px] border border-border">
            {loading && <p className="p-3 text-[13px] text-text-muted">Loading…</p>}
            {!loading && rows.length === 0 && (
              <p className="p-3 text-[13px] text-text-muted">No transmittal history found.</p>
            )}
            {!loading &&
              rows.map((r) => (
                <div key={r.id} className="border-b border-border p-3 text-[13px] last:border-b-0">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-text-primary">{r.mailNumber}</span>
                    <span className="text-xs text-text-muted">{new Date(r.date).toLocaleDateString("en-GB")}</span>
                  </div>
                  <p className="text-text-secondary">
                    {r.documentNo} — {r.title} · Rev {r.revisionAtIssue}
                    {r.isOutdated && <span className="ml-1 text-amber-700">(superseded by current revision)</span>}
                  </p>
                  <p className="text-xs text-text-muted">
                    From {r.sender} ({r.senderOrg}) to{" "}
                    {r.recipients.map((rec) => `${rec.name} (${rec.organization})`).join(", ") || "—"}
                  </p>
                </div>
              ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
