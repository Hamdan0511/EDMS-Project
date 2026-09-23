import "server-only";

import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { sanitizeMailHtml, htmlToPlainText } from "@/lib/mail/sanitize-html";
import { nextMailNumber } from "@/lib/services/mail-service";
import type { TransmittalFormInput } from "@/lib/validation/transmittal";
import type { Prisma } from "@prisma/client";

export class TransmittalError extends Error {}

const MAIL_TYPE_NAME: Record<"transmittal" | "tender", string> = {
  transmittal: "Transmittal",
  tender: "Tender Transmittal",
};

/**
 * A Transmittal is a real Mail row (direction: OUTGOING) of a MailType named
 * "Transmittal"/"Tender Transmittal" — the seed data already provisions a
 * "Transmittal" MailType, confirming this is the intended architecture. This
 * reuses mail numbering, recipients, per-type attributes, and the existing
 * Mail Register/Sent views for free, instead of a parallel model.
 *
 * The one thing plain Mail doesn't give us for free — historical accuracy —
 * is handled explicitly here: each MailDocumentReference snapshots the
 * document's current DocumentVersion/revision label *at send time*, so a
 * later revision of the document never silently changes what a past
 * transmittal appears to have issued.
 */
export async function saveTransmittal(params: {
  projectId: string;
  projectCode: string | null;
  senderId: string;
  input: TransmittalFormInput;
}) {
  const { projectId, projectCode, senderId, input } = params;

  const candidateUserIds = [...new Set([...input.toUserIds, ...input.ccUserIds])];
  if (candidateUserIds.length > 0) {
    const memberCount = await prisma.projectMember.count({
      where: { projectId, userId: { in: candidateUserIds } },
    });
    if (memberCount !== candidateUserIds.length) {
      throw new TransmittalError("One or more recipients are not part of this project's directory.");
    }
  }

  const documents =
    input.documentIds.length > 0
      ? await prisma.document.findMany({
          where: { id: { in: input.documentIds }, projectId },
          include: { versions: { orderBy: { versionNo: "desc" }, take: 1 } },
        })
      : [];
  if (documents.length !== input.documentIds.length) {
    throw new TransmittalError("One or more attached documents could not be found in this project.");
  }

  const status = input.action === "send" ? "SENT" : "DRAFT";
  const workflowStatus = input.responseType ? "OUTSTANDING" : "NA";

  let mail;
  try {
    mail = await prisma.$transaction(async (tx) => {
      const mailType = await tx.mailType.upsert({
        where: { projectId_name: { projectId, name: MAIL_TYPE_NAME[input.kind] } },
        update: {},
        create: { projectId, name: MAIL_TYPE_NAME[input.kind] },
      });

      let existing = null;
      if (input.mailId) {
        // Like Register Incoming Mail, a transmittal draft is a
        // correspondence-register entry in progress, not a personal draft —
        // any authorized project member can resume one.
        existing = await tx.mail.findFirst({
          where: { id: input.mailId, projectId, senderId, status: "DRAFT" },
        });
        if (!existing) {
          throw new TransmittalError("Draft not found or no longer editable.");
        }
      }

      const messageHtml = sanitizeMailHtml(input.description);
      const messageText = htmlToPlainText(messageHtml);

      const data: Prisma.MailUncheckedUpdateInput = {
        typeId: mailType.id,
        subject: input.subject,
        messageHtml,
        messageText,
        attribute1: input.attribute1 || null,
        attribute2: input.attribute2 || null,
        reasonForIssue: input.reasonForIssue ?? null,
        responseRequired: Boolean(input.responseType),
        responseType: input.responseType ?? null,
        responseDueDate: input.responseDueDate ? new Date(input.responseDueDate) : null,
        status,
        workflowStatus,
        direction: "OUTGOING",
        senderId,
        sentAt: status === "SENT" ? new Date() : null,
      };

      let mailId: string;
      if (existing) {
        await tx.mail.update({ where: { id: existing.id }, data });
        mailId = existing.id;
        await tx.mailRecipient.deleteMany({ where: { mailId } });
        if (input.removeDocumentIds.length > 0) {
          await tx.mailDocumentReference.deleteMany({
            where: { mailId, documentId: { in: input.removeDocumentIds } },
          });
        }
      } else {
        const mailNumber = await nextMailNumber(tx, projectId, projectCode);
        const created = await tx.mail.create({
          data: { ...data, projectId, mailNumber } as Prisma.MailUncheckedCreateInput,
        });
        mailId = created.id;
      }

      if (input.toUserIds.length || input.ccUserIds.length) {
        await tx.mailRecipient.createMany({
          data: [
            ...input.toUserIds.map((userId) => ({ mailId, userId, type: "TO" as const })),
            ...input.ccUserIds.map((userId) => ({ mailId, userId, type: "CC" as const })),
          ],
          skipDuplicates: true,
        });
      }

      for (const doc of documents) {
        const currentVersion = doc.versions[0];
        await tx.mailDocumentReference.upsert({
          where: { mailId_documentId: { mailId, documentId: doc.id } },
          update: {
            documentVersionId: currentVersion?.id ?? null,
            revisionAtIssue: doc.currentRevision,
          },
          create: {
            mailId,
            documentId: doc.id,
            documentVersionId: currentVersion?.id ?? null,
            revisionAtIssue: doc.currentRevision,
            createdById: senderId,
          },
        });
      }

      return tx.mail.findUniqueOrThrow({
        where: { id: mailId },
        include: { recipients: true, documentReferences: { include: { document: true } } },
      });
    });
  } catch (err) {
    if (err instanceof TransmittalError) throw err;
    console.error("Save transmittal failed:", err);
    throw new TransmittalError("Failed to save the transmittal. Please try again.");
  }

  await logAudit({
    userId: senderId,
    projectId,
    action: input.action === "send" ? "TRANSMITTAL_SENT" : "TRANSMITTAL_DRAFT_SAVED",
    entityType: "Mail",
    entityId: mail.id,
    metadata: { mailNumber: mail.mailNumber, documentIds: documents.map((d) => d.id) },
  });

  if (input.action === "send") {
    await Promise.all(
      documents.map((doc) =>
        logAudit({
          userId: senderId,
          projectId,
          action: "DOCUMENT_TRANSMITTED",
          entityType: "Document",
          entityId: doc.id,
          metadata: { mailNumber: mail.mailNumber, revisionAtIssue: doc.currentRevision },
        }),
      ),
    );
  }

  return mail;
}
