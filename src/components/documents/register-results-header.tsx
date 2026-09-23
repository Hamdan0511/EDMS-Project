"use client";

/** Compact "N results (N selected)  Select All" text block shared by both
 * the table (list) and grid views of a document register — `total` is the
 * real database count for the current filters (not just the current page).
 * Callers place this alongside their own right-aligned controls (column
 * manager, view toggle) rather than this component owning the whole row. */
export function RegisterResultsHeader({
  total,
  selectedCount,
  onSelectAll,
  resolving,
}: {
  total: number;
  selectedCount: number;
  onSelectAll: () => void;
  resolving?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 text-[13px]">
      <span className="text-text-secondary">
        {total} result{total === 1 ? "" : "s"} ({resolving ? "selecting…" : `${selectedCount} selected`})
      </span>
      <button type="button" onClick={onSelectAll} className="font-medium text-brand-700 hover:underline">
        Select All
      </button>
    </div>
  );
}
