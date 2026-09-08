import { ReactNode } from "react";

export function SectionHeader({ children, actions }: { children: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-border bg-brand-50 px-4 py-2">
      <h2 className="text-[11px] font-semibold uppercase tracking-wide text-brand-800">
        {children}
      </h2>
      {actions}
    </div>
  );
}
