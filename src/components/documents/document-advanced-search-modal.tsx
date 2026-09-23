"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, FormEvent } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { DOCUMENT_STATUS_OPTIONS, DOCUMENT_REVIEW_STATUS_OPTIONS } from "@/lib/documents/status";

export function DocumentAdvancedSearchModal({
  typeOptions,
  organizationOptions,
  disciplineOptions,
  functionalBreakdownOptions,
  spatialBreakdownOptions,
}: {
  typeOptions: { id: string; name: string }[];
  organizationOptions: { id: string; name: string }[];
  disciplineOptions: string[];
  functionalBreakdownOptions: string[];
  spatialBreakdownOptions: string[];
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const params = new URLSearchParams();
    for (const [key, value] of form.entries()) {
      const v = String(value).trim();
      if (v) params.set(key, v);
    }
    // Preserve the register's current view (e.g. Drawings grid/list) across
    // an Advanced Search submit, same as Clear All / pagination links do.
    const view = searchParams.get("view");
    if (view) params.set("view", view);
    router.push(`${pathname}?${params.toString()}`);
    setOpen(false);
  }

  const field = "flex flex-col gap-1 text-xs font-medium text-text-secondary";

  return (
    <>
      <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
        Advanced Search
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Advanced Search" width="max-w-3xl">
        <form onSubmit={submit} className="grid grid-cols-3 gap-4">
          <label className={field}>
            Document No.
            <Input name="documentNo" defaultValue={searchParams.get("documentNo") ?? ""} />
          </label>
          <label className={field}>
            Title
            <Input name="title" defaultValue={searchParams.get("title") ?? ""} />
          </label>
          <label className={field}>
            Revision
            <Input name="revision" defaultValue={searchParams.get("revision") ?? ""} />
          </label>
          <label className={field}>
            Document Type
            <Select name="typeId" defaultValue={searchParams.get("typeId") ?? ""}>
              <option value="">Any</option>
              {typeOptions.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </Select>
          </label>
          <label className={field}>
            Status
            <Select name="status" defaultValue={searchParams.get("status") ?? ""}>
              <option value="">Any</option>
              {DOCUMENT_STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </Select>
          </label>
          <label className={field}>
            Discipline
            <Select name="discipline" defaultValue={searchParams.get("discipline") ?? ""}>
              <option value="">Any</option>
              {disciplineOptions.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </Select>
          </label>
          <label className={field}>
            Functional Breakdown
            <Select name="functionalBreakdown" defaultValue={searchParams.get("functionalBreakdown") ?? ""}>
              <option value="">Any</option>
              {functionalBreakdownOptions.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </Select>
          </label>
          <label className={field}>
            Spatial Breakdown
            <Select name="spatialBreakdown" defaultValue={searchParams.get("spatialBreakdown") ?? ""}>
              <option value="">Any</option>
              {spatialBreakdownOptions.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </Select>
          </label>
          <label className={field}>
            Review Status
            <Select name="reviewStatus" defaultValue={searchParams.get("reviewStatus") ?? ""}>
              <option value="">Any</option>
              {DOCUMENT_REVIEW_STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </Select>
          </label>
          <label className={field}>
            Uploaded By
            <Input name="uploadedBy" defaultValue={searchParams.get("uploadedBy") ?? ""} />
          </label>
          <label className={field}>
            Organization
            <Select name="organizationId" defaultValue={searchParams.get("organizationId") ?? ""}>
              <option value="">Any</option>
              {organizationOptions.map((o) => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </Select>
          </label>
          <label
            className="flex items-center gap-1.5 self-end pb-1.5 text-xs font-medium text-text-muted"
            title="Full-text search inside file contents is not supported by this system yet — search matches document number, title, and file name only."
          >
            <input type="checkbox" disabled className="h-3.5 w-3.5" />
            Search file content (not available)
          </label>
          <label className={field}>
            Date Uploaded From
            <Input type="date" name="dateUploadedFrom" defaultValue={searchParams.get("dateUploadedFrom") ?? ""} />
          </label>
          <label className={field}>
            Date Uploaded To
            <Input type="date" name="dateUploadedTo" defaultValue={searchParams.get("dateUploadedTo") ?? ""} />
          </label>
          <div />
          <label className={field}>
            Date Modified From
            <Input type="date" name="dateModifiedFrom" defaultValue={searchParams.get("dateModifiedFrom") ?? ""} />
          </label>
          <label className={field}>
            Date Modified To
            <Input type="date" name="dateModifiedTo" defaultValue={searchParams.get("dateModifiedTo") ?? ""} />
          </label>

          <div className="col-span-3 mt-2 flex justify-end gap-2 border-t border-border pt-4">
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
