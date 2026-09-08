import { requirePageContext } from "@/lib/page-context";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/app-shell/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { MailComposer, type PrefillData } from "@/components/mail/mail-composer";
import { redirect, notFound } from "next/navigation";
import type { DirectoryPerson } from "@/components/mail/recipient-picker";

function ensurePrefix(subject: string, prefix: string): string {
  return subject.toLowerCase().startsWith(prefix.toLowerCase()) ? subject : `${prefix} ${subject}`;
}

/** Quotes the original message below a blank editable line, matching the
 * "original formatted content should be preserved" requirement for
 * Reply/Reply All/Forward. The embedded messageHtml is already sanitized
 * (it came straight from the database, sanitized at the time it was sent),
 * and everything the user types or edits from here goes through
 * sanitizeMailHtml again before this new mail is ever persisted. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildQuotedHtml(
  source: { subject: string; messageHtml: string; sentAt: Date | null; createdAt: Date; sender: { name: string; organization: { name: string } } },
  label: "Original Message" | "Forwarded Message",
): string {
  const date = (source.sentAt ?? source.createdAt).toLocaleString("en-GB");
  return (
    `<p></p><blockquote><p><strong>${label}</strong><br>` +
    `<strong>From:</strong> ${escapeHtml(source.sender.name)} (${escapeHtml(source.sender.organization.name)})<br>` +
    `<strong>Date:</strong> ${escapeHtml(date)}<br>` +
    `<strong>Subject:</strong> ${escapeHtml(source.subject)}</p>${source.messageHtml}</blockquote>`
  );
}

export default async function NewMailPage({
  searchParams,
}: {
  searchParams: Promise<{
    draftId?: string;
    type?: string;
    replyTo?: string;
    replyAll?: string;
    forwardOf?: string;
  }>;
}) {
  const { user, membership } = await requirePageContext();
  const { draftId, type, replyTo, replyAll, forwardOf } = await searchParams;

  if (!membership) {
    return (
      <div className="p-6">
        <EmptyState title="You are not assigned to a project" />
      </div>
    );
  }

  if (membership.role === "VIEWER") {
    return (
      <div className="p-6">
        <EmptyState
          title="You do not have permission to create mail"
          description="Your role on this project is Viewer, which allows reading mail and documents but not creating or sending them."
        />
      </div>
    );
  }

  const mailTypes = await prisma.mailType.findMany({
    where: { projectId: membership.projectId },
    orderBy: { name: "asc" },
  });

  const preselectedTypeId = !draftId && type
    ? mailTypes.find((t) => t.name.toLowerCase() === type.toLowerCase())?.id
    : undefined;

  let draft = null;
  if (draftId) {
    const found = await prisma.mail.findFirst({
      where: {
        id: draftId,
        projectId: membership.projectId,
        senderId: user.id,
        status: "DRAFT",
      },
      include: {
        recipients: { include: { user: { include: { organization: true } } } },
        attachments: true,
      },
    });
    if (!found) {
      redirect("/mail/new");
    }
    draft = found;
  }

  const sourceMailId = replyTo || replyAll || forwardOf;
  let prefill: PrefillData | null = null;
  if (sourceMailId && !draft) {
    const source = await prisma.mail.findFirst({
      where: { id: sourceMailId, projectId: membership.projectId, status: "SENT" },
      include: {
        sender: { include: { organization: true } },
        recipients: { include: { user: { include: { organization: true } } } },
        attachments: true,
      },
    });
    if (!source) notFound();

    const toPerson = (u: typeof source.sender): DirectoryPerson => ({
      userId: u.id,
      name: u.name,
      email: u.email,
      organization: u.organization.name,
    });

    if (replyTo) {
      prefill = {
        to: source.senderId === user.id ? [] : [toPerson(source.sender)],
        cc: [],
        subject: ensurePrefix(source.subject, "Re:"),
        typeId: source.typeId,
        parentMailId: source.id,
        parentMailNumber: source.mailNumber,
        forwardAttachments: [],
        contextLabel: `Replying to ${source.mailNumber} — ${source.subject}`,
        initialMessageHtml: buildQuotedHtml(source, "Original Message"),
      };
    } else if (replyAll) {
      const toRecipients = source.recipients
        .filter((r) => r.type === "TO" && r.userId !== user.id)
        .map((r) => toPerson(r.user));
      const ccRecipients = source.recipients
        .filter((r) => r.type === "CC" && r.userId !== user.id)
        .map((r) => toPerson(r.user));
      const senderIncluded = source.senderId !== user.id ? [toPerson(source.sender)] : [];
      prefill = {
        to: [...senderIncluded, ...toRecipients],
        cc: ccRecipients,
        subject: ensurePrefix(source.subject, "Re:"),
        typeId: source.typeId,
        parentMailId: source.id,
        parentMailNumber: source.mailNumber,
        forwardAttachments: [],
        contextLabel: `Replying to all on ${source.mailNumber} — ${source.subject}`,
        initialMessageHtml: buildQuotedHtml(source, "Original Message"),
      };
    } else if (forwardOf) {
      prefill = {
        to: [],
        cc: [],
        subject: ensurePrefix(source.subject, "Fwd:"),
        typeId: source.typeId,
        parentMailId: source.id,
        parentMailNumber: source.mailNumber,
        forwardAttachments: source.attachments.map((a) => ({
          id: a.id,
          fileName: a.fileName,
          sizeBytes: a.sizeBytes,
        })),
        contextLabel: `Forwarding ${source.mailNumber} — ${source.subject}`,
        initialMessageHtml: buildQuotedHtml(source, "Forwarded Message"),
      };
    }
  }

  return (
    <div>
      <PageHeader title={draft ? "Edit Draft" : prefill ? "New Mail" : "New Mail"} />
      <div className="p-6">
        <MailComposer
          projectId={membership.projectId}
          initialTypeId={preselectedTypeId}
          prefill={prefill}
          mailTypes={mailTypes.map((t) => ({
            id: t.id,
            name: t.name,
            attribute1Label: t.attribute1Label,
            attribute2Label: t.attribute2Label,
            requiresAttribute1: t.requiresAttribute1,
            requiresAttribute2: t.requiresAttribute2,
          }))}
          draft={
            draft
              ? {
                  id: draft.id,
                  typeId: draft.typeId,
                  subject: draft.subject,
                  messageHtml: draft.messageHtml,
                  attribute1: draft.attribute1,
                  attribute2: draft.attribute2,
                  responseRequired: draft.responseRequired,
                  responseDueDate: draft.responseDueDate?.toISOString().slice(0, 10) ?? "",
                  parentMailId: draft.parentMailId,
                  to: draft.recipients
                    .filter((r) => r.type === "TO")
                    .map((r) => ({
                      userId: r.userId,
                      name: r.user.name,
                      email: r.user.email,
                      organization: r.user.organization.name,
                    })),
                  cc: draft.recipients
                    .filter((r) => r.type === "CC")
                    .map((r) => ({
                      userId: r.userId,
                      name: r.user.name,
                      email: r.user.email,
                      organization: r.user.organization.name,
                    })),
                  attachments: draft.attachments.map((a) => ({
                    id: a.id,
                    fileName: a.fileName,
                    sizeBytes: a.sizeBytes,
                  })),
                }
              : null
          }
        />
      </div>
    </div>
  );
}
