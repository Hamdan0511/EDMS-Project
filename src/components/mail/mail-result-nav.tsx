import Link from "next/link";
import { Paperclip, ChevronLeft, ChevronRight } from "@/components/ui/icons";
import type { MailResultContext } from "@/lib/mail/result-context";

export type MailResultSummary = {
  mailNumber: string;
  subject: string;
  typeLabel: string;
  senderName: string;
  senderOrg: string;
  date: string;
  attachmentCount: number;
};

/** The left-hand result-navigation panel from a real Mail search/register
 * view — mirrors the density of an enterprise correspondence system
 * (current item + "N of Total search results, prev/next") rather than
 * re-fetching or re-rendering the entire result list just to show where in
 * it the user currently is. */
export function MailResultNav({
  mail,
  context,
}: {
  mail: MailResultSummary;
  context: MailResultContext;
}) {
  function withReturn(id: string): string {
    return `/mail/${id}?return=${encodeURIComponent(context.returnQuery)}`;
  }

  return (
    <aside className="flex w-72 shrink-0 flex-col border-r border-border bg-white">
      <div className="border-b border-border bg-brand-50 px-3 py-2.5 text-xs">
        <div className="font-medium leading-snug text-text-primary">{mail.subject}</div>
        <div className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-text-muted">{mail.typeLabel}</div>
        <div className="mt-1.5 text-text-secondary">{mail.senderName}</div>
        <div className="text-text-muted">{mail.senderOrg}</div>
        <div className="mt-1.5 flex items-center justify-between text-text-muted">
          <span>{mail.date}</span>
          <span>{mail.mailNumber}</span>
        </div>
        {mail.attachmentCount > 0 && (
          <div className="mt-1.5 flex items-center gap-1 text-text-muted">
            <Paperclip size={11} />
            {mail.attachmentCount}
          </div>
        )}
      </div>

      <div className="mt-auto flex items-center justify-between border-t border-border px-3 py-2.5 text-[12px]">
        {context.prevId ? (
          <Link href={withReturn(context.prevId)} className="flex items-center gap-1 text-brand-700 hover:underline">
            <ChevronLeft size={13} />
            prev
          </Link>
        ) : (
          <span className="flex items-center gap-1 text-text-muted/50">
            <ChevronLeft size={13} />
            prev
          </span>
        )}
        <span className="text-text-muted">
          {context.position > 0 ? `${context.position} of ${context.total}` : `${context.total} results`}
        </span>
        {context.nextId ? (
          <Link href={withReturn(context.nextId)} className="flex items-center gap-1 text-brand-700 hover:underline">
            next
            <ChevronRight size={13} />
          </Link>
        ) : (
          <span className="flex items-center gap-1 text-text-muted/50">
            next
            <ChevronRight size={13} />
          </span>
        )}
      </div>
    </aside>
  );
}
