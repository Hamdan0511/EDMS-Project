"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/table";
import { FileText, ImageIcon, File as FileIcon, ArrowUp, ArrowDown, ArrowUpDown } from "@/components/ui/icons";
import { GenericColumnManager } from "@/components/mail/column-manager";
import { fileTypeCategory, formatBytes } from "@/lib/files/file-types";
import { DOCUMENT_STATUS_OPTIONS, DOCUMENT_STATUS_LABELS, DOCUMENT_STATUS_BADGE_CLASSES, DOCUMENT_REVIEW_STATUS_LABELS } from "@/lib/documents/status";
import { ALL_COLUMNS, DEFAULT_VISIBLE_COLUMNS, type ColumnKey } from "./document-table-columns";
import { getSnapshot, setVisibleColumns } from "./document-column-visibility-store";
import { DocumentRowMenu } from "./document-row-menu";
import { BulkActionsBar } from "./bulk-actions-bar";
import { DocumentRegisterToolbar } from "./document-register-toolbar";
import { RegisterResultsHeader } from "./register-results-header";
import { useResultSetSelection } from "./use-result-set-selection";
import { EmptyState } from "@/components/ui/empty-state";
import type { DocumentMetadataInitial } from "./edit-metadata-modal";
import type { SortKey } from "@/lib/documents/query";
import type { DocumentStatus, DocumentReviewStatus } from "@prisma/client";
import type { ReactNode } from "react";

export type DocumentRow = {
  id: string;
  documentNo: string;
  title: string;
  revision: string;
  typeLabel: string;
  status: DocumentStatus;
  reviewStatus: DocumentReviewStatus | null;
  discipline: string | null;
  functionalBreakdown: string | null;
  spatialBreakdown: string | null;
  uploadedByName: string;
  organizationName: string;
  dateUploaded: string;
  dateModified: string;
  fileName: string | null;
  mimeType: string | null;
  fileSizeBytes: number | null;
  isPlaceholder: boolean;
  metadata: DocumentMetadataInitial;
};

export type DocumentFilterValues = {
  documentNo: string;
  title: string;
  revision: string;
  typeId: string;
  status: string;
  discipline: string;
  functionalBreakdown: string;
  spatialBreakdown: string;
  reviewStatus: string;
  uploadedBy: string;
  organizationId: string;
  dateUploadedFrom: string;
};

function FileTypeIcon({ mimeType }: { mimeType: string | null }) {
  if (!mimeType) return <span className="text-text-muted">—</span>;
  const category = fileTypeCategory(mimeType);
  if (category === "pdf") return <FileText size={16} className="text-brand-700" />;
  if (category === "image") return <ImageIcon size={16} className="text-brand-700" />;
  return <FileIcon size={16} className="text-text-secondary" />;
}

function SortIcon({ active, dir }: { active: boolean; dir: "asc" | "desc" }) {
  if (!active) return <ArrowUpDown size={11} className="text-text-muted" />;
  return dir === "asc" ? <ArrowUp size={11} /> : <ArrowDown size={11} />;
}

function SortableTh({
  label,
  sortKey,
  sort,
  dir,
  buildSortHref,
}: {
  label: string;
  sortKey: SortKey;
  sort: SortKey;
  dir: "asc" | "desc";
  buildSortHref: (key: SortKey) => string;
}) {
  return (
    <Th>
      <Link href={buildSortHref(sortKey)} className="flex items-center gap-1 hover:text-brand-700">
        {label}
        <SortIcon active={sort === sortKey} dir={dir} />
      </Link>
    </Th>
  );
}

