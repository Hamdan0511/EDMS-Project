import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePageContext } from "@/lib/page-context";
import { prisma } from "@/lib/prisma";
import { getMailDetail, getMailThread } from "@/lib/mail/detail";
import { resolveMailResultContext } from "@/lib/mail/result-context";
import { PageHeader } from "@/components/app-shell/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonClass } from "@/components/ui/button";
import { PrintMenu } from "@/components/mail/print-menu";
import { MailActionsMenu } from "@/components/mail/mail-actions-menu";
import { MailThreadPanel } from "@/components/mail/mail-thread-panel";
import { MailResultNav } from "@/components/mail/mail-result-nav";
import { MailCollapsibleSection } from "@/components/mail/mail-collapsible-section";
import { RecipientDisclosure } from "@/components/mail/recipient-disclosure";
import { MailRichContent } from "@/components/mail/mail-rich-content";
import { ChevronLeft, Paperclip, FileText } from "@/components/ui/icons";
import { WORKFLOW_STATUS_LABELS } from "@/lib/mail/workflow-status";
import { RESPONSE_TYPE_LABELS } from "@/lib/mail/response-type";
import { effectiveWorkflowStatus } from "@/lib/mail/overdue";
import { DOCUMENT_REVIEW_STATUS_LABELS } from "@/lib/documents/status";
import { fileTypeCategory, formatBytes } from "@/lib/files/file-types";

export default async function ViewMailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ return?: string }>;
}) {
  const { user, membership } = await requirePageContext();
  const { id } = await params;
  const { return: returnQuery } = await searchParams;

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

  const [thread, resultContext] = await Promise.all([
    mail.status === "SENT"
      ? getMailThread(mail).then((rows) =>
          rows.map((m) => ({
            id: m.id,
            subject: m.subject,
            mailNumber: m.mailNumber,
            senderName: m.sender.name,
            senderOrg: m.sender.organization.name,
            date: (m.sentAt ?? m.createdAt).toLocaleDateString("en-GB"),
          })),
        )
      : Promise.resolve([]),
    resolveMailResultContext(returnQuery ?? null, mail.id, {
      projectId: membership.projectId,
      userId: user.id,
      organizationId: membership.organizationId,
    }),
  ]);

  const backHref = resultContext ? `/mail?${resultContext.returnQuery}` : "/mail";

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
            <Link href={backHref} className={buttonClass("secondary", "md")}>
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
        {resultContext ? (
          <MailResultNav
            context={resultContext}
            mail={{
              mailNumber: mail.mailNumber,
              subject: mail.subject,
              typeLabel: mail.type.name,
              senderName: mail.sender.name,
              senderOrg: mail.sender.organization.name,
              date: (mail.sentAt ?? mail.createdAt).toLocaleDateString("en-GB"),
              attachmentCount: mail.attachments.length,
            }}
          />
        ) : (
          <MailThreadPanel items={thread} currentId={mail.id} />
        )}
        <div className="w-full max-w-5xl p-6">
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

            {(mail.attribute1 || mail.attribute2 || mail.responseRequired || mail.reasonForIssue || mail.referenceNumber) && (
              <MailCollapsibleSection title="Details">
                <div className="flex flex-col gap-2 text-[13px]">
                  {mail.referenceNumber && <Row label="Reference No." value={mail.referenceNumber} />}
                  {mail.reasonForIssue && <Row label="Reason for Issue" value={mail.reasonForIssue.replaceAll("_", " ")} />}
                  {mail.attribute1 && <Row label="Attribute 1" value={mail.attribute1} />}
                  {mail.attribute2 && <Row label="Attribute 2" value={mail.attribute2} />}
                  {mail.responseRequired && (
                    <>
                      <Row label="Response Type" value={mail.responseType ? RESPONSE_TYPE_LABELS[mail.responseType] : "—"} />
                      <Row
                        label="Response Due"
                        value={mail.responseDueDate ? mail.responseDueDate.toLocaleDateString("en-GB") : "—"}
                      />
                      <Row label="Workflow Status" value={WORKFLOW_STATUS_LABELS[effectiveWorkflowStatus(mail)]} />
                    </>
                  )}
                </div>
              </MailCollapsibleSection>
            )}

            <MailCollapsibleSection title={`Document Attachments (${mail.documentReferences.length})`}>
              {mail.documentReferences.length === 0 ? (
                <p className="text-[13px] text-text-muted">No document attachments.</p>
              ) : (
                <ul className="flex flex-col divide-y divide-border">
                  {mail.documentReferences.map((ref) => (
                    <li key={ref.id} className="flex items-start gap-3 py-2.5 text-[13px] first:pt-0 last:pb-0">
                      <FileText size={16} className="mt-0.5 shrink-0 text-danger" />
                      <Link href={`/documents/${ref.document.id}`} className="flex-1 hover:underline">
                        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                          <span className="font-medium text-brand-700">{ref.document.documentNo}</span>
                          <span className="text-text-muted">Rev {ref.revisionAtIssue ?? ref.document.currentRevision}</span>
                          {ref.documentVersion && (
                            <span className="text-text-muted">{ref.documentVersion.uploadedAt.toLocaleDateString("en-GB")}</span>
                          )}
                        </div>
                        <div className="text-text-primary">{ref.document.title}</div>
                        {ref.document.reviewStatus && (
                          <div className="mt-0.5 text-text-muted">
                            {DOCUMENT_REVIEW_STATUS_LABELS[ref.document.reviewStatus]}
                          </div>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </MailCollapsibleSection>

            {mail.relatedMails.length > 0 && (
              <MailCollapsibleSection title={`Related Mail (${mail.relatedMails.length})`}>
                <ul className="flex flex-col gap-1.5">
                  {mail.relatedMails.map((ref) => (
                    <li key={ref.id} className="text-[13px]">
                      <Link href={`/mail/${ref.relatedMail.id}`} className="text-brand-700 hover:underline">
                        {ref.relatedMail.mailNumber} — {ref.relatedMail.subject}
                      </Link>
                    </li>
                  ))}
                </ul>
              </MailCollapsibleSection>
            )}

            <MailCollapsibleSection title="Message">
              <MailRichContent html={mail.messageHtml} />
            </MailCollapsibleSection>

            <MailCollapsibleSection title={`File Attachments (${mail.attachments.length})`}>
              {mail.attachments.length === 0 ? (
                <p className="text-[13px] text-text-muted">No attachments.</p>
              ) : (
                <ul className="flex flex-col divide-y divide-border">
                  {mail.attachments.map((a) => (
                    <li key={a.id} className="flex items-center gap-2 py-2 first:pt-0 last:pb-0">
                      <Paperclip size={13} className="shrink-0 text-text-muted" />
                      <a
                        href={`/api/mail/attachments/${a.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[13px] text-brand-700 hover:underline"
                      >
                        {a.fileName}
                      </a>
                      <span className="text-xs uppercase text-text-muted">{fileTypeCategory(a.mimeType)}</span>
                      <span className="text-xs text-text-muted">{formatBytes(a.sizeBytes)}</span>
                      <span className="text-xs text-text-muted">{a.uploadedAt.toLocaleDateString("en-GB")}</span>
                      <a
                        href={`/api/mail/attachments/${a.id}?download=1`}
                        className="ml-auto text-xs text-text-muted hover:text-brand-700 hover:underline"
                      >
                        Download
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </MailCollapsibleSection>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="w-32 shrink-0 text-text-muted">{label}</span>
      <span className="text-text-primary">{value}</span>
    </div>
  );
}
