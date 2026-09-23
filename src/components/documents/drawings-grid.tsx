"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { FileText } from "@/components/ui/icons";
import { DOCUMENT_STATUS_LABELS, DOCUMENT_REVIEW_STATUS_LABELS } from "@/lib/documents/status";
import { DocumentRegisterToolbar } from "./document-register-toolbar";
import { RegisterResultsHeader } from "./register-results-header";
import { BulkActionsBar } from "./bulk-actions-bar";
import { DocumentRowMenu } from "./document-row-menu";
import { PdfThumbnail } from "./pdf-thumbnail";
import { useResultSetSelection } from "./use-result-set-selection";
import type { DocumentRow } from "./documents-table";
import type { DocumentReviewStatus } from "@prisma/client";

const REVIEW_STATUS_TEXT_CLASSES: Record<DocumentReviewStatus, string> = {
  A_NO_OBJECTION: "text-emerald-700",
  B_NO_OBJECTION_WITH_COMMENTS: "text-amber-700",
  C_REVISE_RESUBMIT: "text-red-700",
};

export function DrawingsGrid({
  projectId,
  rows,
  total,
  canManage,
  organizationOptions,
  documentTypeNames,
  disciplineOptions,
  functionalBreakdownOptions,
  spatialBreakdownOptions,
  showActivityButton,
  viewToggle,
}: {
  projectId: string;
  rows: DocumentRow[];
  total?: number;
  canManage: boolean;
  organizationOptions: { id: string; name: string }[];
  documentTypeNames: string[];
  disciplineOptions: string[];
  functionalBreakdownOptions: string[];
  spatialBreakdownOptions: string[];
  showActivityButton?: boolean;
  viewToggle?: ReactNode;
}) {
  const searchParams = useSearchParams();
  const { effectiveIds, isChecked, toggleOne, selectAll, clear, resolving } = useResultSetSelection({
    projectId,
    registerScope: "DRAWING",
    filterQuery: searchParams.toString(),
  });

  return (
    <div>
      <DocumentRegisterToolbar
        projectId={projectId}
        selectedIds={effectiveIds}
        canManage={canManage}
        documentTypeNames={documentTypeNames}
        organizationOptions={organizationOptions}
        disciplineOptions={disciplineOptions}
        functionalBreakdownOptions={functionalBreakdownOptions}
        spatialBreakdownOptions={spatialBreakdownOptions}
        drawingsOnly
        showActivityButton={showActivityButton}
      />

      <div className="mb-2 flex items-center justify-between">
        <RegisterResultsHeader
          total={total ?? rows.length}
          selectedCount={effectiveIds.length}
          resolving={resolving}
          onSelectAll={selectAll}
        />
        {viewToggle}
      </div>

      <BulkActionsBar selectedIds={effectiveIds} canManage={canManage} onClear={clear} />

      {rows.length === 0 ? (
        <EmptyState
          icon={<FileText size={24} strokeWidth={1.25} />}
          title="No drawings found"
          description="Documents whose type is configured as a Drawing Type will appear here. Use Add or Update Documents above, or Temporary Files → Register as Document."
        />
      ) : (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
          {rows.map((d) => (
            <div key={d.id} className="flex flex-col overflow-hidden rounded-[3px] border border-border bg-white">
              <div className="relative aspect-[4/3] w-full border-b border-border bg-brand-50">
                <label className="absolute left-1 top-1 z-10">
                  <input
                    type="checkbox"
                    checked={isChecked(d.id)}
                    onChange={() => toggleOne(d.id)}
                    aria-label={`Select ${d.documentNo}`}
                    className="h-3.5 w-3.5 accent-brand-700"
                  />
                </label>
                <Link href={`/documents/${d.id}`} className="block h-full w-full">
                  <PdfThumbnail
                    fileUrl={d.fileName ? `/api/documents/${d.id}/file` : null}
                    mimeType={d.mimeType}
                    alt={d.title}
                  />
                </Link>
                <span className="absolute bottom-1 right-1 rounded-[2px] bg-black/60 px-1 py-0.5 text-[10px] font-medium text-white">
                  {d.revision || "—"}
                </span>
              </div>
              <div className="flex flex-1 flex-col gap-0.5 px-2 py-1.5 text-[11px] leading-tight">
                <Link href={`/documents/${d.id}`} className="truncate font-medium text-brand-700 hover:underline" title={d.documentNo}>
                  {d.documentNo}
                </Link>
                <span className="truncate text-text-primary" title={d.title}>
                  {d.title}
                </span>
                <span className="truncate text-text-muted">{d.typeLabel || "—"}</span>
                <span className={`truncate font-medium ${d.reviewStatus ? REVIEW_STATUS_TEXT_CLASSES[d.reviewStatus] : "text-text-muted"}`}>
                  {d.reviewStatus ? DOCUMENT_REVIEW_STATUS_LABELS[d.reviewStatus] : DOCUMENT_STATUS_LABELS[d.status]}
                </span>
                <span className="truncate text-text-muted">{d.dateUploaded}</span>
                <span className="truncate text-text-muted" title={d.organizationName}>
                  {d.organizationName || "—"}
                </span>
                <div className="mt-1 flex justify-end border-t border-border pt-1">
                  <DocumentRowMenu
                    documentId={d.id}
                    documentNo={d.documentNo}
                    title={d.title}
                    currentRevision={d.revision}
                    hasFile={!!d.fileName}
                    canManage={canManage}
                    metadata={d.metadata}
                    documentTypeNames={documentTypeNames}
                    disciplineOptions={disciplineOptions}
                    functionalBreakdownOptions={functionalBreakdownOptions}
                    spatialBreakdownOptions={spatialBreakdownOptions}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
