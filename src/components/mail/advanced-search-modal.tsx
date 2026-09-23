"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, FormEvent } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Plus, X } from "@/components/ui/icons";

type DateField = "sent" | "due";
type DateRow = { field: DateField; from: string; to: string };

function parseInitialDateQueries(raw: string | null): DateRow[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((q) => q && typeof q === "object" && (q.field === "sent" || q.field === "due"))
      .map((q) => ({ field: q.field, from: q.from ?? "", to: q.to ?? "" }));
  } catch {
    return [];
  }
}

export function AdvancedSearchModal({
  statusOptions,
  typeOptions,
}: {
  statusOptions: { value: string; label: string }[];
  typeOptions: { value: string; label: string }[];
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const [dateRows, setDateRows] = useState<DateRow[]>(() => [
    {
      field: (searchParams.get("dateField") as DateField) || "sent",
      from: searchParams.get("dateFrom") ?? "",
      to: searchParams.get("dateTo") ?? "",
    },
    ...parseInitialDateQueries(searchParams.get("dateQueries")),
  ]);

  function updateDateRow(index: number, patch: Partial<DateRow>) {
    setDateRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  function addDateRow() {
    setDateRows((prev) => [...prev, { field: "sent", from: "", to: "" }]);
  }

  function removeDateRow(index: number) {
    setDateRows((prev) => prev.filter((_, i) => i !== index));
  }

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const params = new URLSearchParams();
    params.set("tab", searchParams.get("tab") ?? "all");

    for (const [key, value] of form.entries()) {
      const v = String(value).trim();
      if (v) params.set(key, v);
    }

    const [row0, ...extraRows] = dateRows;
    if (row0 && (row0.from || row0.to)) {
      params.set("dateField", row0.field);
      if (row0.from) params.set("dateFrom", row0.from);
      if (row0.to) params.set("dateTo", row0.to);
    }
    const validExtra = extraRows.filter((r) => r.from || r.to);
    if (validExtra.length > 0) {
      params.set("dateQueries", JSON.stringify(validExtra));
    }

    router.push(`/mail?${params.toString()}`);
    setOpen(false);
  }

  const field = "flex flex-col gap-1 text-xs font-medium text-text-secondary";
  const dateFieldLabel = (f: DateField) => (f === "due" ? "Response Due Date" : "Date");

  return (
    <>
      <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
        Advanced Search
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Advanced Search" width="max-w-2xl">
        <form onSubmit={submit} className="grid grid-cols-2 gap-4">
          <label className={field}>
            Mail No.
            <Input name="mailNo" defaultValue={searchParams.get("mailNo") ?? ""} />
          </label>
          <label className={field}>
            Subject
            <Input name="subject" defaultValue={searchParams.get("subject") ?? ""} />
          </label>
          <label className={field}>
            From
            <Input name="from" defaultValue={searchParams.get("from") ?? ""} />
          </label>
          <label className={field}>
            From Organization
            <Input name="fromOrg" defaultValue={searchParams.get("fromOrg") ?? ""} />
          </label>
          <label className={field}>
            To Organization
            <Input name="toOrg" defaultValue={searchParams.get("toOrg") ?? ""} />
          </label>
          <label className={field}>
            Recipient
            <Input name="recipients" defaultValue={searchParams.get("recipients") ?? ""} />
          </label>
          <label className={field}>
            Status
            <Select name="status" defaultValue={searchParams.get("status") ?? ""}>
              <option value="">Any</option>
              {statusOptions.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </label>
          <label className={field}>
            Type
            <Select name="type" defaultValue={searchParams.get("type") ?? ""}>
              <option value="">Any</option>
              {typeOptions.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </label>

          <div className="col-span-2 flex flex-col gap-2 border-t border-border pt-3">
            {dateRows.map((row, i) => (
              <div key={i} className="flex items-end gap-2">
                <label className={`${field} w-40`}>
                  {i === 0 ? "Date Range" : "Date Query"}
                  <Select value={row.field} onChange={(e) => updateDateRow(i, { field: e.target.value as DateField })}>
                    <option value="sent">Date</option>
                    <option value="due">Response Due Date</option>
                  </Select>
                </label>
                <label className={field}>
                  From
                  <Input type="date" value={row.from} onChange={(e) => updateDateRow(i, { from: e.target.value })} />
                </label>
                <label className={field}>
                  To
                  <Input type="date" value={row.to} onChange={(e) => updateDateRow(i, { to: e.target.value })} />
                </label>
                {i > 0 && (
                  <button
                    type="button"
                    onClick={() => removeDateRow(i)}
                    className="mb-1.5 flex items-center gap-1 text-xs text-danger hover:underline"
                    aria-label={`Remove ${dateFieldLabel(row.field)} query`}
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addDateRow}
              className="flex w-fit items-center gap-1 text-xs font-medium text-brand-700 hover:underline"
            >
              <Plus size={12} />
              Add another date query
            </button>
          </div>

          <label className="flex items-center gap-1.5 text-[13px] text-text-primary">
            <input
              type="checkbox"
              name="myUnread"
              value="1"
              defaultChecked={searchParams.get("myUnread") === "1"}
              className="h-3.5 w-3.5 accent-brand-700"
            />
            Unread only
          </label>
          <label className="flex items-center gap-1.5 text-[13px] text-text-primary">
            <input
              type="checkbox"
              name="myMailOnly"
              value="1"
              defaultChecked={searchParams.get("myMailOnly") === "1"}
              className="h-3.5 w-3.5 accent-brand-700"
            />
            My mail only
          </label>

          <div className="col-span-2 mt-2 flex justify-end gap-2 border-t border-border pt-4">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Search
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
