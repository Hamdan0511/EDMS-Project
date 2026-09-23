"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Activity } from "@/components/ui/icons";

type ActivityEntry = {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  user: string;
  createdAt: string;
  metadata: Record<string, unknown> | null;
};

const ACTION_LABELS: Record<string, string> = {
  TEMPORARY_FILE_UPLOADED: "Uploaded a temporary file",
  TEMPORARY_FILE_REGISTERED: "Registered as an official document",
  TEMPORARY_FILE_DELETED: "Deleted a temporary file",
  DOCUMENT_REVISION_ADDED: "Added a new revision",
  DOCUMENT_METADATA_UPDATED: "Updated metadata",
  DOCUMENT_DELETED: "Deleted a document",
  DOCUMENT_OPENED: "Viewed a document",
  DOCUMENT_DOWNLOADED: "Downloaded a document",
  DOCUMENTS_BULK_STATUS_CHANGED: "Bulk status change",
  DOCUMENTS_BULK_METADATA_UPDATED: "Bulk metadata update",
  DOCUMENTS_BULK_DOWNLOADED: "Bulk ZIP download",
  DOCUMENTS_EXPORTED: "Exported the register to Excel",
  DOCUMENT_SPLIT_PDF: "Split a PDF into temporary files",
  DOCUMENT_TRANSMITTED: "Transmitted",
  PLACEHOLDER_CREATED: "Created a placeholder",
  PRINT_REQUEST_SUBMITTED: "Submitted a print request",
  WORKFLOW_STARTED: "Started a workflow",
  WORKFLOW_STEP_COMPLETED: "Completed a workflow step",
  WORKFLOW_STEP_REJECTED: "Rejected a workflow step",
  DOCUMENT_WORKFLOW_STARTED: "Included in a new workflow",
};

export function DocumentActivityModal({
  projectId,
  open,
  onClose,
}: {
  projectId: string;
  open: boolean;
  onClose: () => void;
}) {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch(`/api/documents/activity?projectId=${projectId}&page=${page}`)
      .then((r) => (r.ok ? r.json() : { entries: [], total: 0 }))
      .then((data) => {
        setEntries(data.entries ?? []);
        setTotal(data.total ?? 0);
        setLoading(false);
      });
  }, [open, projectId, page]);
  /* eslint-enable react-hooks/set-state-in-effect */

  function close() {
    onClose();
    setPage(1);
  }

  const totalPages = Math.max(1, Math.ceil(total / 50));

  return (
    <Modal open={open} onClose={close} title="Document Activity" width="max-w-2xl">
      <div className="flex flex-col gap-3">
        {loading && <p className="text-[13px] text-text-muted">Loading…</p>}
        {!loading && entries.length === 0 && <p className="text-[13px] text-text-muted">No activity recorded yet.</p>}
        <div className="max-h-96 overflow-y-auto rounded-[3px] border border-border">
          {entries.map((e) => (
            <div key={e.id} className="flex items-start justify-between gap-3 border-b border-border px-3 py-2 text-[13px] last:border-b-0">
              <div>
                <span className="font-medium text-text-primary">{e.user}</span>{" "}
                <span className="text-text-secondary">{ACTION_LABELS[e.action] ?? e.action}</span>
                {typeof e.metadata?.documentNo === "string" && (
                  <span className="text-text-muted"> — {e.metadata.documentNo as string}</span>
                )}
              </div>
              <span className="shrink-0 text-xs text-text-muted">
                {new Date(e.createdAt).toLocaleString("en-GB")}
              </span>
            </div>
          ))}
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between text-xs text-text-secondary">
            <Button type="button" variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <span>
              Page {page} of {totalPages}
            </span>
            <Button type="button" variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}

/** Self-contained convenience wrapper for placing the Document Activity
 * entry point outside the main action toolbar (e.g. a compact register
 * header) without duplicating open-state plumbing at each call site. */
export function DocumentActivityButton({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <Activity size={13} />
        Document Activity
      </Button>
      <DocumentActivityModal projectId={projectId} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
