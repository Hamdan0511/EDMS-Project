import "server-only";

import { prisma } from "@/lib/prisma";
import { saveUploadedFile, deleteStoredFile } from "@/lib/storage";
import { logAudit } from "@/lib/audit";
import { sanitizeMailHtml, htmlToPlainText } from "@/lib/mail/sanitize-html";
import { isAllowedExtension, extensionOf, canonicalMimeType, MAX_TEMP_FILE_SIZE_BYTES } from "@/lib/files/file-types";
import type { MailFormInput } from "@/lib/validation/mail";
import type { Prisma } from "@prisma/client";

/** Errors safe to show verbatim to the client — everything else (Prisma
 * internals, filesystem errors, etc.) must be logged server-side and
 * replaced with a generic message, never echoed back raw. */
export class MailValidationError extends Error {}

type Db = typeof prisma | Prisma.TransactionClient;

/**
 * Numbers are derived from the highest existing numeric suffix, not a row
 * count — a count-based scheme collides with existing numbers as soon as any
 * mail has ever been deleted, since count() drops but previously issued
 * higher numbers remain on the surviving rows (the same bug class found and
 * fixed for Document numbering). Takes the active transaction client (not
 * the top-level `prisma` singleton) so the read-then-write is scoped inside
 * the same transaction as the row it numbers, narrowing the window for a
 * concurrent duplicate (the DB's `@@unique([projectId, mailNumber])` is the
 * final backstop either way).
 */
export async function nextMailNumber(db: Db, projectId: string, projectCode: string | null): Promise<string> {
  const prefix = (projectCode ?? "SF").toUpperCase();
  const numberPrefix = `${prefix}-MAIL-`;

  const existing = await db.mail.findMany({
    where: { projectId, mailNumber: { startsWith: numberPrefix } },
    select: { mailNumber: true },
  });

  let maxSuffix = 0;
  for (const m of existing) {
    const suffix = m.mailNumber.slice(numberPrefix.length);
    const parsed = Number.parseInt(suffix, 10);
    if (Number.isFinite(parsed) && parsed > maxSuffix) {
      maxSuffix = parsed;
    }
  }

  return `${numberPrefix}${String(maxSuffix + 1).padStart(5, "0")}`;
}

