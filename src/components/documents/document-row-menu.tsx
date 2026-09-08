"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Dropdown } from "@/components/ui/dropdown";
import { ChevronDown, Eye, Download, Printer, GitBranch, Pencil, Trash2 } from "@/components/ui/icons";
import { NewRevisionModal } from "./new-revision-modal";
import { EditMetadataModal, type DocumentMetadataInitial } from "./edit-metadata-modal";

export function DocumentRowMenu({
  documentId,
  documentNo,
  title,
  currentRevision,
  hasFile,
  canManage,
  metadata,
  documentTypeNames,
}: {
  documentId: string;
  documentNo: string;
  title: string;
  currentRevision: string;
  hasFile: boolean;
  canManage: boolean;
  metadata: DocumentMetadataInitial;
  documentTypeNames: string[];
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [revisionModalOpen, setRevisionModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);

  async function handleDelete(close: () => void) {
    if (!confirm(`Delete document "${documentNo} — ${title}"? This cannot be undone.`)) return;
    setDeleting(true);
    const res = await fetch(`/api/documents/${documentId}`, { method: "DELETE" });
    close();
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      alert(body.error ?? "Failed to delete the document.");
      setDeleting(false);
      return;
    }
    router.refresh();
  }

  const itemClass = "flex w-full items-center gap-1.5 px-3 py-2 text-left text-[13px] text-text-primary hover:bg-brand-50";

  return (
    <>
      <Dropdown
        align="right"
        trigger={({ toggle, open }) => (
          <button
            type="button"
            onClick={toggle}
            className="flex items-center gap-1 rounded-[3px] border border-border bg-white px-2 py-1 text-xs text-text-primary hover:bg-brand-50"
          >
            Actions
            <ChevronDown size={11} className={`transition-transform ${open ? "rotate-180" : ""}`} />
          </button>
        )}
      >
        {(close) => (
          <div className="w-52 py-1">
            <Link href={`/documents/${documentId}`} onClick={close} className={itemClass}>
              <Eye size={13} />
              View
            </Link>
            {hasFile && (
              <a href={`/api/documents/${documentId}/file?download=1`} onClick={close} className={itemClass}>
                <Download size={13} />
                Download
              </a>
            )}
            {hasFile && (
              <a href={`/document-print/${documentId}`} target="_blank" rel="noopener noreferrer" onClick={close} className={itemClass}>
                <Printer size={13} />
                Print
              </a>
            )}
            {canManage && (
              <button
                type="button"
                className={itemClass}
                onClick={() => {
                  close();
                  setRevisionModalOpen(true);
                }}
              >
                <GitBranch size={13} />
                Create New Revision
              </button>
            )}
            {canManage && (
              <button
                type="button"
                className={itemClass}
                onClick={() => {
                  close();
                  setEditModalOpen(true);
                }}
              >
                <Pencil size={13} />
                Edit Metadata
              </button>
            )}
            {canManage && (
              <button type="button" disabled={deleting} onClick={() => handleDelete(close)} className={`${itemClass} text-red-700`}>
                <Trash2 size={13} />
                {deleting ? "Deleting..." : "Delete"}
              </button>
            )}
          </div>
        )}
      </Dropdown>

      {canManage && (
        <NewRevisionModal
          documentId={documentId}
          suggestedRevision={nextRevisionGuess(currentRevision)}
          open={revisionModalOpen}
          onClose={() => setRevisionModalOpen(false)}
        />
      )}
      {canManage && (
        <EditMetadataModal
          documentId={documentId}
          initial={metadata}
          documentTypeNames={documentTypeNames}
          open={editModalOpen}
          onClose={() => setEditModalOpen(false)}
        />
      )}
    </>
  );
}

function nextRevisionGuess(current: string): string {
  const match = /^([A-Za-z]*)(\d+)$/.exec(current.trim());
  if (match) {
    return `${match[1]}${Number(match[2]) + 1}`;
  }
  return current;
}
