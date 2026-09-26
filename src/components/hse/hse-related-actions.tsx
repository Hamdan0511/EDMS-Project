import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Plus } from "@/components/ui/icons";
import { ACTION_STATUS_LABELS, ACTION_STATUS_BADGE_CLASSES, ACTION_PRIORITY_LABELS, ACTION_PRIORITY_BADGE_CLASSES } from "@/lib/hse/status";
import type { HseActionPriority, HseCorrectiveActionStatus } from "@prisma/client";

export type RelatedActionItem = {
  id: string;
  actionNumber: string;
  description: string;
  status: HseCorrectiveActionStatus;
  priority: HseActionPriority;
  assignedToName: string | null;
  dueDate: string | null;
};

/** Real corrective actions raised FROM this record (sourceType/sourceId) —
 * closes the loop from IDENTIFY/ASSESS back to CORRECT/VERIFY/CLOSE without
 * a separate, duplicated actions concept per module. */
export function HseRelatedActions({
  items,
  raiseHref,
  canRaise,
}: {
  items: RelatedActionItem[];
  raiseHref: string;
  canRaise: boolean;
}) {
  return (
    <div className="flex flex-col gap-3 px-4 py-3">
      {items.length === 0 ? (
        <p className="text-[13px] text-text-muted">No corrective actions raised from this record yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((a) => (
            <li key={a.id} className="flex items-center justify-between rounded-[3px] border border-border bg-white p-2.5 text-[13px]">
              <div>
                <Link href={`/hse/corrective-actions/${a.id}`} className="font-medium text-brand-700 hover:underline">
                  {a.actionNumber}
                </Link>
                <p className="mt-0.5 max-w-md truncate text-text-secondary">{a.description}</p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge label={ACTION_PRIORITY_LABELS[a.priority]} className={ACTION_PRIORITY_BADGE_CLASSES[a.priority]} />
                <StatusBadge label={ACTION_STATUS_LABELS[a.status]} className={ACTION_STATUS_BADGE_CLASSES[a.status]} />
              </div>
            </li>
          ))}
        </ul>
      )}
      {canRaise && (
        <Link href={raiseHref} className={`${buttonClass("secondary", "sm")} w-fit`}>
          <Plus size={13} />
          Raise Corrective Action
        </Link>
      )}
    </div>
  );
}
