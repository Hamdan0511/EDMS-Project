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
  filters,
  statusOptions,
  typeOptions,
}: {
  rows: MailRow[];
  filters: FilterValues;
  statusOptions: { value: string; label: string }[];
  typeOptions: { value: string; label: string }[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkClosing, setBulkClosing] = useState(false);

  // Column visibility is a client-only preference (localStorage). The
  // server always renders DEFAULT_VISIBLE_COLUMNS since it has no access
  // to the browser's storage; swapping to the real stored value happens
  // only after mount, via the `mounted` gate below, so hydration always
  // matches the server-rendered HTML on the first paint.
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState<Record<ColumnKey, boolean>>(DEFAULT_VISIBLE_COLUMNS);

  // One-time hydration-safe read of a client-only external store
  // (localStorage), gated by `mounted` so it never affects the first
  // (server-matching) paint. Intentional use of setState in an effect.
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

  const allSelected = rows.length > 0 && selected.size === rows.length;

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.id)));
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const selectedCount = useMemo(() => selected.size, [selected]);
  const isVisible = (key: ColumnKey) => !mounted || visible[key];

  // Only SENT mail that isn't already Closed-Out can be closed out — matches
  // the same eligibility the single-mail MarkClosedOutButton enforces.
  const closableSelectedIds = rows
    .filter((r) => selected.has(r.id) && r.statusLabel !== "Draft" && r.statusLabel !== "Closed-Out")
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
    setSelected(new Set());
    router.refresh();
  }

  const inputClass =
    "h-6 w-full rounded-[2px] border border-border bg-white px-1.5 text-[11px] outline-none focus:border-accent";

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs text-text-secondary">
            {selectedCount > 0 ? `${selectedCount} of ${rows.length} selected` : ""}
          </span>
          {closableSelectedIds.length > 0 && (
            <Button type="button" variant="secondary" size="sm" disabled={bulkClosing} onClick={bulkMarkClosedOut}>
              <CheckCircle2 size={13} />
              {bulkClosing ? "Updating..." : `Mark Closed-Out (${closableSelectedIds.length})`}
            </Button>
          )}
        </div>
        <ColumnManager visible={mounted ? visible : DEFAULT_VISIBLE_COLUMNS} onChange={handleColumnChange} />
      </div>

      <Table>
        <Thead>
          <Tr>
            <Th className="w-16">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  aria-label="Select all"
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
          </Tr>
        </Thead>
        <Tbody>
          {rows.map((m) => (
            <Tr key={m.id}>
              <Td>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selected.has(m.id)}
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
            </Tr>
          ))}
        </Tbody>
      </Table>
    </div>
  );
}
