import { Button } from "@/components/ui/button";
import { IconInput } from "@/components/ui/input";
import { Search } from "@/components/ui/icons";
import Link from "next/link";

export function MailFilters({
  q,
  myMailOnly,
  myUnread,
  recipientType,
}: {
  q: string;
  myMailOnly: boolean;
  myUnread: boolean;
  recipientType: string;
}) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-border pb-3">
      <label className="flex items-center gap-1.5 text-[13px] text-text-primary">
        <input
          type="checkbox"
          name="myMailOnly"
          value="1"
          defaultChecked={myMailOnly}
          className="h-3.5 w-3.5 accent-brand-700"
        />
        My mail only
      </label>
      <label className="flex items-center gap-1.5 text-[13px] text-text-primary">
        <input
          type="checkbox"
          name="myUnread"
          value="1"
          defaultChecked={myUnread}
          className="h-3.5 w-3.5 accent-brand-700"
        />
        My unread
      </label>

      <div className="flex items-center gap-3 text-[13px] text-text-primary">
        <span className="text-text-secondary">Recipient Type</span>
        {[
          { value: "any", label: "Any" },
          { value: "to", label: "To" },
          { value: "cc", label: "Cc" },
        ].map((opt) => (
          <label key={opt.value} className="flex items-center gap-1.5">
            <input
              type="radio"
              name="recipientType"
              value={opt.value}
              defaultChecked={recipientType === opt.value}
              className="h-3.5 w-3.5 accent-brand-700"
            />
            {opt.label}
          </label>
        ))}
      </div>

      <div className="flex flex-1 items-center gap-2">
        <div className="min-w-56 flex-1 max-w-md">
          <IconInput
            icon={<Search size={14} />}
            name="q"
            defaultValue={q}
            placeholder="Search mail no., subject, sender, recipient, organization…"
          />
        </div>
        <Button type="submit" variant="primary">
          Search
        </Button>
        <Link href="/mail" className="text-[13px] text-brand-700 hover:underline">
          Clear All
        </Link>
      </div>
    </div>
  );
}
