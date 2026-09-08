import Link from "next/link";
import { ChevronLeft, ChevronRight } from "@/components/ui/icons";

function pageNumbers(current: number, totalPages: number): (number | "…")[] {
  const pages = new Set<number>([1, totalPages, current, current - 1, current + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);

  const result: (number | "…")[] = [];
  let prev = 0;
  for (const p of sorted) {
    if (prev && p - prev > 1) result.push("…");
    result.push(p);
    prev = p;
  }
  return result;
}

export function Pagination({
  page,
  pageSize,
  total,
  buildHref,
}: {
  page: number;
  pageSize: number;
  total: number;
  buildHref: (page: number) => string;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, total);

  const linkClass = (active = false, disabled = false) =>
    [
      "flex h-7 min-w-7 items-center justify-center rounded-[3px] px-1.5 text-xs",
      disabled
        ? "cursor-not-allowed text-text-muted"
        : active
          ? "bg-brand-700 text-white"
          : "text-text-secondary hover:bg-brand-50",
    ].join(" ");

  return (
    <div className="flex items-center justify-between gap-4 text-xs text-text-secondary">
      <span>
        {rangeStart} - {rangeEnd} of {total}
      </span>
      <nav className="flex items-center gap-0.5">
        {page > 1 ? (
          <Link href={buildHref(page - 1)} className={linkClass()} aria-label="Previous page">
            <ChevronLeft size={14} />
          </Link>
        ) : (
          <span className={linkClass(false, true)}>
            <ChevronLeft size={14} />
          </span>
        )}
        {pageNumbers(page, totalPages).map((p, i) =>
          p === "…" ? (
            <span key={`e${i}`} className="px-1 text-text-muted">
              …
            </span>
          ) : (
            <Link key={p} href={buildHref(p)} className={linkClass(p === page)}>
              {p}
            </Link>
          ),
        )}
        {page < totalPages ? (
          <Link href={buildHref(page + 1)} className={linkClass()} aria-label="Next page">
            <ChevronRight size={14} />
          </Link>
        ) : (
          <span className={linkClass(false, true)}>
            <ChevronRight size={14} />
          </span>
        )}
      </nav>
    </div>
  );
}
