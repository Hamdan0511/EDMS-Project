import "server-only";

import { prisma } from "@/lib/prisma";
import { saveUploadedFile, deleteStoredFile } from "@/lib/storage";
import { logAudit } from "@/lib/audit";

export class HseAttachmentError extends Error {}

export const HSE_MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB — real, configurable limit, not unlimited uploads.
const ALLOWED_PREFIXES = ["image/", "video/"];
const ALLOWED_EXACT = ["application/pdf"];

function isAllowedMimeType(mimeType: string): boolean {
  return ALLOWED_PREFIXES.some((p) => mimeType.startsWith(p)) || ALLOWED_EXACT.includes(mimeType);
}

/** Every HSE record type stores its evidence here via a polymorphic
 * recordType+recordId pair (recordType is the literal Prisma model name,
 * e.g. "HseIncident") — one real upload path shared by every module rather
 * than seven near-identical ones. */
export async function saveHseAttachment(params: {
  recordType: string;
  recordId: string;
  uploadedById: string;
  projectId: string;
  file: File;
}) {
  const { recordType, recordId, uploadedById, projectId, file } = params;

  if (file.size === 0) throw new HseAttachmentError("The selected file is empty.");
  if (file.size > HSE_MAX_FILE_SIZE_BYTES) {
    throw new HseAttachmentError(
      `The file is too large. Maximum file size is ${Math.round(HSE_MAX_FILE_SIZE_BYTES / (1024 * 1024))}MB.`,
    );
  }
  if (!isAllowedMimeType(file.type)) {
    throw new HseAttachmentError("Only photos, videos, and PDF files can be attached.");
  }

  const { storedPath, sizeBytes } = await saveUploadedFile("hse", file);

  const attachment = await prisma.hseAttachment.create({
    data: {
      recordType,
      recordId,
      fileName: file.name,
      storedPath,
      mimeType: file.type,
      sizeBytes,
      uploadedById,
    },
  });

  await logAudit({
    userId: uploadedById,
    projectId,
    action: "HSE_ATTACHMENT_UPLOADED",
    entityType: recordType,
    entityId: recordId,
    metadata: { fileName: file.name, mimeType: file.type },
  });

  return attachment;
}

export async function listHseAttachments(recordType: string, recordId: string) {
  return prisma.hseAttachment.findMany({
    where: { recordType, recordId },
    include: { uploadedBy: true },
    orderBy: { uploadedAt: "desc" },
  });
}

export async function deleteHseAttachment(params: {
  id: string;
  recordType: string;
  recordId: string;
  actingUserId: string;
  projectId: string;
  canDelete: boolean;
}) {
  const { id, recordType, recordId, actingUserId, projectId, canDelete } = params;
  const attachment = await prisma.hseAttachment.findFirst({ where: { id, recordType, recordId } });
  if (!attachment) throw new HseAttachmentError("Attachment not found.");
  if (!canDelete && attachment.uploadedById !== actingUserId) {
    throw new HseAttachmentError("You do not have permission to delete this attachment.");
  }

  await prisma.hseAttachment.delete({ where: { id } });
  await deleteStoredFile(attachment.storedPath);

  await logAudit({
    userId: actingUserId,
    projectId,
    action: "HSE_ATTACHMENT_DELETED",
    entityType: recordType,
    entityId: recordId,
    metadata: { fileName: attachment.fileName },
  });
}
