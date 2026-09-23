"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Dropdown } from "@/components/ui/dropdown";
import { Button } from "@/components/ui/button";
import {
  ChevronDown,
  Plus,
  Send,
  GitBranch,
  Pencil,
  Stamp,
  Lock,
  Download,
  Printer,
  PackageIcon,
  FileSpreadsheet,
  FileOutput,
  Activity,
} from "@/components/ui/icons";
import { AddOrUpdateDocumentsModal } from "./add-or-update-documents-modal";
import { PlaceholderModal } from "./placeholder-modal";
import { BulkMetadataModal } from "./bulk-metadata-modal";
import { PrintRequestModal } from "./print-request-modal";
import { DocumentActivityModal } from "./document-activity-modal";
import { StartWorkflowModal } from "./start-workflow-modal";
import { TransmittalHistoryModal } from "./transmittal-history-modal";

export function DocumentRegisterToolbar({
  projectId,
  selectedIds,
  canManage,
  documentTypeNames,
  organizationOptions,
  disciplineOptions,
  functionalBreakdownOptions,
  spatialBreakdownOptions,
  drawingsOnly,
  showActivityButton = true,
}: {
  projectId: string;
  selectedIds: string[];
  canManage: boolean;
  documentTypeNames: string[];
  organizationOptions: { id: string; name: string }[];
  disciplineOptions: string[];
  functionalBreakdownOptions: string[];
  spatialBreakdownOptions: string[];
  drawingsOnly?: boolean;
  showActivityButton?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [notice, setNotice] = useState<string | null>(null);

  const [addOrUpdateOpen, setAddOrUpdateOpen] = useState(false);
  const [placeholderOpen, setPlaceholderOpen] = useState(false);
  const [bulkMetadataOpen, setBulkMetadataOpen] = useState(false);
  const [printRequestOpen, setPrintRequestOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [workflowOpen, setWorkflowOpen] = useState(false);
  const [historyMode, setHistoryMode] = useState<"document" | "organization" | null>(null);
  const [markingNoLongerInUse, setMarkingNoLongerInUse] = useState(false);

  function requireSelection(action: () => void) {
    if (selectedIds.length === 0) {
      setNotice("Select at least one document first.");
      window.setTimeout(() => setNotice(null), 4000);
      return;
    }
    setNotice(null);
    action();
  }

  const itemClass =
    "flex w-full items-center gap-1.5 px-3 py-2 text-left text-[13px] text-text-primary hover:bg-brand-50 disabled:cursor-not-allowed disabled:text-text-muted disabled:hover:bg-transparent";

  async function handleZipDownload() {
    const res = await fetch("/api/documents/bulk/download", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentIds: selectedIds }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setNotice(body.error ?? "Failed to download the selected documents.");
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
  }

  async function handleMarkNoLongerInUse() {
    if (
      !window.confirm(
        `You are about to mark ${selectedIds.length} document(s) as No Longer in Use. This changes their status only — the file, revision history, and audit trail are preserved. Continue?`,
      )
    ) {
      return;
    }
    setMarkingNoLongerInUse(true);
    const res = await fetch("/api/documents/bulk/status", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentIds: selectedIds, status: "NO_LONGER_IN_USE" }),
    });
    setMarkingNoLongerInUse(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setNotice(body.error ?? "Failed to update the selected documents.");
      return;
    }
    router.refresh();
  }

  function metadataTemplateHref() {
    const params = new URLSearchParams({ projectId });
    if (selectedIds.length > 0) params.set("documentIds", selectedIds.join(","));
    return `/api/documents/metadata-template?${params.toString()}`;
  }

  function exportToExcelHref() {
    const params = new URLSearchParams(searchParams.toString());
    params.set("projectId", projectId);
    if (drawingsOnly) params.set("drawingsOnly", "1");
    return `/api/documents/export?${params.toString()}`;
  }

  return (
    <div className="mb-2 flex flex-wrap items-center gap-2">
      <Dropdown
        align="left"
        trigger={({ toggle, open }) => (
          <Button type="button" variant="secondary" onClick={toggle}>
            <Plus size={13} />
            Add or Update Documents
            <ChevronDown size={11} className={`transition-transform ${open ? "rotate-180" : ""}`} />
          </Button>
        )}
      >
        {(close) => (
          <div className="w-56 py-1">
            <button
              type="button"
              className={itemClass}
              onClick={() => {
                close();
                setAddOrUpdateOpen(true);
              }}
            >
              Add or Update Documents
            </button>
            <button
              type="button"
              className={itemClass}
              onClick={() => {
                close();
                setPlaceholderOpen(true);
              }}
            >
              Add or Update Placeholders
            </button>
          </div>
        )}
      </Dropdown>

      <Dropdown
        align="left"
        trigger={({ toggle, open }) => (
          <Button type="button" variant="secondary" onClick={toggle}>
            <Send size={13} />
            Transmit
            <ChevronDown size={11} className={`transition-transform ${open ? "rotate-180" : ""}`} />
          </Button>
        )}
      >
        {(close) => (
          <div className="w-64 py-1">
            <button
              type="button"
              className={itemClass}
              onClick={() => {
                close();
                requireSelection(() => router.push(`/documents/transmittals/new?documentIds=${selectedIds.join(",")}`));
              }}
            >
              Create a Transmittal
            </button>
            <button
              type="button"
              className={itemClass}
              onClick={() => {
                close();
                requireSelection(() => router.push(`/documents/transmittals/auto-update?documentIds=${selectedIds.join(",")}`));
              }}
            >
              Auto Update Transmitted Documents
            </button>
            <button
              type="button"
              className={itemClass}
              onClick={() => {
                close();
                requireSelection(() =>
                  router.push(`/documents/transmittals/new?kind=tender&documentIds=${selectedIds.join(",")}`),
                );
              }}
            >
              Create a Tender Transmittal
            </button>
            <button
              type="button"
              className={itemClass}
              onClick={() => {
                close();
                requireSelection(() =>
                  router.push(`/documents/transmittals/auto-update?kind=tender&documentIds=${selectedIds.join(",")}`),
                );
              }}
            >
              Auto Update Tender Transmitted Documents
            </button>
            <button
              type="button"
              className={itemClass}
              onClick={() => {
                close();
                requireSelection(() => setWorkflowOpen(true));
              }}
            >
              <GitBranch size={13} />
              Start a Workflow
            </button>
          </div>
        )}
      </Dropdown>

      <Dropdown
        align="left"
        trigger={({ toggle, open }) => (
          <Button type="button" variant="secondary" onClick={toggle}>
            Tools
            <ChevronDown size={11} className={`transition-transform ${open ? "rotate-180" : ""}`} />
          </Button>
        )}
      >
        {(close) => (
          <div className="w-72 py-1">
            {canManage && (
              <button
                type="button"
                className={itemClass}
                onClick={() => {
                  close();
                  requireSelection(() => setBulkMetadataOpen(true));
                }}
              >
                <Pencil size={13} />
                Update
              </button>
            )}
            <button type="button" disabled title="No stamps or annotations system exists in this project." className={itemClass}>
              <Stamp size={13} />
              Flatten Stamps and Annotations
            </button>
            {canManage && (
              <button
                type="button"
                className={itemClass}
                disabled={markingNoLongerInUse}
                onClick={() => {
                  close();
                  requireSelection(handleMarkNoLongerInUse);
                }}
              >
                <Lock size={13} />
                Mark as No Longer in Use
              </button>
            )}
            <button
              type="button"
              className={itemClass}
              onClick={() => {
                close();
                requireSelection(handleZipDownload);
              }}
            >
              <Download size={13} />
              Zip Download
            </button>
            <button type="button" disabled title="No markup/annotation system exists in this project." className={itemClass}>
              <Download size={13} />
              Zip Download with Markups
            </button>
            <button
              type="button"
              className={itemClass}
              onClick={() => {
                close();
                requireSelection(() => setPrintRequestOpen(true));
              }}
            >
              <Printer size={13} />
              Submit a Print Request
            </button>
            <button type="button" disabled title="Packages is not part of this application." className={itemClass}>
              <PackageIcon size={13} />
              Add To Packages
            </button>
            <button type="button" disabled title="The Models module is not part of this application." className={itemClass}>
              <PackageIcon size={13} />
              Add to Models
            </button>
            <a href={metadataTemplateHref()} className={itemClass} onClick={close}>
              <FileSpreadsheet size={13} />
              Download Metadata Template
            </a>
          </div>
        )}
      </Dropdown>

      <Dropdown
        align="left"
        trigger={({ toggle, open }) => (
          <Button type="button" variant="secondary" onClick={toggle}>
            Reports
            <ChevronDown size={11} className={`transition-transform ${open ? "rotate-180" : ""}`} />
          </Button>
        )}
      >
        {(close) => (
          <div className="w-64 py-1">
            <button
              type="button"
              className={itemClass}
              onClick={() => {
                close();
                setHistoryMode("document");
              }}
            >
              Transmittal History By Document
            </button>
            <button
              type="button"
              className={itemClass}
              onClick={() => {
                close();
                setHistoryMode("organization");
              }}
            >
              Transmittal History by Organization
            </button>
            <a href={exportToExcelHref()} className={itemClass} onClick={close}>
              <FileOutput size={13} />
              Export to Excel {selectedIds.length > 0 ? `(current view)` : ""}
            </a>
          </div>
        )}
      </Dropdown>

      {showActivityButton && (
        <Button type="button" variant="secondary" onClick={() => setActivityOpen(true)}>
          <Activity size={13} />
          Document Activity
        </Button>
      )}

      {notice && <span className="text-[12px] text-danger">{notice}</span>}

      <AddOrUpdateDocumentsModal
        projectId={projectId}
        documentTypeNames={documentTypeNames}
        disciplineOptions={disciplineOptions}
        functionalBreakdownOptions={functionalBreakdownOptions}
        spatialBreakdownOptions={spatialBreakdownOptions}
        registerScope={drawingsOnly ? "DRAWING" : "STANDALONE_DOCUMENT"}
        open={addOrUpdateOpen}
        onClose={() => setAddOrUpdateOpen(false)}
      />
      <PlaceholderModal
        projectId={projectId}
        documentTypeNames={documentTypeNames}
        registerScope={drawingsOnly ? "DRAWING" : "STANDALONE_DOCUMENT"}
        open={placeholderOpen}
        onClose={() => setPlaceholderOpen(false)}
      />
      <BulkMetadataModal
        documentIds={selectedIds}
        documentTypeNames={documentTypeNames}
        open={bulkMetadataOpen}
        onClose={() => setBulkMetadataOpen(false)}
      />
      <PrintRequestModal documentIds={selectedIds} projectId={projectId} open={printRequestOpen} onClose={() => setPrintRequestOpen(false)} />
      <DocumentActivityModal projectId={projectId} open={activityOpen} onClose={() => setActivityOpen(false)} />
      <StartWorkflowModal projectId={projectId} documentIds={selectedIds} open={workflowOpen} onClose={() => setWorkflowOpen(false)} />
      <TransmittalHistoryModal
        projectId={projectId}
        mode={historyMode}
        organizationOptions={organizationOptions}
        onClose={() => setHistoryMode(null)}
      />
    </div>
  );
}
