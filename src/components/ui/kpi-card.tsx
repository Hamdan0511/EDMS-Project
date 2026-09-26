import Link from "next/link";
import type { ComponentType, ReactNode } from "react";

type Tone = "neutral" | "warning" | "critical";

const ICON_TONE_CLASSES: Record<Tone, string> = {
  neutral: "bg-brand-50 text-brand-600",
  warning: "bg-amber-50 text-amber-700",
  critical: "bg-red-50 text-red-700",
};

type KpiCardProps = {
  label: string;
  value: number | string;
  icon: ComponentType<{ size?: number; className?: string }>;
  href?: string;
  /** Factual comparison only (e.g. "+3 vs last period") — never colored as good/bad. */
  delta?: string;
  tone?: Tone;
  action?: ReactNode;
};

/** Compact enterprise KPI card: label, strong number, icon, optional factual delta and action. */
export function KpiCard({ label, value, icon: Icon, href, delta, tone = "neutral", action }: KpiCardProps) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-2">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[3px] ${ICON_TONE_CLASSES[tone]}`}>
          <Icon size={17} />
        </span>
        {action}
      </div>
      <div className="mt-2.5 flex flex-col">
        <span className="text-2xl font-semibold leading-tight text-text-primary">{value}</span>
        <span className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-text-secondary">
          {label}
        </span>
        {delta && <span className="mt-1 text-[11px] text-text-muted">{delta}</span>}
      </div>
    </>
  );

  const className =
    "flex flex-col rounded-[3px] border border-border bg-white px-4 py-3.5 shadow-sm transition-colors";

  if (href) {
    return (
      <Link href={href} className={`${className} hover:border-brand-400 hover:shadow`}>
        {content}
      </Link>
    );
  }

  return <div className={className}>{content}</div>;
}
