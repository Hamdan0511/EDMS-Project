"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Paperclip, CheckCircle2 } from "@/components/ui/icons";
import { ColumnManager } from "./column-manager";
import { DEFAULT_VISIBLE_COLUMNS, type ColumnKey } from "./mail-table-columns";
import { getSnapshot, setVisibleColumns } from "./column-visibility-store";
import { MailSelectionBar } from "./mail-selection-bar";
import {
  loadMailSelection,
  saveMailSelection,
  selectionCount,
  isIdSelected,
  toggleId,
  selectIds,
  deselectIds,
  selectAllResults,
  clearSelection,
  type MailSelectionState,
} from "./mail-selection-store";

export type MailRow = {
  id: string;
  href: string;
  mailNumber: string;
  subject: string;
  date: string;
  from: string;
  fromOrg: string;
  toOrg: string;
  recipientsText: string;
  statusLabel: string;
  typeLabel: string;
  typeId: string;
  hasAttachments: boolean;
  repliesCount: number;
  replyDate: string;
  due: string;
};

export type FilterValues = {
  mailNo: string;
  subject: string;
  dateFrom: string;
  from: string;
  fromOrg: string;
  toOrg: string;
  recipients: string;
  status: string;
  type: string;
};

export function MailTable({
  rows,
  total,
  filters,
  statusOptions,
  typeOptions,
  projectId,
  queryParams,
  canExport,
}: {
  rows: MailRow[];
  total: number;
  filters: FilterValues;
  statusOptions: { value: string; label: string }[];
  typeOptions: { value: string; label: string }[];
  projectId: string;
  queryParams: Record<string, string | undefined>;
  canExport: boolean;
}) {
  const router = useRouter();
  const [bulkClosing, setBulkClosing] = useState(false);

  // Only real, exportable (non-draft) rows participate in bulk
  // selection/export — matches the register's own SENT-only export scope.
  const exportableRows = useMemo(() => rows.filter((r) => r.statusLabel !== "Draft"), [rows]);
  const pageIds = useMemo(() => exportableRows.map((r) => r.id), [exportableRows]);
  const querySignature = useMemo(() => JSON.stringify(queryParams), [queryParams]);

  // Selection is sessionStorage-backed (see mail-selection-store) so it
  // survives real page navigations within the same search — but the server
  // has no access to it, so the first paint always starts from an empty,
  // hydration-safe default and swaps in the real stored value post-mount.
  const [mounted, setMounted] = useState(false);
  const [selection, setSelection] = useState<MailSelectionState>({ querySignature, mode: "MANUAL", ids: [] });

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setSelection(loadMailSelection(querySignature));
    setMounted(true);
  }, [querySignature]);
  /* eslint-enable react-hooks/set-state-in-effect */

  function updateSelection(next: MailSelectionState) {
    setSelection(next);
    saveMailSelection(next);
  }

  // Column visibility remains its own independent, separately-persisted
  // client preference (see column-visibility-store).
  const [columnsMounted, setColumnsMounted] = useState(false);
  const [visible, setVisible] = useState<Record<ColumnKey, boolean>>(DEFAULT_VISIBLE_COLUMNS);
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setVisible(getSnapshot());
    setColumnsMounted(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  function handleColumnChange(next: Record<ColumnKey, boolean>) {
    setVisible(next);
    setVisibleColumns(next);
  }

  const count = mounted ? selectionCount(selection, total) : 0;
  const pageAllSelected = mounted && pageIds.length > 0 && pageIds.every((id) => isIdSelected(selection, id));
  const isVisible = (key: ColumnKey) => !columnsMounted || visible[key];

  function toggleAll() {
    updateSelection(pageAllSelected ? deselectIds(selection, pageIds) : selectIds(selection, pageIds));
  }
  function toggleOne(id: string) {
    updateSelection(toggleId(selection, id));
  }

  // Only SENT mail that isn't already Closed-Out can be closed out — matches
  // the same eligibility the single-mail Actions menu enforces. This bulk
  // action only ever considers rows actually loaded on the current page.
  const closableSelectedIds = rows
    .filter((r) => mounted && isIdSelected(selection, r.id) && r.statusLabel !== "Draft" && r.statusLabel !== "Closed-Out")
    .map((r) => r.id);

  async function bulkMarkClosedOut() {
    setBulkClosing(true);
    await Promise.all(
      closableSelectedIds.map((id) =>
        fetch(`/api/mail/${id}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ workflowStatus: "CLOSED_OUT" }),
        }).catch(() => null),
      ),
    );
    setBulkClosing(false);
    updateSelection(clearSelection(querySignature));
    router.refresh();
  }

  const inputClass =
    "h-6 w-full rounded-[2px] border border-border bg-white px-1.5 text-[11px] outline-none focus:border-accent";

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {canExport && (
            <MailSelectionBar
              count={count}
              total={total}
              projectId={projectId}
              queryParams={queryParams}
              selection={selection}
              onSelectCurrentPage={() => updateSelection(selectIds(selection, pageIds))}
              onSelectAllResults={() => updateSelection(selectAllResults(querySignature))}
              onClearSelection={() => updateSelection(clearSelection(querySignature))}
            />
          )}
          {closableSelectedIds.length > 0 && (
            <Button type="button" variant="secondary" size="sm" disabled={bulkClosing} onClick={bulkMarkClosedOut}>
              <CheckCircle2 size={13} />
              {bulkClosing ? "Updating..." : `Mark Closed-Out (${closableSelectedIds.length})`}
            </Button>
          )}
        </div>
        <ColumnManager visible={columnsMounted ? visible : DEFAULT_VISIBLE_COLUMNS} onChange={handleColumnChange} />
      </div>

      <Table>
        <Thead>
          <Tr>
            <Th className="w-16">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={pageAllSelected}
                  onChange={toggleAll}
                  aria-label="Select all on this page"
                  className="h-3.5 w-3.5 accent-brand-700"
                />
                <Paperclip size={12} className="text-text-muted" />
              </div>
            </Th>
            {isVisible("mailNo") && <Th>Mail No.</Th>}
            {isVisible("subject") && <Th>Subject</Th>}
            {isVisible("date") && <Th>Date</Th>}
            {isVisible("from") && <Th>From</Th>}
            {isVisible("fromOrg") && <Th>From Organization</Th>}
            {isVisible("toOrg") && <Th>To Organization</Th>}
            {isVisible("recipients") && <Th>Recipients</Th>}
            {isVisible("status") && <Th>Status</Th>}
            {isVisible("type") && <Th>Type</Th>}
            {isVisible("replies") && <Th>Replies</Th>}
            {isVisible("replyDate") && <Th>Reply Date</Th>}
            {isVisible("due") && <Th>Due</Th>}
          </Tr>
          <Tr>
            <Th />
            {isVisible("mailNo") ? (
              <Th>
                <input name="mailNo" defaultValue={filters.mailNo} className={inputClass} />
              </Th>
            ) : (
              <input type="hidden" name="mailNo" defaultValue={filters.mailNo} />
            )}
            {isVisible("subject") ? (
              <Th>
                <input name="subject" defaultValue={filters.subject} className={inputClass} />
              </Th>
            ) : (
              <input type="hidden" name="subject" defaultValue={filters.subject} />
            )}
            {isVisible("date") ? (
              <Th>
                <input type="date" name="dateFrom" defaultValue={filters.dateFrom} className={inputClass} />
              </Th>
            ) : (
              <input type="hidden" name="dateFrom" defaultValue={filters.dateFrom} />
            )}
            {isVisible("from") ? (
              <Th>
                <input name="from" defaultValue={filters.from} className={inputClass} />
              </Th>
            ) : (
              <input type="hidden" name="from" defaultValue={filters.from} />
            )}
            {isVisible("fromOrg") ? (
              <Th>
                <input name="fromOrg" defaultValue={filters.fromOrg} className={inputClass} />
              </Th>
            ) : (
              <input type="hidden" name="fromOrg" defaultValue={filters.fromOrg} />
            )}
            {isVisible("toOrg") ? (
              <Th>
                <input name="toOrg" defaultValue={filters.toOrg} className={inputClass} />
              </Th>
            ) : (
              <input type="hidden" name="toOrg" defaultValue={filters.toOrg} />
            )}
            {isVisible("recipients") ? (
              <Th>
                <input name="recipients" defaultValue={filters.recipients} className={inputClass} />
              </Th>
            ) : (
              <input type="hidden" name="recipients" defaultValue={filters.recipients} />
            )}
            {isVisible("status") ? (
              <Th>
                <select name="status" defaultValue={filters.status} className={inputClass}>
                  <option value="">All</option>
                  {statusOptions.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </Th>
            ) : (
              <input type="hidden" name="status" defaultValue={filters.status} />
            )}
            {isVisible("type") ? (
              <Th>
                <select name="type" defaultValue={filters.type} className={inputClass}>
                  <option value="">All</option>
                  {typeOptions.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </Th>
            ) : (
              <input type="hidden" name="type" defaultValue={filters.type} />
            )}
            {isVisible("replies") && <Th />}
            {isVisible("replyDate") && <Th />}
            {isVisible("due") && <Th />}
          </Tr>
        </Thead>
        <Tbody>
          {rows.map((m) => (
            <Tr key={m.id}>
              <Td>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={mounted && isIdSelected(selection, m.id)}
                    onChange={() => toggleOne(m.id)}
                    aria-label={`Select ${m.mailNumber}`}
                    className="h-3.5 w-3.5 accent-brand-700"
                  />
                  {m.hasAttachments && (
                    <Paperclip size={13} className="text-text-muted" aria-label="Has attachments" />
                  )}
                </div>
              </Td>
              {isVisible("mailNo") && (
                <Td>
                  <Link href={m.href} className="font-medium text-brand-700 hover:underline">
                    {m.mailNumber}
                  </Link>
                </Td>
              )}
              {isVisible("subject") && (
                <Td>
                  <Link href={m.href} className="text-brand-700 hover:underline">
                    {m.subject}
                  </Link>
                </Td>
              )}
              {isVisible("date") && <Td className="text-text-secondary">{m.date}</Td>}
              {isVisible("from") && <Td className="text-text-secondary">{m.from}</Td>}
              {isVisible("fromOrg") && <Td className="text-text-secondary">{m.fromOrg}</Td>}
              {isVisible("toOrg") && <Td className="text-text-secondary">{m.toOrg}</Td>}
              {isVisible("recipients") && <Td className="text-text-secondary">{m.recipientsText}</Td>}
              {isVisible("status") && <Td className="text-text-secondary">{m.statusLabel}</Td>}
              {isVisible("type") && <Td className="text-text-secondary">{m.typeLabel}</Td>}
              {isVisible("replies") && <Td className="text-text-secondary">{m.repliesCount || "—"}</Td>}
              {isVisible("replyDate") && <Td className="text-text-secondary">{m.replyDate}</Td>}
              {isVisible("due") && <Td className="text-text-secondary">{m.due}</Td>}
            </Tr>
          ))}
        </Tbody>
      </Table>
    </div>
  );
}
