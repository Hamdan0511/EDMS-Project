/** Simple, real-data horizontal bar list — deliberately not a decorative
 * chart library. Each bar's width is proportional to the max value in the
 * set; bars never render for data that doesn't exist. */
export function HseBarList({
  items,
  barClassName = "bg-brand-600",
}: {
  items: { label: string; value: number }[];
  barClassName?: string;
}) {
  if (items.length === 0) {
    return <p className="px-4 py-3 text-[13px] text-text-muted">No data for the selected period.</p>;
  }
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <div className="flex flex-col gap-2 px-4 py-3">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-3">
          <span className="w-32 shrink-0 truncate text-[12px] text-text-secondary">{item.label}</span>
          <div className="h-4 flex-1 rounded-[2px] bg-brand-50">
            <div
              className={`h-4 rounded-[2px] ${barClassName}`}
              style={{ width: `${Math.max((item.value / max) * 100, item.value > 0 ? 3 : 0)}%` }}
            />
          </div>
          <span className="w-8 shrink-0 text-right text-[12px] font-medium text-text-primary">{item.value}</span>
        </div>
      ))}
    </div>
  );
}
