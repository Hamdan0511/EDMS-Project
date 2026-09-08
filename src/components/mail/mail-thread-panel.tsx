import Link from "next/link";

export type ThreadItem = {
  id: string;
  subject: string;
  mailNumber: string;
  senderName: string;
  senderOrg: string;
  date: string;
};

export function MailThreadPanel({
  items,
  currentId,
  linkable = true,
}: {
  items: ThreadItem[];
  currentId: string;
  linkable?: boolean;
}) {
  if (items.length <= 1) return null;

  return (
    <aside className="w-72 shrink-0 border-r border-border bg-white">
      {items.map((item) => {
        const active = item.id === currentId;
        const content = (
          <div
            className={[
              "border-b border-border px-3 py-2.5 text-xs",
              active ? "bg-brand-50" : "hover:bg-brand-50/60",
            ].join(" ")}
          >
            <div className="font-medium text-text-primary">{item.senderName}</div>
            <div className="text-text-muted">{item.senderOrg}</div>
            <div className="mt-1 flex items-center justify-between text-text-muted">
              <span>{item.date}</span>
              <span>{item.mailNumber}</span>
            </div>
          </div>
        );
        return linkable ? (
          <Link key={item.id} href={`/mail/${item.id}`}>
            {content}
          </Link>
        ) : (
          <div key={item.id}>{content}</div>
        );
      })}
    </aside>
  );
}
