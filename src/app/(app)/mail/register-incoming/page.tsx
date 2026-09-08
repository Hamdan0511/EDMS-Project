import { redirect } from "next/navigation";
import { requirePageContext } from "@/lib/page-context";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/app-shell/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { IncomingMailForm, type IncomingDraftData } from "@/components/mail/incoming/incoming-mail-form";
import type { DirectoryPerson } from "@/components/mail/recipient-picker";

export default async function RegisterIncomingMailPage({
  searchParams,
}: {
  searchParams: Promise<{ draftId?: string }>;
}) {
  const { membership } = await requirePageContext();
  const { draftId } = await searchParams;

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
          title="You do not have permission to register incoming mail"
          description="Your role on this project is Viewer, which allows reading mail and documents but not registering new correspondence."
        />
      </div>
    );
  }

  const mailTypes = await prisma.mailType.findMany({
    where: { projectId: membership.projectId },
    orderBy: { name: "asc" },
  });

  let draft: IncomingDraftData | null = null;
  if (draftId) {
    const found = await prisma.mail.findFirst({
      where: { id: draftId, projectId: membership.projectId, direction: "INCOMING", status: "DRAFT" },
      include: {
        sender: { include: { organization: true } },
        recipients: { include: { user: { include: { organization: true } } } },
        attachments: true,
        documentReferences: { include: { document: true } },
        relatedMails: { include: { relatedMail: true } },
      },
    });
    if (!found) {
      redirect("/mail/register-incoming");
    }

    const toPerson = (u: typeof found.sender): DirectoryPerson => ({
      userId: u.id,
      name: u.name,
      email: u.email,
      organization: u.organization.name,
    });

    draft = {
      id: found.id,
      typeId: found.typeId,
      subject: found.subject,
      messageHtml: found.messageHtml,
      attribute1: found.attribute1,
      attribute2: found.attribute2,
      responseType: found.responseType,
      responseDueDate: found.responseDueDate?.toISOString().slice(0, 10) ?? "",
      sender: toPerson(found.sender),
      to: found.recipients
        .filter((r) => r.type === "TO")
        .map((r) => toPerson(r.user)),
      cc: found.recipients
        .filter((r) => r.type === "CC")
        .map((r) => toPerson(r.user)),
      attachments: found.attachments.map((a) => ({
        id: a.id,
        fileName: a.fileName,
        sizeBytes: a.sizeBytes,
      })),
      documentReferences: found.documentReferences.map((ref) => ({
        id: ref.document.id,
        documentNo: ref.document.documentNo,
        title: ref.document.title,
        revision: ref.document.currentRevision,
        typeName: null,
      })),
      relatedMails: found.relatedMails.map((ref) => ({
        id: ref.relatedMail.id,
        mailNumber: ref.relatedMail.mailNumber,
        subject: ref.relatedMail.subject,
        senderName: "",
        typeName: "",
        date: ref.relatedMail.createdAt.toISOString(),
      })),
    };
  }

  return (
    <div>
      <PageHeader title="Register Incoming Mail" />
      <div className="p-6">
        <IncomingMailForm
          projectId={membership.projectId}
          canManageAttributeOptions={membership.role === "ADMIN" || membership.role === "MEMBER"}
          mailTypes={mailTypes.map((t) => ({
            id: t.id,
            name: t.name,
            attribute1Label: t.attribute1Label,
            attribute2Label: t.attribute2Label,
            requiresAttribute1: t.requiresAttribute1,
            requiresAttribute2: t.requiresAttribute2,
          }))}
          draft={draft}
        />
      </div>
    </div>
  );
}
