import { redirect } from "next/navigation";
import { requirePageContext } from "@/lib/page-context";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/app-shell/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { TransmittalForm, type TransmittalDraftData } from "@/components/documents/transmittal-form";
import type { DocumentReference } from "@/components/mail/incoming/attach-document-modal";
import type { DirectoryPerson } from "@/components/mail/recipient-picker";

const MAIL_TYPE_NAME: Record<"transmittal" | "tender", string> = {
  transmittal: "Transmittal",
  tender: "Tender Transmittal",
};

export default async function NewTransmittalPage({
  searchParams,
}: {
  searchParams: Promise<{ documentIds?: string; kind?: string; draftId?: string }>;
}) {
  const { user, membership } = await requirePageContext();
  const { documentIds: documentIdsParam, kind: kindParam, draftId } = await searchParams;
  const kind: "transmittal" | "tender" = kindParam === "tender" ? "tender" : "transmittal";

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
          title="You do not have permission to create transmittals"
          description="Your role on this project is Viewer, which allows reading mail and documents but not creating new correspondence."
        />
      </div>
    );
  }

  const projectId = membership.projectId;

  // Ensures a stable MailType id exists up front so the Select Attributes
  // modal has something real to point at — the same upsert-by-name this
  // type gets on actual save.
  const mailType = await prisma.mailType.upsert({
    where: { projectId_name: { projectId, name: MAIL_TYPE_NAME[kind] } },
    update: {},
    create: { projectId, name: MAIL_TYPE_NAME[kind] },
  });

  let draft: TransmittalDraftData | null = null;
  if (draftId) {
    const found = await prisma.mail.findFirst({
      where: { id: draftId, projectId, senderId: user.id, status: "DRAFT", typeId: mailType.id },
      include: {
        recipients: { include: { user: { include: { organization: true } } } },
        documentReferences: { include: { document: { include: { versions: { orderBy: { versionNo: "desc" }, take: 1 } } } } },
      },
    });
    if (!found) {
      redirect(`/documents/transmittals/new?kind=${kind}`);
    }
    const toPerson = (u: typeof found.recipients[number]["user"]): DirectoryPerson => ({
      userId: u.id,
      name: u.name,
      email: u.email,
      organization: u.organization.name,
    });
    draft = {
      id: found.id,
      subject: found.subject,
      messageHtml: found.messageHtml,
      attribute1: found.attribute1,
      attribute2: found.attribute2,
      reasonForIssue: found.reasonForIssue,
      responseType: found.responseType,
      responseDueDate: found.responseDueDate?.toISOString().slice(0, 10) ?? "",
      to: found.recipients.filter((r) => r.type === "TO").map((r) => toPerson(r.user)),
      cc: found.recipients.filter((r) => r.type === "CC").map((r) => toPerson(r.user)),
      documents: found.documentReferences.map((ref) => ({
        id: ref.document.id,
        documentNo: ref.document.documentNo,
        title: ref.document.title,
        revision: ref.revisionAtIssue ?? ref.document.currentRevision,
        typeName: null,
      })),
    };
  }

  let initialDocuments: DocumentReference[] = [];
  if (!draft && documentIdsParam) {
    const ids = documentIdsParam.split(",").filter(Boolean);
    const docs = await prisma.document.findMany({
      where: { id: { in: ids }, projectId },
      include: { type: true },
    });
    initialDocuments = docs.map((d) => ({
      id: d.id,
      documentNo: d.documentNo,
      title: d.title,
      revision: d.currentRevision,
      typeName: d.type?.name ?? null,
    }));
  }

  return (
    <div>
      <PageHeader title={kind === "tender" ? "Tender Transmittal" : "Transmittal"} />
      <div className="p-6">
        <TransmittalForm
          projectId={projectId}
          kind={kind}
          mailType={{
            id: mailType.id,
            attribute1Label: mailType.attribute1Label,
            attribute2Label: mailType.attribute2Label,
            requiresAttribute1: mailType.requiresAttribute1,
            requiresAttribute2: mailType.requiresAttribute2,
          }}
          fromLabel={user.name}
          draft={draft}
          initialDocuments={initialDocuments}
          canManageAttributeOptions={membership.role === "ADMIN" || membership.role === "MEMBER"}
        />
      </div>
    </div>
  );
}
