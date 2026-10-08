import "server-only";

import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { requirePermission } from "@/lib/auth/permissions";
import { saveUploadedFile } from "@/lib/storage";
import { sha256 } from "@/lib/management-system/checksum";
import type { ManagementSystemCategory } from "@prisma/client";

export class ManagementSystemError extends Error {}

const MANAGE_PERMISSION = "MANAGEMENT_SYSTEM_MANAGE";

export async function createManagementSystemDocument(params: {
  projectId: string;
  actingUserId: string;
  documentNo: string;
  title: string;
  managementSystem: ManagementSystemCategory;
  documentType: string;
  revision?: string;
  documentDate?: Date | null;
  author?: string | null;
  documentOwner?: string | null;
  file: File;
}) {
  const { projectId, actingUserId } = params;
  await requirePermission(actingUserId, MANAGE_PERMISSION, { projectId });

  if (!params.documentNo.trim()) throw new ManagementSystemError("Document number is required.");
  if (!params.title.trim()) throw new ManagementSystemError("Title is required.");

  const existing = await prisma.managementSystemDocument.findUnique({
    where: { projectId_documentNo: { projectId, documentNo: params.documentNo.trim() } },
  });
  if (existing) throw new ManagementSystemError(`Document number "${params.documentNo.trim()}" is already in use in this project.`);

  const buffer = Buffer.from(await params.file.arrayBuffer());
  const checksum = sha256(buffer);
  const duplicate = await prisma.managementSystemDocumentVersion.findFirst({ where: { checksum } });
  if (duplicate) {
    throw new ManagementSystemError("This exact file has already been imported as a controlled document (duplicate checksum).");
  }

  const { storedPath, sizeBytes } = await saveUploadedFile("management-system", params.file);
  const revision = params.revision?.trim() || "01";

  const document = await prisma.managementSystemDocument.create({
    data: {
      projectId,
      documentNo: params.documentNo.trim(),
      title: params.title.trim(),
      managementSystem: params.managementSystem,
      documentType: params.documentType.trim(),
      currentRevision: revision,
      documentDate: params.documentDate ?? null,
      author: params.author?.trim() || null,
      documentOwner: params.documentOwner?.trim() || null,
      createdById: actingUserId,
      versions: {
        create: {
          revision,
          versionNo: 1,
          fileName: params.file.name,
          storedPath,
          mimeType: params.file.type || "application/octet-stream",
          sizeBytes,
          checksum,
          uploadedById: actingUserId,
        },
      },
    },
  });

  await logAudit({
    userId: actingUserId,
    projectId,
    action: "MANAGEMENT_SYSTEM_DOCUMENT_CREATED",
    entityType: "ManagementSystemDocument",
    entityId: document.id,
    metadata: { documentNo: document.documentNo, managementSystem: document.managementSystem },
  });

  return document;
}

export async function addManagementSystemDocumentVersion(params: {
  id: string;
  projectId: string;
  actingUserId: string;
  revision: string;
  file: File;
  notes?: string;
}) {
  const { id, projectId, actingUserId } = params;
  await requirePermission(actingUserId, MANAGE_PERMISSION, { projectId });

  const document = await prisma.managementSystemDocument.findFirst({
    where: { id, projectId },
    include: { versions: { orderBy: { versionNo: "desc" }, take: 1 } },
  });
  if (!document) throw new ManagementSystemError("Document not found.");
  if (!params.revision.trim()) throw new ManagementSystemError("Revision is required.");

  const buffer = Buffer.from(await params.file.arrayBuffer());
  const checksum = sha256(buffer);
  const duplicate = await prisma.managementSystemDocumentVersion.findFirst({ where: { checksum } });
  if (duplicate) {
    throw new ManagementSystemError("This exact file has already been imported as a controlled document version (duplicate checksum).");
  }

  const { storedPath, sizeBytes } = await saveUploadedFile("management-system", params.file);
  const nextVersionNo = (document.versions[0]?.versionNo ?? 0) + 1;

  const [, version] = await prisma.$transaction([
    prisma.managementSystemDocumentVersion.updateMany({ where: { documentId: id }, data: { isCurrent: false } }),
    prisma.managementSystemDocumentVersion.create({
      data: {
        documentId: id,
        revision: params.revision.trim(),
        versionNo: nextVersionNo,
        fileName: params.file.name,
        storedPath,
        mimeType: params.file.type || "application/octet-stream",
        sizeBytes,
        checksum,
        isCurrent: true,
        notes: params.notes?.trim() || null,
        uploadedById: actingUserId,
      },
    }),
    prisma.managementSystemDocument.update({
      where: { id },
      data: { currentRevision: params.revision.trim(), updatedById: actingUserId },
    }),
  ]);

  await logAudit({
    userId: actingUserId,
    projectId,
    action: "MANAGEMENT_SYSTEM_DOCUMENT_VERSION_CREATED",
    entityType: "ManagementSystemDocument",
    entityId: id,
    metadata: { documentNo: document.documentNo, revision: params.revision.trim(), versionNo: nextVersionNo },
  });

  return version;
}
