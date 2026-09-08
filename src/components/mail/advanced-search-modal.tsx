"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, FormEvent } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

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

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const params = new URLSearchParams();
    params.set("tab", searchParams.get("tab") ?? "all");

    for (const [key, value] of form.entries()) {
      const v = String(value).trim();
      if (v) params.set(key, v);
    }

    router.push(`/mail?${params.toString()}`);
    setOpen(false);
  }

  const field = "flex flex-col gap-1 text-xs font-medium text-text-secondary";

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
          <label className={field}>
            Date From
            <Input type="date" name="dateFrom" defaultValue={searchParams.get("dateFrom") ?? ""} />
          </label>
          <label className={field}>
            Date To
            <Input type="date" name="dateTo" defaultValue={searchParams.get("dateTo") ?? ""} />
          </label>
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
