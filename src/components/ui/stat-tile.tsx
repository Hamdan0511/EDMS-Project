import Link from "next/link";
import type { ComponentType } from "react";

export function StatTile({
  label,
  value,
  href,
  icon: Icon,
  translucent = false,
}: {
  label: string;
  value: number;
  href: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  /** For use over a background image (e.g. Home hero) instead of a plain page background. */
  translucent?: boolean;
}) {
  return (
    <Link
      href={href}
      className={[
        "flex items-center gap-3 rounded-[3px] border px-4 py-3.5 shadow-sm transition-colors hover:border-brand-400 hover:shadow",
        translucent ? "border-white/60 bg-white/85 backdrop-saturate-150" : "border-border bg-white",
      ].join(" ")}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[3px] bg-brand-50 text-brand-600">
        <Icon size={17} />
      </span>
      <span className="flex flex-col">
        <span className="text-xl font-semibold leading-tight text-text-primary">{value}</span>
        <span className="text-[11px] font-medium uppercase tracking-wide text-text-secondary">
          {label}
        </span>
      </span>
    </Link>
  );
}