export function DocumentsTable({
  projectId,
  rows,
  total,
  filters,
  sort,
  dir,
  canManage,
  typeOptions,
  organizationOptions,
  documentTypeNames,
  disciplineOptions,
  functionalBreakdownOptions,
  spatialBreakdownOptions,
  drawingsOnly,
  showActivityButton,
  viewToggle,
  showInlineFilters = true,
  emptyTitle = "No documents found",
  emptyDescription = "Documents registered in this project will appear here. Use Add or Update Documents above, or Split a PDF / Temporary Files → Register as Document.",
}: {
  projectId: string;
  rows: DocumentRow[];
  total?: number;
  filters: DocumentFilterValues;
  sort: SortKey;
  dir: "asc" | "desc";
  canManage: boolean;
  typeOptions: { id: string; name: string }[];
  organizationOptions: { id: string; name: string }[];
  documentTypeNames: string[];
  disciplineOptions: string[];
  functionalBreakdownOptions: string[];
  spatialBreakdownOptions: string[];
  drawingsOnly?: boolean;
  showActivityButton?: boolean;
  viewToggle?: ReactNode;
  showInlineFilters?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function buildSortHref(key: SortKey): string {
    const sp = new URLSearchParams(searchParams.toString());
    const nextDir = sort === key && dir === "asc" ? "desc" : "asc";
    sp.set("sort", key);
    sp.set("dir", nextDir);
    sp.set("page", "1");
    return `${pathname}?${sp.toString()}`;
  }

  const { effectiveIds, isChecked, toggleOne, toggleAllOnPage, selectAll, clear, resolving } = useResultSetSelection({
    projectId,
    registerScope: drawingsOnly ? "DRAWING" : "STANDALONE_DOCUMENT",
    filterQuery: searchParams.toString(),
  });

  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState<Record<ColumnKey, boolean>>(DEFAULT_VISIBLE_COLUMNS);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setVisible(getSnapshot());
    setMounted(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  function handleColumnChange(next: Record<ColumnKey, boolean>) {
    setVisible(next);
    setVisibleColumns(next);
  }

  const isVisible = (key: ColumnKey) => !mounted || visible[key];
  const allSelected = rows.length > 0 && rows.every((r) => isChecked(r.id));

  function toggleAll() {
    toggleAllOnPage(rows.map((r) => r.id));
  }

  const filterInputClass =
    "h-6 w-full rounded-[2px] border border-border bg-white px-1.5 text-[11px] outline-none focus:border-accent";

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
        drawingsOnly={drawingsOnly}
        showActivityButton={showActivityButton}
      />

      <div className="mb-2 flex items-center justify-between">
        <RegisterResultsHeader
          total={total ?? rows.length}
          selectedCount={effectiveIds.length}
          resolving={resolving}
          onSelectAll={selectAll}
        />
        <div className="flex items-center gap-2">
          {viewToggle}
          <GenericColumnManager columns={ALL_COLUMNS} visible={mounted ? visible : DEFAULT_VISIBLE_COLUMNS} onChange={handleColumnChange} />
        </div>
      </div>

      <BulkActionsBar selectedIds={effectiveIds} canManage={canManage} onClear={clear} />

      {/* Advanced-Search-only filters have no in-table filter input, so their
          values are carried across a plain form re-submit via hidden inputs
          here rather than as raw <tr> children (invalid HTML — it gets
          foster-parented out during SSR parsing and causes a hydration
          mismatch). When a caller supplies its own filter panel (e.g. the
          Drawings register) these are skipped entirely to avoid submitting
          two same-named inputs in one form. */}
      {showInlineFilters && (
        <>
          <input type="hidden" name="reviewStatus" defaultValue={filters.reviewStatus} />
          <input type="hidden" name="functionalBreakdown" defaultValue={filters.functionalBreakdown} />
          <input type="hidden" name="spatialBreakdown" defaultValue={filters.spatialBreakdown} />
        </>
      )}

      {rows.length === 0 ? (
        <EmptyState
          icon={<FileText size={28} strokeWidth={1.25} />}
          title={emptyTitle}
          description={emptyDescription}
        />
      ) : (
      <Table>
        <Thead>
          <Tr>
            <Th className="w-9">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
                aria-label="Select all"
                className="h-3.5 w-3.5 accent-brand-700"
              />
            </Th>
            {isVisible("documentNo") && <SortableTh label="Document No." sortKey="documentNo" sort={sort} dir={dir} buildSortHref={buildSortHref} />}
            {isVisible("revision") && <SortableTh label="Revision" sortKey="revision" sort={sort} dir={dir} buildSortHref={buildSortHref} />}
            {isVisible("title") && <SortableTh label="Title" sortKey="title" sort={sort} dir={dir} buildSortHref={buildSortHref} />}
            {isVisible("type") && <SortableTh label="Document Type" sortKey="type" sort={sort} dir={dir} buildSortHref={buildSortHref} />}
            {isVisible("status") && <SortableTh label="Status" sortKey="status" sort={sort} dir={dir} buildSortHref={buildSortHref} />}
            {isVisible("reviewStatus") && <SortableTh label="Review Status" sortKey="reviewStatus" sort={sort} dir={dir} buildSortHref={buildSortHref} />}
            {isVisible("discipline") && <SortableTh label="Discipline" sortKey="discipline" sort={sort} dir={dir} buildSortHref={buildSortHref} />}
            {isVisible("functionalBreakdown") && <SortableTh label="Functional Breakdown" sortKey="functionalBreakdown" sort={sort} dir={dir} buildSortHref={buildSortHref} />}
            {isVisible("spatialBreakdown") && <SortableTh label="Spatial Breakdown" sortKey="spatialBreakdown" sort={sort} dir={dir} buildSortHref={buildSortHref} />}
            {isVisible("uploadedBy") && <SortableTh label="Uploaded By" sortKey="uploadedBy" sort={sort} dir={dir} buildSortHref={buildSortHref} />}
            {isVisible("organization") && <SortableTh label="Organization" sortKey="organization" sort={sort} dir={dir} buildSortHref={buildSortHref} />}
            {isVisible("dateUploaded") && <SortableTh label="Date Uploaded" sortKey="dateUploaded" sort={sort} dir={dir} buildSortHref={buildSortHref} />}
            {isVisible("dateModified") && <SortableTh label="Date Modified" sortKey="dateModified" sort={sort} dir={dir} buildSortHref={buildSortHref} />}
            {isVisible("workflowStatus") && <Th>Workflow Status</Th>}
            {isVisible("file") && <Th>File</Th>}
            {isVisible("actions") && <Th>Actions</Th>}
          </Tr>
          {showInlineFilters && (
          <Tr>
            <Th />
            {isVisible("documentNo") ? (
              <Th><input name="documentNo" defaultValue={filters.documentNo} className={filterInputClass} /></Th>
            ) : (
              <input type="hidden" name="documentNo" defaultValue={filters.documentNo} />
            )}
            {isVisible("revision") ? (
              <Th><input name="revision" defaultValue={filters.revision} className={filterInputClass} /></Th>
            ) : (
              <input type="hidden" name="revision" defaultValue={filters.revision} />
            )}
            {isVisible("title") ? (
              <Th><input name="title" defaultValue={filters.title} className={filterInputClass} /></Th>
            ) : (
              <input type="hidden" name="title" defaultValue={filters.title} />
            )}
            {isVisible("type") ? (
              <Th>
                <select name="typeId" defaultValue={filters.typeId} className={filterInputClass}>
                  <option value="">All</option>
                  {typeOptions.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </Th>
            ) : (
              <input type="hidden" name="typeId" defaultValue={filters.typeId} />
            )}
            {isVisible("status") ? (
              <Th>
                <select name="status" defaultValue={filters.status} className={filterInputClass}>
                  <option value="">All</option>
                  {DOCUMENT_STATUS_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </Th>
            ) : (
              <input type="hidden" name="status" defaultValue={filters.status} />
            )}
            {isVisible("reviewStatus") && <Th />}
            {isVisible("discipline") ? (
              <Th>
                <select name="discipline" defaultValue={filters.discipline} className={filterInputClass}>
                  <option value="">All</option>
                  {disciplineOptions.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </Th>
            ) : (
              <input type="hidden" name="discipline" defaultValue={filters.discipline} />
            )}
            {isVisible("functionalBreakdown") && <Th />}
            {isVisible("spatialBreakdown") && <Th />}
            {isVisible("uploadedBy") ? (
              <Th><input name="uploadedBy" defaultValue={filters.uploadedBy} className={filterInputClass} /></Th>
            ) : (
              <input type="hidden" name="uploadedBy" defaultValue={filters.uploadedBy} />
            )}
            {isVisible("organization") ? (
              <Th>
                <select name="organizationId" defaultValue={filters.organizationId} className={filterInputClass}>
                  <option value="">All</option>
                  {organizationOptions.map((o) => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </select>
              </Th>
            ) : (
              <input type="hidden" name="organizationId" defaultValue={filters.organizationId} />
            )}
            {isVisible("dateUploaded") ? (
              <Th><input type="date" name="dateUploadedFrom" defaultValue={filters.dateUploadedFrom} className={filterInputClass} /></Th>
            ) : (
              <input type="hidden" name="dateUploadedFrom" defaultValue={filters.dateUploadedFrom} />
            )}
            {isVisible("dateModified") && <Th />}
            {isVisible("workflowStatus") && <Th />}
            {isVisible("file") && <Th />}
            {isVisible("actions") && <Th />}
          </Tr>
          )}
        </Thead>
        <Tbody>
          {rows.map((d) => (
            <Tr key={d.id}>
              <Td>
                <input
                  type="checkbox"
                  checked={isChecked(d.id)}
                  onChange={() => toggleOne(d.id)}
                  aria-label={`Select ${d.documentNo}`}
                  className="h-3.5 w-3.5 accent-brand-700"
                />
              </Td>
              {isVisible("documentNo") && (
                <Td>
                  <Link href={`/documents/${d.id}`} className="font-medium text-brand-700 hover:underline">
                    {d.documentNo}
                  </Link>
                </Td>
              )}
              {isVisible("revision") && <Td className="text-text-secondary">{d.revision || "—"}</Td>}
              {isVisible("title") && (
                <Td>
                  <Link href={`/documents/${d.id}`} className="text-brand-700 hover:underline">
                    {d.title}
                  </Link>
                </Td>
              )}
              {isVisible("type") && <Td className="text-text-secondary">{d.typeLabel || "—"}</Td>}
              {isVisible("status") && (
                <Td>
                  <span className={`rounded-[3px] px-2 py-0.5 text-[11px] font-medium ${DOCUMENT_STATUS_BADGE_CLASSES[d.status]}`}>
                    {DOCUMENT_STATUS_LABELS[d.status]}
                  </span>
                </Td>
              )}
              {isVisible("reviewStatus") && (
                <Td className="text-text-secondary">{d.reviewStatus ? DOCUMENT_REVIEW_STATUS_LABELS[d.reviewStatus] : "None"}</Td>
              )}
              {isVisible("discipline") && <Td className="text-text-secondary">{d.discipline || "—"}</Td>}
              {isVisible("functionalBreakdown") && <Td className="text-text-secondary">{d.functionalBreakdown || "—"}</Td>}
              {isVisible("spatialBreakdown") && <Td className="text-text-secondary">{d.spatialBreakdown || "—"}</Td>}
              {isVisible("uploadedBy") && <Td className="text-text-secondary">{d.uploadedByName}</Td>}
              {isVisible("organization") && <Td className="text-text-secondary">{d.organizationName || "—"}</Td>}
              {isVisible("dateUploaded") && <Td className="text-text-secondary">{d.dateUploaded}</Td>}
              {isVisible("dateModified") && <Td className="text-text-secondary">{d.dateModified}</Td>}
              {isVisible("workflowStatus") && <Td className="text-text-muted">—</Td>}
              {isVisible("file") && (
                <Td>
                  {d.fileName ? (
                    <span className="flex items-center gap-1.5">
                      <FileTypeIcon mimeType={d.mimeType} />
                      <a
                        href={`/api/documents/${d.id}/file`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand-700 hover:underline"
                      >
                        {d.fileName}
                      </a>
                      {d.fileSizeBytes != null && (
                        <span className="text-text-muted">({formatBytes(d.fileSizeBytes)})</span>
                      )}
                    </span>
                  ) : d.isPlaceholder ? (
                    <span className="rounded-[3px] bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                      Placeholder
                    </span>
                  ) : (
                    <span className="text-text-muted">—</span>
                  )}
                </Td>
              )}
              {isVisible("actions") && (
                <Td>
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
                </Td>
              )}
            </Tr>
          ))}
        </Tbody>
      </Table>
      )}
    </div>
  );
}
