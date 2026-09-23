"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input, IconInput } from "@/components/ui/input";
import { Search, ChevronDown, ChevronRight } from "@/components/ui/icons";
import { MultiSelect } from "@/components/ui/multi-select";
import { DateQueryFilters } from "./date-query-filters";
import { SaveSearchModal } from "./save-search-modal";
import { DOCUMENT_STATUS_OPTIONS, DOCUMENT_REVIEW_STATUS_OPTIONS, NO_DOCUMENT_TYPE_VALUE } from "@/lib/documents/status";

/** Compact, always-visible (not modal) filter panel for the Drawings
 * register — mirrors an enterprise document-control search/filter layout:
 * a primary pinned filter row plus a collapsible "More Filters" section.
 * Every control is a real server-side filter submitted via the surrounding
 * GET <form> (see drawings/page.tsx); there is no client-only/fake filter
 * here. */
export function DrawingsSearchPanel({
  projectId,
  projectName,
  q,
  clearAllHref,
  resetPinnedHref,
  organizationOptions,
  typeOptions,
  disciplineOptions,
  functionalBreakdownOptions,
  spatialBreakdownOptions,
  initial,
  moreFiltersActiveCount,
}: {
  projectId: string;
  projectName: string;
  q: string;
  clearAllHref: string;
  resetPinnedHref: string;
  organizationOptions: { id: string; name: string }[];
  typeOptions: { id: string; name: string }[];
  disciplineOptions: string[];
  functionalBreakdownOptions: string[];
  spatialBreakdownOptions: string[];
  initial: {
    organizationId: string;
    functionalBreakdown: string;
    spatialBreakdown: string;
    typeId: string;
    discipline: string;
    reviewStatus: string;
    status: string;
    documentNo: string;
    title: string;
    revision: string;
    dateUploadedFrom: string;
    dateUploadedTo: string;
    dateModifiedFrom: string;
    dateModifiedTo: string;
  };
  moreFiltersActiveCount: number;
}) {
  const [moreOpen, setMoreOpen] = useState(moreFiltersActiveCount > 0);
  const [saveOpen, setSaveOpen] = useState(false);

  const split = (v: string) => (v ? v.split(",").filter(Boolean) : []);
  const field = "flex flex-col gap-1 text-[11px] font-medium text-text-secondary";

  return (
    <div className="border-b border-border pb-2">
      <div className="flex flex-wrap items-center gap-2 pb-2">
        <div className="min-w-64 max-w-xl flex-1">
          <IconInput
            icon={<Search size={14} />}
            name="q"
            defaultValue={q}
            placeholder="Search across all document fields including Document Number"
          />
        </div>
        <Button type="submit" variant="primary" size="sm">
          Search
        </Button>
        <Link href={clearAllHref} className="text-[13px] text-brand-700 hover:underline">
          Clear all filters
        </Link>
        <Button type="button" variant="secondary" size="sm" onClick={() => setSaveOpen(true)}>
          Save Search As...
        </Button>
      </div>

      <label
        className="mb-2 flex w-fit items-center gap-1.5 text-xs text-text-muted"
        title="Full-text search inside file contents is not supported by this system yet — search matches document number, title, and file name only."
      >
        <input type="checkbox" disabled className="h-3.5 w-3.5" />
        Search file content
      </label>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        <label className={field}>
          Originator
          <MultiSelect
            name="organizationId"
            placeholder="Select values..."
            defaultValue={split(initial.organizationId)}
            options={organizationOptions.map((o) => ({ value: o.id, label: o.name }))}
          />
        </label>
        <label className={field}>
          Functional Breakdown
          <MultiSelect
            name="functionalBreakdown"
            placeholder="Select values..."
            defaultValue={split(initial.functionalBreakdown)}
            options={functionalBreakdownOptions.map((v) => ({ value: v, label: v }))}
          />
        </label>
        <label className={field}>
          Spatial Breakdown
          <MultiSelect
            name="spatialBreakdown"
            placeholder="Select values..."
            defaultValue={split(initial.spatialBreakdown)}
            options={spatialBreakdownOptions.map((v) => ({ value: v, label: v }))}
          />
        </label>
        <label className={field}>
          Type
          <MultiSelect
            name="typeId"
            placeholder="Select values..."
            defaultValue={split(initial.typeId)}
            options={[
              ...typeOptions.map((t) => ({ value: t.id, label: t.name })),
              { value: NO_DOCUMENT_TYPE_VALUE, label: "No Document Type" },
            ]}
          />
        </label>
        <label className={field}>
          Discipline
          <MultiSelect
            name="discipline"
            placeholder="Select values..."
            defaultValue={split(initial.discipline)}
            options={disciplineOptions.map((v) => ({ value: v, label: v }))}
          />
        </label>
        <label className={field}>
          Review Status
          <MultiSelect
            name="reviewStatus"
            placeholder="Select values..."
            defaultValue={split(initial.reviewStatus)}
            options={DOCUMENT_REVIEW_STATUS_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
          />
        </label>
        <label className={field}>
          Status
          <MultiSelect
            name="status"
            placeholder="Select values..."
            defaultValue={split(initial.status)}
            options={DOCUMENT_STATUS_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
          />
        </label>
        <label
          className={field}
          title="This register is scoped to your currently selected project — cross-project search is not part of this application."
        >
          Project
          <Input value={projectName} disabled />
        </label>
      </div>

      <div className="mt-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setMoreOpen((v) => !v)}
          className="flex items-center gap-1 text-[13px] font-medium text-text-secondary hover:text-text-primary"
        >
          {moreOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          More Filters {moreFiltersActiveCount > 0 ? `(${moreFiltersActiveCount})` : ""}
        </button>
        <Link href={resetPinnedHref} className="text-[12px] text-brand-700 hover:underline">
          Reset pinned filters
        </Link>
      </div>

      {moreOpen && (
        <div className="mt-2 grid grid-cols-1 gap-3 rounded-[3px] border border-border bg-background/40 p-3 sm:grid-cols-3">
          <label className={field}>
            Document No
            <Input name="documentNo" defaultValue={initial.documentNo} />
          </label>
          <label className={field}>
            Title
            <Input name="title" defaultValue={initial.title} />
          </label>
          <label className={field}>
            Revision
            <Input name="revision" defaultValue={initial.revision} />
          </label>
          <div className="sm:col-span-3">
            <DateQueryFilters
              initial={{
                uploadedFrom: initial.dateUploadedFrom,
                uploadedTo: initial.dateUploadedTo,
                modifiedFrom: initial.dateModifiedFrom,
                modifiedTo: initial.dateModifiedTo,
              }}
            />
          </div>
        </div>
      )}

      <SaveSearchModal projectId={projectId} open={saveOpen} onClose={() => setSaveOpen(false)} />
    </div>
  );
}
