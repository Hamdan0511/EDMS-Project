"use client";

import { useState } from "react";
import { Dropdown } from "@/components/ui/dropdown";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "@/components/ui/icons";
import { MailExportModal, type MailExportSelection } from "./mail-export-modal";
import type { MailSelectionState } from "./mail-selection-store";

export function MailSelectionBar({
  count,
  total,
  projectId,
  queryParams,
  selection,
  onSelectCurrentPage,
  onSelectAllResults,
  onClearSelection,
}: {
  count: number;
  total: number;
  projectId: string;
  queryParams: Record<string, string | undefined>;
  selection: MailSelectionState;
  onSelectCurrentPage: () => void;
  onSelectAllResults: () => void;
  onClearSelection: () => void;
}) {
  const [exportOpen, setExportOpen] = useState(false);

  const exportSelection: MailExportSelection =
    selection.mode === "ALL_RESULTS"
      ? { mode: "ALL_RESULTS", query: queryParams, excludedIds: selection.ids }
      : { mode: "IDS", ids: selection.ids };

  return (
    <div className="flex items-center gap-3">
      <Dropdown
        align="left"
        trigger={({ toggle, open }) => (
          <button
            type="button"
            onClick={toggle}
            className="flex items-center gap-1.5 rounded-[3px] border border-border bg-white px-3 py-1.5 text-[13px] font-medium text-text-primary hover:bg-brand-50"
          >
            Select
            <ChevronDown size={12} className={`transition-transform ${open ? "rotate-180" : ""}`} />
          </button>
        )}
      >
        {(close) => (
          <div className="w-52 py-1">
            <button
              type="button"
              onClick={() => {
                onSelectCurrentPage();
                close();
              }}
              className="block w-full px-3 py-2 text-left text-[13px] text-text-primary hover:bg-brand-50"
            >
              Select current page
            </button>
            <button
              type="button"
              disabled={total === 0}
              onClick={() => {
                onSelectAllResults();
                close();
              }}
              className="block w-full px-3 py-2 text-left text-[13px] text-text-primary hover:bg-brand-50 disabled:cursor-not-allowed disabled:text-text-muted disabled:hover:bg-transparent"
            >
              Select all results ({total})
            </button>
            <button
              type="button"
              onClick={() => {
                onClearSelection();
                close();
              }}
              className="block w-full px-3 py-2 text-left text-[13px] text-text-primary hover:bg-brand-50"
            >
              Clear selection
            </button>
          </div>
        )}
      </Dropdown>

      <span className="text-[13px] text-text-secondary">{count} selected</span>

      <Button type="button" variant="secondary" size="sm" disabled={count === 0} onClick={() => setExportOpen(true)}>
        Export to Excel
      </Button>

      <MailExportModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        projectId={projectId}
        selection={exportSelection}
      />
    </div>
  );
}
