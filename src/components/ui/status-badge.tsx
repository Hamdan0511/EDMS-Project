export function StatusBadge({ label, className }: { label: string; className: string }) {
  return (
    <span className={`inline-flex items-center rounded-[3px] px-2 py-0.5 text-[11px] font-medium ${className}`}>
      {label}
    </span>
  );
}
