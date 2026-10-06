import Link from "next/link";

export type RelatedRecordGroup = {
  label: string;
  items: { id: string; label: string; href: string; badge?: string }[];
};

/** Grouped, clickable cross-module related records — Documents/Drawings,
 * Mail, Field, HSE, Corrective Actions. Every link is a real href to a real
 * record; a group with no items is simply omitted, never shown as a dead
 * placeholder. */
export function FieldRelatedRecords({ groups }: { groups: RelatedRecordGroup[] }) {
  const nonEmpty = groups.filter((g) => g.items.length > 0);
  if (nonEmpty.length === 0) {
    return <p className="px-4 py-3 text-[13px] text-text-muted">No related records yet.</p>;
  }

  return (
    <div className="flex flex-col divide-y divide-border">
      {nonEmpty.map((g) => (
        <div key={g.label} className="px-4 py-3">
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-text-secondary">{g.label}</p>
          <ul className="flex flex-col gap-1">
            {g.items.map((item) => (
              <li key={item.id} className="flex items-center gap-2">
                <Link href={item.href} className="text-[13px] text-brand-700 hover:underline">
                  {item.label}
                </Link>
                {item.badge && <span className="text-[11px] text-text-muted">{item.badge}</span>}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
