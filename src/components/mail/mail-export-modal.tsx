"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";

export type MailExportSelection =
  | { mode: "IDS"; ids: string[] }
  | { mode: "ALL_RESULTS"; query: Record<string, string | undefined>; excludedIds: string[] };

export function MailExportModal({
  open,
  onClose,
  projectId,
  selection,
}: {
  open: boolean;
  onClose: () => void;
  projectId: string;
  selection: MailExportSelection;
}) {
  const [pending, setPending] = useState<"ROW_PER_RECIPIENT" | "ROW_PER_MAIL" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runExport(mode: "ROW_PER_RECIPIENT" | "ROW_PER_MAIL") {
    setError(null);
    setPending(mode);
    try {
      const res = await fetch("/api/mail/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, mode, selection }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Failed to generate the export. Please try again.");
        setPending(null);
        return;
      }
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="([^"]+)"/);
      const filename = match?.[1] ?? "MailExport.xlsx";

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      setPending(null);
      onClose();
    } catch {
      setError("Network error — please try again.");
      setPending(null);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Export to Excel" width="max-w-md">
      <div className="flex flex-col gap-4 text-[13px] text-text-primary">
        {error && (
          <div className="rounded-[3px] border border-danger/30 bg-red-50 px-3 py-2 text-[12px] text-danger">{error}</div>
        )}
        <p className="font-medium text-text-secondary">Either</p>
        <ul className="flex flex-col gap-2 pl-4 text-text-secondary">
          <li className="list-disc">
            <span className="text-text-primary">Export a row per recipient</span> — this supports all columns.
          </li>
          <li className="list-disc">
            <span className="text-text-primary">Export a row per mail</span> — this does not support all columns. Some
            columns may be excluded.
          </li>
        </ul>

        <div className="mt-2 flex flex-col gap-2">
          <Button
            type="button"
            variant="primary"
            className="w-full justify-center"
            disabled={pending !== null}
            onClick={() => runExport("ROW_PER_RECIPIENT")}
          >
            {pending === "ROW_PER_RECIPIENT" ? "Generating Excel…" : "Row per recipient"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="w-full justify-center"
            disabled={pending !== null}
            onClick={() => runExport("ROW_PER_MAIL")}
          >
            {pending === "ROW_PER_MAIL" ? "Generating Excel…" : "Row per mail"}
          </Button>
        </div>

        <div className="mt-1 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={pending !== null}
            className="text-[13px] text-text-secondary hover:text-text-primary hover:underline"
          >
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  );
}
