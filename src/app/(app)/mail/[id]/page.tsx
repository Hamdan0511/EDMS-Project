import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePageContext } from "@/lib/page-context";
import { prisma } from "@/lib/prisma";
import { getMailDetail, getMailThread } from "@/lib/mail/detail";
import { PageHeader } from "@/components/app-shell/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHeader } from "@/components/ui/section-header";
import { buttonClass } from "@/components/ui/button";
import { PrintMenu } from "@/components/mail/print-menu";
import { MailActionsMenu } from "@/components/mail/mail-actions-menu";
import { MailThreadPanel } from "@/components/mail/mail-thread-panel";
import { RecipientDisclosure } from "@/components/mail/recipient-disclosure";
import { MailRichContent } from "@/components/mail/mail-rich-content";
import { ChevronLeft, Paperclip } from "@/components/ui/icons";
import { WORKFLOW_STATUS_LABELS } from "@/lib/mail/workflow-status";
import { RESPONSE_TYPE_LABELS } from "@/lib/mail/response-type";
import { effectiveWorkflowStatus } from "@/lib/mail/overdue";

export default async function ViewMailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user, membership } = await requirePageContext();
  const { id } = await params;

  if (!membership) {
    return (
      <div className="p-6">
        <EmptyState title="You are not assigned to a project" />
      </div>
    );
  }

  const mail = await getMailDetail(id, membership.projectId);

  if (!mail) notFound();
  if (mail.status === "DRAFT" && mail.senderId !== user.id) notFound();

  const myRecipientRow = mail.recipients.find((r) => r.userId === user.id);
  if (myRecipientRow && !myRecipientRow.readAt) {
    await prisma.mailRecipient.update({
      where: { id: myRecipientRow.id },
      data: { readAt: new Date() },
    });
  }

  const to = mail.recipients.filter((r) => r.type === "TO");
  const cc = mail.recipients.filter((r) => r.type === "CC");
  const statusLabel =
    mail.status === "DRAFT" ? "Draft" : WORKFLOW_STATUS_LABELS[effectiveWorkflowStatus(mail)];
  const canReply = mail.status === "SENT" && membership.role !== "VIEWER";

  const thread =
    mail.status === "SENT"
      ? (await getMailThread(mail)).map((m) => ({
          id: m.id,
          subject: m.subject,
          mailNumber: m.mailNumber,
          senderName: m.sender.name,
          senderOrg: m.sender.organization.name,
          date: (m.sentAt ?? m.createdAt).toLocaleDateString("en-GB"),
        }))
      : [];

  return (
    <div>
      <PageHeader
        title="View Mail"
        actions={
          <>
            {membership.role !== "VIEWER" && (
              <MailActionsMenu
                mailId={mail.id}
                canReply={canReply}
                singleAttachmentUrl={
                  mail.attachments.length === 1
                    ? `/api/mail/attachments/${mail.attachments[0].id}`
                    : null
                }
                currentStatus={statusLabel}
              />
            )}
            <Link href="/mail" className={buttonClass("secondary", "md")}>
              <ChevronLeft size={14} />
              Back
            </Link>
            {mail.status === "SENT" && <PrintMenu mailId={mail.id} />}
            {canReply && (
              <>
                <Link href={`/mail/new?forwardOf=${mail.id}`} className={buttonClass("secondary", "md")}>
                  Forward
                </Link>
                <Link href={`/mail/new?replyTo=${mail.id}`} className={buttonClass("secondary", "md")}>
                  Reply
                </Link>
                <Link href={`/mail/new?replyAll=${mail.id}`} className={buttonClass("primary", "md")}>
                  Reply to All
                </Link>
              </>
            )}
          </>
        }
      />
      <div className="flex">
        <MailThreadPanel items={thread} currentId={mail.id} />
        <div className="mx-auto w-full max-w-3xl p-6">
          <div className="rounded-[3px] border border-border bg-white">
            <div
              className={`grid gap-4 border-b border-border px-4 py-3 text-xs ${
                mail.direction === "INCOMING" ? "grid-cols-4" : "grid-cols-3"
              }`}
            >
              <div>
                <div className="font-semibold uppercase tracking-wide text-text-muted">Mail Type</div>
                <div className="mt-1 text-[13px] text-text-primary">{mail.type.name}</div>
              </div>
              <div>
                <div className="font-semibold uppercase tracking-wide text-text-muted">Mail Number</div>
                <div className="mt-1 text-[13px] text-text-primary">{mail.mailNumber}</div>
              </div>
              <div>
                <div className="font-semibold uppercase tracking-wide text-text-muted">Status</div>
                <div className="mt-1 text-[13px] text-text-primary">{statusLabel}</div>
              </div>
              {mail.direction === "INCOMING" && (
                <div>
                  <div className="font-semibold uppercase tracking-wide text-text-muted">Direction</div>
                  <div className="mt-1 text-[13px] text-text-primary">Incoming</div>
                </div>
              )}
            </div>

            <div className="border-b border-border px-4 py-3">
              <h2 className="text-base font-semibold text-text-primary">{mail.subject}</h2>
            </div>

            <div className="flex flex-col gap-2 border-b border-border px-4 py-3 text-[13px]">
              <Row label="From" value={`${mail.sender.name} - ${mail.sender.organization.name}`} />
              <div className="flex gap-2">
                <span className="w-20 shrink-0 text-text-muted">To ({to.length})</span>
                <span className="text-text-primary">
                  <RecipientDisclosure
                    names={to.map((r) => `${r.user.name} - ${r.user.organization.name}`)}
                  />
                </span>
              </div>
              {cc.length > 0 && (
                <div className="flex gap-2">
                  <span className="w-20 shrink-0 text-text-muted">Cc ({cc.length})</span>
                  <span className="text-text-primary">
                    <RecipientDisclosure
                      names={cc.map((r) => `${r.user.name} - ${r.user.organization.name}`)}
                    />
                  </span>
                </div>
              )}
              <Row label="Sent" value={mail.sentAt ? mail.sentAt.toLocaleString("en-GB") : "Not sent"} />
            </div>

            {(mail.attribute1 || mail.attribute2) && (
              <>
                <SectionHeader>Attributes</SectionHeader>
                <div className="flex flex-col gap-2 px-4 py-3 text-[13px]">
                  {mail.attribute1 && <Row label="Attribute 1" value={mail.attribute1} />}
                  {mail.attribute2 && <Row label="Attribute 2" value={mail.attribute2} />}
                </div>
              </>
            )}

            {mail.responseRequired && (
              <>
                <SectionHeader>Response Required</SectionHeader>
                <div className="flex flex-col gap-2 px-4 py-3 text-[13px]">
                  <Row label="Type" value={mail.responseType ? RESPONSE_TYPE_LABELS[mail.responseType] : "—"} />
                  <Row
                    label="Due Date"
                    value={mail.responseDueDate ? mail.responseDueDate.toLocaleDateString("en-GB") : "—"}
                  />
                  <Row label="Status" value={WORKFLOW_STATUS_LABELS[effectiveWorkflowStatus(mail)]} />
                </div>
              </>
            )}

            {mail.documentReferences.length > 0 && (
              <>
                <SectionHeader>Related Documents ({mail.documentReferences.length})</SectionHeader>
                <div className="px-4 py-3">
                  <ul className="flex flex-col gap-1.5">
                    {mail.documentReferences.map((ref) => (
                      <li key={ref.id} className="text-[13px]">
                        <Link
                          href={`/documents/${ref.document.id}`}
                          className="text-brand-700 hover:underline"
                        >
                          {ref.document.documentNo} — {ref.document.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}

            {mail.relatedMails.length > 0 && (
              <>
                <SectionHeader>Related Mail ({mail.relatedMails.length})</SectionHeader>
                <div className="px-4 py-3">
                  <ul className="flex flex-col gap-1.5">
                    {mail.relatedMails.map((ref) => (
                      <li key={ref.id} className="text-[13px]">
                        <Link href={`/mail/${ref.relatedMail.id}`} className="text-brand-700 hover:underline">
                          {ref.relatedMail.mailNumber} — {ref.relatedMail.subject}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}

            <SectionHeader>Message</SectionHeader>
            <div className="px-4 py-3">
              <MailRichContent html={mail.messageHtml} />
            </div>

            <SectionHeader>File Attachments ({mail.attachments.length})</SectionHeader>
            <div className="px-4 py-3">
              {mail.attachments.length === 0 ? (
                <p className="text-[13px] text-text-muted">No attachments.</p>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {mail.attachments.map((a) => (
                    <li key={a.id} className="flex items-center gap-1.5">
                      <Paperclip size={13} className="text-text-muted" />
                      <a
                        href={`/api/mail/attachments/${a.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[13px] text-brand-700 hover:underline"
                      >
                        {a.fileName}
                      </a>
                      <span className="text-xs text-text-muted">
                        ({Math.ceil(a.sizeBytes / 1024)} KB)
                      </span>
                      <a
                        href={`/api/mail/attachments/${a.id}?download=1`}
                        className="ml-2 text-xs text-text-muted hover:text-brand-700 hover:underline"
                      >
                        Download
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="w-20 shrink-0 text-text-muted">{label}</span>
      <span className="text-text-primary">{value}</span>
    </div>
  );
}
