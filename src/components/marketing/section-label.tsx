export function SectionLabel({ children }: { children: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="h-px w-8 bg-brand-400" />
      <span className="text-[11px] font-medium uppercase tracking-[0.22em] text-brand-600">{children}</span>
    </div>
  );
}
