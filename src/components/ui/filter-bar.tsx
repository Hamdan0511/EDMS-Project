import { ReactNode } from "react";

/** Visual shell around a page's GET filter form, so every list page's filter row looks like one system. */
export function FilterBar({ children }: { children: ReactNode }) {
  return (
    <div className="mb-3 rounded-[3px] border border-border bg-white px-3 py-2.5">
      <div className="flex flex-wrap items-end gap-2">{children}</div>
    </div>
  );
}

/** "N records" result-count line shown between the filter bar and the table. */
export function ResultSummary({ count, noun = "record" }: { count: number; noun?: string }) {
  return (
    <p className="mb-2 text-[11px] text-text-secondary">
      {count} {noun}
      {count === 1 ? "" : "s"}
    </p>
  );
}
