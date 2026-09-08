"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Download, X } from "@/components/ui/icons";
import { DOCUMENT_STATUS_OPTIONS } from "@/lib/documents/status";
import type { DocumentStatus } from "@prisma/client";

export function BulkActionsBar({
  selectedIds,
  canManage,
  onClear,
}: {
  selectedIds: string[];
  canManage: boolean;
  onClear: () => void;
}) {
  const router = useRouter();
  const [downloading, setDownloading] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);
  const [bulkStatus, setBulkStatus] = useState<DocumentStatus>("APPROVED");
  const [error, setError] = useState<string | null>(null);

  if (selectedIds.length === 0) return null;

  async function handleDownload() {
    setError(null);
    setDownloading(true);
    try {
      const res = await fetch("/api/documents/bulk/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentIds: selectedIds }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Failed to download the selected documents.");
        setDownloading(false);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `documents-export-${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError("Network error while preparing the download.");
    }
    setDownloading(false);
  }

  async function handleChangeStatus() {
    setError(null);
    setChangingStatus(true);
    try {
      const res = await fetch("/api/documents/bulk/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentIds: selectedIds, status: bulkStatus }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error ?? "Failed to update status.");
        setChangingStatus(false);
        return;
      }
      onClear();
      router.refresh();
    } catch {
      setError("Network error while updating status.");
    }
    setChangingStatus(false);
  }

  return (
    <div className="mb-3 flex flex-wrap items-center gap-3 rounded-[3px] border border-accent bg-brand-50 px-3 py-2">
      <span className="text-[13px] font-medium text-text-primary">
        {selectedIds.length} document{selectedIds.length === 1 ? "" : "s"} selected
      </span>

      <Button type="button" variant="secondary" size="sm" onClick={handleDownload} disabled={downloading}>
        <Download size={13} />
        {downloading ? "Preparing…" : "Download (ZIP)"}
      </Button>

      {canManage && (
        <div className="flex items-center gap-1.5">
          <div className="w-48">
            <Select
              aria-label="Bulk change status"
              value={bulkStatus}
              onChange={(e) => setBulkStatus(e.target.value as DocumentStatus)}
            >
              {DOCUMENT_STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </div>
          <Button type="button" variant="secondary" size="sm" onClick={handleChangeStatus} disabled={changingStatus}>
            {changingStatus ? "Updating…" : "Change Status"}
          </Button>
        </div>
      )}

      {error && <span className="text-[12px] text-red-700">{error}</span>}

      <button
        type="button"
        onClick={onClear}
        className="ml-auto flex items-center gap-1 text-xs text-text-secondary hover:text-text-primary"
      >
        <X size={13} />
        Clear selection
      </button>
    </div>
  );
}
