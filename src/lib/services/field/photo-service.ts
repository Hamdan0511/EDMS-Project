import "server-only";

import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { requirePermission } from "@/lib/auth/permissions";
import { saveUploadedFile } from "@/lib/storage";
import { createObservation } from "@/lib/services/field/observation-service";
import { createIssue } from "@/lib/services/field/issue-service";
import { createPunchItem } from "@/lib/services/field/punch-service";
import { assertActiveSiteWalk } from "@/lib/services/field/site-walk-service";

export class PhotoError extends Error {}

const PERMISSION = "FIELD_MANAGE_PHOTOS";
const ALLOWED_PREFIXES = ["image/"];

/** A FieldPhoto wraps a real FieldAttachment (the actual bytes) with gallery
 * identity (area/capturedAt). The attachment's own recordType/recordId is
 * set to ("FieldPhoto", <this photo's id>) — the id is generated up front so
 * both rows can be created referencing each other without a transaction
 * needing to patch back a foreign key afterward. */
export async function uploadFieldPhoto(params: {
  projectId: string;
  uploadedById: string;
  file: File;
  areaId?: string;
  siteWalkId?: string;
  category?: string;
  capturedAt?: Date;
}) {
  const { projectId, uploadedById, file } = params;
  await requirePermission(uploadedById, PERMISSION, { projectId });

  if (file.size === 0) throw new PhotoError("The selected file is empty.");
  if (!ALLOWED_PREFIXES.some((p) => file.type.startsWith(p))) {
    throw new PhotoError("Only image files can be uploaded to the photo library.");
  }

  if (params.areaId) {
    const area = await prisma.fieldArea.findFirst({ where: { id: params.areaId, projectId } });
    if (!area) throw new PhotoError("Selected location does not belong to this project.");
  }
  if (params.siteWalkId) {
    await assertActiveSiteWalk(params.siteWalkId, projectId);
  }

  const { storedPath, sizeBytes } = await saveUploadedFile("field", file);
  const photoId = crypto.randomUUID();

  const attachment = await prisma.fieldAttachment.create({
    data: {
      recordType: "FieldPhoto",
      recordId: photoId,
      fileName: file.name,
      storedPath,
      mimeType: file.type,
      sizeBytes,
      uploadedById,
      category: params.category ?? null,
    },
  });

  const photo = await prisma.fieldPhoto.create({
    data: {
      id: photoId,
      projectId,
      attachmentId: attachment.id,
      areaId: params.areaId ?? null,
      siteWalkId: params.siteWalkId ?? null,
      capturedAt: params.capturedAt ?? null,
      createdById: uploadedById,
    },
  });

  await logAudit({
    userId: uploadedById,
    projectId,
    action: "FIELD_PHOTO_UPLOADED",
    entityType: "FieldPhoto",
    entityId: photo.id,
    metadata: { fileName: file.name, category: params.category },
  });

  return photo;
}

export async function listFieldPhotos(params: { projectId: string; areaId?: string; category?: string }) {
  const { projectId, areaId, category } = params;
  const photos = await prisma.fieldPhoto.findMany({
    where: { projectId, ...(areaId ? { areaId } : {}) },
    include: { attachment: true, markupAttachment: true, area: true, createdBy: true },
    orderBy: { createdAt: "desc" },
  });
  return category ? photos.filter((p) => p.attachment.category === category) : photos;
}

/** Copies the photo's existing file into a new FieldAttachment row owned by
 * the newly created record — the stored bytes are never duplicated, only a
 * second polymorphic reference row is added, exactly like every other
 * cross-linked evidence case in this module. */
export async function attachPhotoAsEvidence(photoId: string, recordType: string, recordId: string, actingUserId: string) {
  const photo = await prisma.fieldPhoto.findUnique({ where: { id: photoId }, include: { attachment: true } });
  if (!photo) return;
  await prisma.fieldAttachment.create({
    data: {
      recordType,
      recordId,
      fileName: photo.attachment.fileName,
      storedPath: photo.attachment.storedPath,
      mimeType: photo.attachment.mimeType,
      sizeBytes: photo.attachment.sizeBytes,
      uploadedById: actingUserId,
      category: photo.attachment.category,
    },
  });
}

export async function createObservationFromPhoto(params: {
  photoId: string;
  projectId: string;
  actingUserId: string;
  title: string;
  description: string;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  responsibleUserId?: string;
  dueDate?: Date;
}) {
  const { photoId, projectId, actingUserId } = params;
  const photo = await prisma.fieldPhoto.findFirst({ where: { id: photoId, projectId } });
  if (!photo) throw new PhotoError("Photo not found.");

  const observation = await createObservation({
    projectId,
    createdById: actingUserId,
    areaId: photo.areaId ?? undefined,
    title: params.title,
    description: params.description,
    priority: params.priority,
    responsibleUserId: params.responsibleUserId,
    dueDate: params.dueDate,
  });

  await attachPhotoAsEvidence(photoId, "FieldObservation", observation.id, actingUserId);
  return observation;
}

export async function createIssueFromPhoto(params: {
  photoId: string;
  projectId: string;
  actingUserId: string;
  title: string;
  description: string;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  responsibleUserId?: string;
  dueDate?: Date;
}) {
  const { photoId, projectId, actingUserId } = params;
  const photo = await prisma.fieldPhoto.findFirst({ where: { id: photoId, projectId } });
  if (!photo) throw new PhotoError("Photo not found.");

  const issue = await createIssue({
    projectId,
    createdById: actingUserId,
    areaId: photo.areaId ?? undefined,
    title: params.title,
    description: params.description,
    priority: params.priority,
    responsibleUserId: params.responsibleUserId,
    dueDate: params.dueDate,
    sourceType: "FieldPhoto",
    sourceId: photo.id,
  });

  await attachPhotoAsEvidence(photoId, "FieldIssue", issue.id, actingUserId);
  return issue;
}

export async function createPunchItemFromPhoto(params: {
  photoId: string;
  projectId: string;
  actingUserId: string;
  title: string;
  description: string;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  responsibleUserId?: string;
  dueDate?: Date;
}) {
  const { photoId, projectId, actingUserId } = params;
  const photo = await prisma.fieldPhoto.findFirst({ where: { id: photoId, projectId } });
  if (!photo) throw new PhotoError("Photo not found.");

  const item = await createPunchItem({
    projectId,
    createdById: actingUserId,
    areaId: photo.areaId ?? undefined,
    title: params.title,
    description: params.description,
    priority: params.priority,
    responsibleUserId: params.responsibleUserId,
    dueDate: params.dueDate,
  });

  await attachPhotoAsEvidence(photoId, "FieldPunchItem", item.id, actingUserId);
  return item;
}
