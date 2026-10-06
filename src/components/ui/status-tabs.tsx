import Link from "next/link";

export type StatusTab = { key: string; label: string; count: number; href: string };

/** Count-backed status tab row (e.g. "All (128)  Open (42)  Closed (56)") —
 * every count is a real aggregate passed in by the caller, never estimated. */
export function StatusTabs({ tabs, active }: { tabs: StatusTab[]; active: string }) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-1 border-b border-border">
      {tabs.map((t) => {
        const isActive = t.key === active;
        return (
          <Link
            key={t.key}
            href={t.href}
            className={`relative px-3 py-2 text-[13px] font-medium transition-colors ${
              isActive ? "text-brand-800" : "text-text-secondary hover:text-text-primary"
            }`}
          >
            {t.label}
            <span className={`ml-1.5 text-[11px] ${isActive ? "text-brand-700" : "text-text-muted"}`}>({t.count})</span>
            {isActive && <span className="absolute inset-x-1 -bottom-px h-[2px] rounded-full bg-brand-700" />}
          </Link>
        );
      })}
    </div>
  );
}
