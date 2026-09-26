import "server-only";

import { prisma } from "@/lib/prisma";

export async function getMailDetail(id: string, projectId: string) {
  return prisma.mail.findFirst({
    where: { id, projectId },
    include: {
      sender: { include: { organization: true } },
      type: true,
      recipients: { include: { user: { include: { organization: true } } } },
      attachments: true,
      documentReferences: { include: { document: true, documentVersion: true } },
      relatedMails: { include: { relatedMail: true } },
    },
  });
}

export type MailDetail = NonNullable<Awaited<ReturnType<typeof getMailDetail>>>;

export async function getMailThread(mail: MailDetail) {
  const rootId = mail.threadRootId ?? mail.id;
  const thread = await prisma.mail.findMany({
    where: {
      projectId: mail.projectId,
      status: "SENT",
      OR: [{ id: rootId }, { threadRootId: rootId }],
    },
    include: { sender: { include: { organization: true } } },
    orderBy: { sentAt: "asc" },
  });
  return thread;
}
