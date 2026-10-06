import type { FieldAuditEvent } from "@/lib/field/audit-trail";

/** Shared Timeline/Audit section for every Field detail page — a single
 * real chronological view of that record's persisted AuditLog rows. */
export function FieldAuditTrail({ events }: { events: FieldAuditEvent[] }) {
  if (events.length === 0) {
    return <p className="px-4 py-3 text-[13px] text-text-muted">No activity recorded yet.</p>;
  }

  return (
    <ol className="flex flex-col divide-y divide-border">
      {events.map((e) => (
        <li key={e.id} className="flex items-start gap-3 px-4 py-2.5 text-[13px]">
          <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-stone-400" />
          <div className="flex-1">
            <p className="text-text-primary">
              <span className="font-medium">{e.actorName}</span> — {e.label}
              {e.detail ? <span className="text-text-secondary"> ({e.detail})</span> : null}
            </p>
            <p className="text-[11px] text-text-muted">{e.createdAt.toLocaleString("en-GB")}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
