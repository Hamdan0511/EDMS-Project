import "server-only";

import { prisma } from "@/lib/prisma";
import { saveUploadedFile, deleteStoredFile } from "@/lib/storage";
import { logAudit } from "@/lib/audit";
import { sanitizeMailHtml, htmlToPlainText } from "@/lib/mail/sanitize-html";
import { nextMailNumber } from "@/lib/services/mail-service";
import { isAllowedExtension, extensionOf, canonicalMimeType, MAX_TEMP_FILE_SIZE_BYTES } from "@/lib/files/file-types";
import type { IncomingMailFormInput } from "@/lib/validation/incoming-mail";
import type { Prisma } from "@prisma/client";

export class IncomingMailError extends Error {}

/**
 * Registers (or drafts) a piece of correspondence that was actually received
 * from an external/project party, as distinct from New Mail's "we are
 * sending this out" flow. Deliberately a separate service rather than a
 * branch inside saveMail: the sender is not the current user, there is no
 * "send" step (the correspondence already happened — registering it is the
 * terminal action), and it carries extra fields (response type, attribute
 * references, related Document/Mail links) that would otherwise have to be
 * threaded through the protected New Mail save path.
 */
export async function saveIncomingMail(params: {
  projectId: string;
  projectCode: string | null;
  registeredById: string;
  input: IncomingMailFormInput;
  files: File[];
}) {
  const { projectId, projectCode, registeredById, input, files } = params;

  const mailType = await prisma.mailType.findFirst({ where: { id: input.typeId, projectId } });
  if (!mailType) {
    throw new IncomingMailError("The selected mail type could not be found in this project.");
  }
  if (mailType.requiresAttribute1 && !input.attribute1?.trim()) {
    throw new IncomingMailError(`${mailType.attribute1Label ?? "Attribute 1"} is required.`);
  }
  if (mailType.requiresAttribute2 && !input.attribute2?.trim()) {
    throw new IncomingMailError(`${mailType.attribute2Label ?? "Attribute 2"} is required.`);
  }

  // Sender/recipients must be real members of this project's directory —
  // typing/crafting an arbitrary user id must never silently attach someone
  // outside the project to a controlled correspondence record.
  const candidateUserIds = [input.senderUserId, ...input.toUserIds, ...input.ccUserIds];
  const uniqueUserIds = [...new Set(candidateUserIds)];
  const members = await prisma.projectMember.findMany({
    where: { projectId, userId: { in: uniqueUserIds } },
    select: { userId: true },
  });
  const memberIds = new Set(members.map((m) => m.userId));
  if (!memberIds.has(input.senderUserId)) {
    throw new IncomingMailError("Sent From must be a real contact in this project's directory.");
  }
  for (const id of [...input.toUserIds, ...input.ccUserIds]) {
    if (!memberIds.has(id)) {
      throw new IncomingMailError("One or more recipients are not part of this project's directory.");
    }
  }

  if (input.documentReferenceIds.length > 0) {
    const count = await prisma.document.count({
      where: { id: { in: input.documentReferenceIds }, projectId },
    });
    if (count !== input.documentReferenceIds.length) {
      throw new IncomingMailError("One or more attached documents could not be found in this project.");
    }
  }

  if (input.relatedMailIds.length > 0) {
    const count = await prisma.mail.count({
      where: { id: { in: input.relatedMailIds }, projectId, status: "SENT" },
    });
    if (count !== input.relatedMailIds.length) {
      throw new IncomingMailError("One or more attached project mail references could not be found.");
    }
  }

  for (const file of files) {
    if (file.size > MAX_TEMP_FILE_SIZE_BYTES) {
      throw new IncomingMailError(`"${file.name}" is too large. Maximum attachment size is 200MB.`);
    }
    if (!isAllowedExtension(file.name)) {
      throw new IncomingMailError(
        `"${file.name}" has an unsupported file type (.${extensionOf(file.name) || "unknown"}).`,
      );
    }
  }

  const uploaded = await Promise.all(
    files.map(async (file) => {
      const { storedPath, sizeBytes } = await saveUploadedFile("mail", file);
      return {
        fileName: file.name,
        storedPath,
        mimeType: canonicalMimeType(file.name),
        sizeBytes,
      };
    }),
  );

  const status = input.action === "register" ? "SENT" : "DRAFT";
  const workflowStatus = input.responseType ? "OUTSTANDING" : "NA";

  let mail;
  try {
    mail = await prisma.$transaction(async (tx) => {
      let existing = null;
      if (input.mailId) {
        // Incoming mail drafts represent a correspondence-register entry in
        // progress, not a personal draft — any authorized project member can
        // pick one up and finish registering it, so ownership is scoped to
        // the project + direction + draft status rather than a single user.
        existing = await tx.mail.findFirst({
          where: { id: input.mailId, projectId, direction: "INCOMING", status: "DRAFT" },
        });
        if (!existing) {
          throw new IncomingMailError("Draft not found or no longer editable.");
        }
      }

      if (input.removeAttachmentIds.length > 0 && existing) {
        const toRemove = await tx.mailAttachment.findMany({
          where: { id: { in: input.removeAttachmentIds }, mailId: existing.id },
        });
        await tx.mailAttachment.deleteMany({ where: { id: { in: toRemove.map((a) => a.id) } } });
        await Promise.all(toRemove.map((a) => deleteStoredFile(a.storedPath)));
      }

      const messageHtml = sanitizeMailHtml(input.messageHtml);
      const messageText = htmlToPlainText(messageHtml);

      const data: Prisma.MailUncheckedUpdateInput = {
        typeId: input.typeId,
        subject: input.subject,
        messageHtml,
        messageText,
        attribute1: input.attribute1 || null,
        attribute2: input.attribute2 || null,
        responseRequired: Boolean(input.responseType),
        responseType: input.responseType ?? null,
        responseDueDate: input.responseDueDate ? new Date(input.responseDueDate) : null,
        status,
        workflowStatus,
        direction: "INCOMING",
        senderId: input.senderUserId,
        sentAt: status === "SENT" ? new Date() : null,
      };

      let mailId: string;
      if (existing) {
        await tx.mail.update({ where: { id: existing.id }, data });
        mailId = existing.id;
        await tx.mailRecipient.deleteMany({ where: { mailId } });
        await tx.mailDocumentReference.deleteMany({ where: { mailId } });
        await tx.mailRelatedMail.deleteMany({ where: { mailId } });
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

      if (uploaded.length > 0) {
        await tx.mailAttachment.createMany({ data: uploaded.map((a) => ({ ...a, mailId })) });
      }

      if (input.documentReferenceIds.length > 0) {
        await tx.mailDocumentReference.createMany({
          data: input.documentReferenceIds.map((documentId) => ({
            mailId,
            documentId,
            createdById: registeredById,
          })),
          skipDuplicates: true,
        });
      }

      if (input.relatedMailIds.length > 0) {
        await tx.mailRelatedMail.createMany({
          data: input.relatedMailIds.map((relatedMailId) => ({
            mailId,
            relatedMailId,
            createdById: registeredById,
          })),
          skipDuplicates: true,
        });
      }

      return tx.mail.findUniqueOrThrow({
        where: { id: mailId },
        include: { recipients: true, attachments: true },
      });
    });
  } catch (err) {
    // Only the transaction's own failure orphans the just-saved files —
    // once it has committed (mail is set), a downstream audit-log problem
    // must never trigger deleting files the database now references.
    await Promise.all(uploaded.map((u) => deleteStoredFile(u.storedPath)));
    if (err instanceof IncomingMailError) throw err;
    console.error("Register Incoming Mail failed:", err);
    throw new IncomingMailError("Failed to register the incoming mail. Please try again.");
  }

  await logAudit({
    userId: registeredById,
    projectId,
    action: input.action === "register" ? "MAIL_INCOMING_REGISTERED" : "MAIL_INCOMING_DRAFT_SAVED",
    entityType: "Mail",
    entityId: mail.id,
    metadata: { mailNumber: mail.mailNumber },
  });

  return mail;
}