export async function saveMail(params: {
  projectId: string;
  projectCode: string | null;
  senderId: string;
  input: MailFormInput;
  files: File[];
}) {
  const { projectId, projectCode, senderId, input, files } = params;

  if (input.action === "send" && input.toUserIds.length === 0) {
    throw new MailValidationError("At least one recipient is required to send mail");
  }

  const mailType = await prisma.mailType.findFirst({ where: { id: input.typeId, projectId } });
  if (!mailType) {
    throw new MailValidationError("The selected mail type could not be found in this project.");
  }

  // Recipients must be real members of this project's directory — a
  // crafted request must never silently attach an unrelated account to a
  // project's correspondence record.
  const candidateUserIds = [...new Set([...input.toUserIds, ...input.ccUserIds])];
  if (candidateUserIds.length > 0) {
    const memberCount = await prisma.projectMember.count({
      where: { projectId, userId: { in: candidateUserIds } },
    });
    if (memberCount !== candidateUserIds.length) {
      throw new MailValidationError("One or more recipients are not part of this project's directory.");
    }
  }

  for (const file of files) {
    if (file.size > MAX_TEMP_FILE_SIZE_BYTES) {
      throw new MailValidationError(`"${file.name}" is too large. Maximum attachment size is 200MB.`);
    }
    if (!isAllowedExtension(file.name)) {
      throw new MailValidationError(
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

  try {
    let parentMailId: string | null = null;
    let threadRootId: string | null = null;
    let forwardedAttachments: Array<{
      fileName: string;
      storedPath: string;
      mimeType: string;
      sizeBytes: number;
    }> = [];

    if (input.parentMailId) {
      const parent = await prisma.mail.findFirst({
        where: { id: input.parentMailId, projectId },
        select: { id: true, threadRootId: true },
      });
      if (!parent) {
        throw new MailValidationError("The mail being replied to or forwarded could not be found");
      }
      parentMailId = parent.id;
      threadRootId = parent.threadRootId ?? parent.id;
    }

    if (input.forwardAttachmentIds.length > 0) {
      const sourceAttachments = await prisma.mailAttachment.findMany({
        where: { id: { in: input.forwardAttachmentIds }, mail: { projectId } },
      });
      forwardedAttachments = sourceAttachments.map((a) => ({
        fileName: a.fileName,
        storedPath: a.storedPath,
        mimeType: a.mimeType,
        sizeBytes: a.sizeBytes,
      }));
    }

    const status = input.action === "send" ? "SENT" : "DRAFT";

    const mail = await prisma.$transaction(async (tx) => {
      let existing = null;
      if (input.mailId) {
        existing = await tx.mail.findFirst({
          where: { id: input.mailId, projectId, senderId, status: "DRAFT" },
        });
        if (!existing) {
          throw new MailValidationError("Draft not found or not editable");
        }
      }

      if (input.removeAttachmentIds.length > 0 && existing) {
        const toRemove = await tx.mailAttachment.findMany({
          where: { id: { in: input.removeAttachmentIds }, mailId: existing.id },
        });
        await tx.mailAttachment.deleteMany({
          where: { id: { in: toRemove.map((a) => a.id) } },
        });
        await Promise.all(toRemove.map((a) => deleteStoredFile(a.storedPath)));
      }

      // The editor's HTML is never trusted as-is — every save re-sanitizes it
      // server-side, whether it came from the rich-text editor or a
      // hand-crafted API request.
      const messageHtml = sanitizeMailHtml(input.messageHtml);
      const messageText = htmlToPlainText(messageHtml);

      const data: Prisma.MailUncheckedUpdateInput = {
        typeId: input.typeId,
        subject: input.subject,
        messageHtml,
        messageText,
        attribute1: input.attribute1 || null,
        attribute2: input.attribute2 || null,
        responseRequired: input.responseRequired,
        responseDueDate: input.responseDueDate ? new Date(input.responseDueDate) : null,
        status,
        sentAt: status === "SENT" ? new Date() : null,
      };

      let mailId: string;
      if (existing) {
        await tx.mail.update({ where: { id: existing.id }, data });
        mailId = existing.id;
        await tx.mailRecipient.deleteMany({ where: { mailId } });
      } else {
        const mailNumber = await nextMailNumber(tx, projectId, projectCode);
        const created = await tx.mail.create({
          data: {
            ...data,
            projectId,
            senderId,
            mailNumber,
            parentMailId,
            threadRootId,
          } as Prisma.MailUncheckedCreateInput,
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

      const attachmentsToCreate = existing ? uploaded : [...uploaded, ...forwardedAttachments];
      if (attachmentsToCreate.length > 0) {
        await tx.mailAttachment.createMany({
          data: attachmentsToCreate.map((a) => ({ ...a, mailId })),
        });
      }

      return tx.mail.findUniqueOrThrow({
        where: { id: mailId },
        include: { recipients: true, attachments: true },
      });
    });

    await logAudit({
      userId: senderId,
      projectId,
      action: input.action === "send" ? "MAIL_SENT" : "MAIL_DRAFT_SAVED",
      entityType: "Mail",
      entityId: mail.id,
      metadata: { mailNumber: mail.mailNumber },
    });

    return mail;
  } catch (err) {
    // Only a failure past this point orphans the just-uploaded files — clean
    // them up so a failed send/save never leaks disk storage with no DB row
    // referencing it.
    await Promise.all(uploaded.map((u) => deleteStoredFile(u.storedPath)));
    if (err instanceof MailValidationError) throw err;
    console.error("saveMail failed:", err);
    throw new MailValidationError("Failed to save mail. Please try again.");
  }
}
