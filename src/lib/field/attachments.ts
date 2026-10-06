import "server-only";

import { prisma } from "@/lib/prisma";
import { saveUploadedFile, deleteStoredFile } from "@/lib/storage";
import { logAudit } from "@/lib/audit";

export class FieldAttachmentError extends Error {}

export const FIELD_MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB — same real limit as HSE attachments.
const ALLOWED_PREFIXES = ["image/", "video/"];
const ALLOWED_EXACT = ["application/pdf"];

function isAllowedMimeType(mimeType: string): boolean {
  return ALLOWED_PREFIXES.some((p) => mimeType.startsWith(p)) || ALLOWED_EXACT.includes(mimeType);
}

/** Every Field record type stores its evidence here via a polymorphic
 * recordType+recordId pair (recordType is the literal Prisma model name,
 * e.g. "FieldObservation") — mirrors src/lib/hse/attachments.ts exactly, one
 * real upload path shared by every Field area rather than one per area. */
export async function saveFieldAttachment(params: {
  recordType: string;
  recordId: string;
  uploadedById: string;
  projectId: string;
  file: File;
  category?: string;
}) {
  const { recordType, recordId, uploadedById, projectId, file, category } = params;

  if (file.size === 0) throw new FieldAttachmentError("The selected file is empty.");
  if (file.size > FIELD_MAX_FILE_SIZE_BYTES) {
    throw new FieldAttachmentError(
      `The file is too large. Maximum file size is ${Math.round(FIELD_MAX_FILE_SIZE_BYTES / (1024 * 1024))}MB.`,
    );
  }
  if (!isAllowedMimeType(file.type)) {
    throw new FieldAttachmentError("Only photos, videos, and PDF files can be attached.");
  }

  const { storedPath, sizeBytes } = await saveUploadedFile("field", file);

  const attachment = await prisma.fieldAttachment.create({
    data: {
      recordType,
      recordId,
      fileName: file.name,
      storedPath,
      mimeType: file.type,
      sizeBytes,
      uploadedById,
      category: category ?? null,
    },
  });

  await logAudit({
    userId: uploadedById,
    projectId,
    action: "FIELD_ATTACHMENT_UPLOADED",
    entityType: recordType,
    entityId: recordId,
    metadata: { fileName: file.name, mimeType: file.type },
  });

  return attachment;
}

export async function listFieldAttachments(recordType: string, recordId: string) {
  return prisma.fieldAttachment.findMany({
    where: { recordType, recordId },
    include: { uploadedBy: true },
    orderBy: { uploadedAt: "desc" },
  });
}

export async function deleteFieldAttachment(params: {
  id: string;
  recordType: string;
  recordId: string;
  actingUserId: string;
  projectId: string;
  canDelete: boolean;
}) {
  const { id, recordType, recordId, actingUserId, projectId, canDelete } = params;
  const attachment = await prisma.fieldAttachment.findFirst({ where: { id, recordType, recordId } });
  if (!attachment) throw new FieldAttachmentError("Attachment not found.");
  if (!canDelete && attachment.uploadedById !== actingUserId) {
    throw new FieldAttachmentError("You do not have permission to delete this attachment.");
  }

  await prisma.fieldAttachment.delete({ where: { id } });
  await deleteStoredFile(attachment.storedPath);

  await logAudit({
    userId: actingUserId,
    projectId,
    action: "FIELD_ATTACHMENT_DELETED",
    entityType: recordType,
    entityId: recordId,
    metadata: { fileName: attachment.fileName },
  });
}
