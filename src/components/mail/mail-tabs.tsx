import Link from "next/link";
import type { MailTab } from "@/lib/mail/query";

const TABS: { key: MailTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "inbox", label: "Inbox" },
  { key: "sent", label: "Sent" },
  { key: "drafts", label: "Draft" },
];

export function MailTabs({
  active,
  counts,
}: {
  active: MailTab;
  counts: Record<MailTab, number>;
}) {
  return (
    <div className="flex gap-1 border-b border-border px-6">
      {TABS.map((t) => (
        <Link
          key={t.key}
          href={`/mail?tab=${t.key}`}
          className={[
            "border-b-2 px-3 py-2.5 text-[13px] font-medium",
            active === t.key
              ? "border-brand-700 text-text-primary"
              : "border-transparent text-text-secondary hover:text-text-primary",
          ].join(" ")}
        >
          {t.label} <span className="text-text-muted">({counts[t.key]})</span>
        </Link>
      ))}
    </div>
  );
}
