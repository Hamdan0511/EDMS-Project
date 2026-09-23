"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Dropdown } from "@/components/ui/dropdown";
import { ChevronDown, CheckCircle2 } from "@/components/ui/icons";

export function MailActionsMenu({
  mailId,
  canReply,
  singleAttachmentUrl,
  currentStatus,
}: {
  mailId: string;
  canReply: boolean;
  singleAttachmentUrl: string | null;
  currentStatus: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function setWorkflowStatus(close: () => void, workflowStatus: "CLOSED_OUT" | "NO_ACTION_REQUIRED") {
    setPending(true);
    await fetch(`/api/mail/${mailId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workflowStatus }),
    });
    setPending(false);
    close();
    router.refresh();
  }

  const itemClass = "block w-full px-3 py-2 text-left text-[13px] text-text-primary hover:bg-brand-50";

  return (
    <Dropdown
      align="left"
      trigger={({ toggle, open }) => (
        <button
          type="button"
          onClick={toggle}
          className="flex items-center gap-1.5 rounded-[3px] border border-border bg-white px-3 py-1.5 text-[13px] font-medium text-text-primary hover:bg-brand-50"
        >
          Actions
          <ChevronDown size={12} className={`transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      )}
    >
      {(close) => (
        <div className="w-48 py-1">
          {canReply && (
            <>
              <Link href={`/mail/new?replyTo=${mailId}`} onClick={close} className={itemClass}>
                Reply
              </Link>
              <Link href={`/mail/new?replyAll=${mailId}`} onClick={close} className={itemClass}>
                Reply All
              </Link>
              <Link href={`/mail/new?forwardOf=${mailId}`} onClick={close} className={itemClass}>
                Forward
              </Link>
            </>
          )}
          <a
            href={`/mail-print/${mailId}?style=screen`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={close}
            className={itemClass}
          >
            Print
          </a>
          {singleAttachmentUrl && (
            <a href={`${singleAttachmentUrl}?download=1`} onClick={close} className={itemClass}>
              Download Attachment
            </a>
          )}
          {currentStatus !== "Closed-Out" && (
            <button
              type="button"
              disabled={pending}
              onClick={() => setWorkflowStatus(close, "CLOSED_OUT")}
              className={`flex items-center gap-1.5 ${itemClass}`}
            >
              <CheckCircle2 size={13} />
              {pending ? "Updating..." : "Mark as Closed-Out"}
            </button>
          )}
          {currentStatus !== "Closed-Out" && currentStatus !== "No Action Required" && (
            <button
              type="button"
              disabled={pending}
              onClick={() => setWorkflowStatus(close, "NO_ACTION_REQUIRED")}
              className={`flex items-center gap-1.5 ${itemClass}`}
            >
              <CheckCircle2 size={13} />
              {pending ? "Updating..." : "Mark No Action Required"}
            </button>
          )}
        </div>
      )}
    </Dropdown>
  );
}
