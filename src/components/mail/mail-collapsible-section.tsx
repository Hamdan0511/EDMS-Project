import type { ReactNode } from "react";
import { ChevronRight } from "@/components/ui/icons";

/** An Aconex-style collapsible register section — same visual weight as
 * SectionHeader, but the header itself toggles the section (native
 * <details>, so it works with zero client JS and is keyboard-accessible
 * out of the box). */
export function MailCollapsibleSection({
  title,
  defaultOpen = true,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details open={defaultOpen} className="group border-b border-border">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 bg-brand-50 px-4 py-2 marker:content-none">
        <ChevronRight size={12} className="text-brand-800 transition-transform group-open:rotate-90" />
        <span className="text-[11px] font-semibold uppercase tracking-wide text-brand-800">{title}</span>
      </summary>
      <div className="px-4 py-3">{children}</div>
    </details>
  );
}
