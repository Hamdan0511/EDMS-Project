import "server-only";

import { prisma } from "@/lib/prisma";
import { saveUploadedFile, deleteStoredFile } from "@/lib/storage";
import { logAudit } from "@/lib/audit";
import { isAllowedExtension, extensionOf, canonicalMimeType, MAX_TEMP_FILE_SIZE_BYTES } from "@/lib/files/file-types";
import { isDocumentStatus } from "./status";
import type { DocumentStatus } from "@prisma/client";

export class DocumentError extends Error {}

export async function deleteDocument(params: { id: string; projectId: string; userId: string }) {
  const { id, projectId, userId } = params;

  const document = await prisma.document.findFirst({
    where: { id, projectId },
    include: { versions: true, temporaryFileOrigin: true },
  });
  if (!document) {
    throw new DocumentError("Document not found.");
  }

  await prisma.$transaction(async (tx) => {
    if (document.temporaryFileOrigin) {
      // Deleting the official document should not leave the temporary file
      // permanently stuck as REGISTERED-but-orphaned — hand it back so the
      // user can re-register it or delete it normally.
      await tx.temporaryFile.update({
        where: { id: document.temporaryFileOrigin.id },
        data: { status: "TEMPORARY", registeredDocumentId: null },
      });
    }
    await tx.document.delete({ where: { id } });
  });

  await Promise.all(document.versions.map((v) => deleteStoredFile(v.storedPath)));

  await logAudit({
    userId,
    projectId,
    action: "DOCUMENT_DELETED",
    entityType: "Document",
    entityId: document.id,
    metadata: { documentNo: document.documentNo, title: document.title },
  });
}

export async function updateDocumentMetadata(params: {
  id: string;
  projectId: string;
  userId: string;
  title?: string;
  typeName?: string;
  discipline?: string;
  status?: string;
  description?: string;
}) {
  const { id, projectId, userId, title, typeName, discipline, status, description } = params;

  const document = await prisma.document.findFirst({ where: { id, projectId } });
  if (!document) {
    throw new DocumentError("Document not found.");
  }
  if (title !== undefined && !title.trim()) {
    throw new DocumentError("Title cannot be empty.");
  }
  if (status !== undefined && !isDocumentStatus(status)) {
    throw new DocumentError("Invalid status value.");
  }

  const updated = await prisma.$transaction(async (tx) => {
    let typeId: string | null | undefined;
    if (typeName !== undefined) {
      if (typeName.trim()) {
        const type = await tx.documentType.upsert({
          where: { projectId_name: { projectId, name: typeName.trim() } },
          update: {},
          create: { projectId, name: typeName.trim() },
        });
        typeId = type.id;
      } else {
        typeId = null;
      }
    }

    return tx.document.update({
      where: { id },
      data: {
        title: title?.trim(),
        discipline: discipline !== undefined ? discipline.trim() || null : undefined,
        status: status !== undefined ? (status as DocumentStatus) : undefined,
        description: description !== undefined ? description.trim() || null : undefined,
        typeId,
      },
    });
  });

  await logAudit({
    userId,
    projectId,
    action: "DOCUMENT_METADATA_UPDATED",
    entityType: "Document",
    entityId: id,
    metadata: { documentNo: document.documentNo },
  });

  return updated;
}

export async function addDocumentRevision(params: {
  id: string;
  projectId: string;
  userId: string;
  revision: string;
  file: File;
  notes?: string;
}) {
  const { id, projectId, userId, revision, file, notes } = params;

  if (!revision.trim()) {
    throw new DocumentError("Revision is required.");
  }
  if (!file || file.size === 0) {
    throw new DocumentError("The selected file is empty. Please choose a valid file.");
  }
  if (file.size > MAX_TEMP_FILE_SIZE_BYTES) {
    throw new DocumentError("The file is too large. Maximum file size is 200MB.");
  }
  if (!isAllowedExtension(file.name)) {
    throw new DocumentError(
      `Files with a .${extensionOf(file.name) || "unknown"} extension are not supported.`,
    );
  }

  const document = await prisma.document.findFirst({
    where: { id, projectId },
    include: { versions: { orderBy: { versionNo: "desc" }, take: 1 } },
  });
  if (!document) {
    throw new DocumentError("Document not found.");
  }

  const { storedPath, sizeBytes } = await saveUploadedFile("documents", file);
  const nextVersionNo = (document.versions[0]?.versionNo ?? 0) + 1;

  try {
    const updated = await prisma.document.update({
      where: { id },
      data: {
        currentRevision: revision.trim(),
        versions: {
          create: {
            revision: revision.trim(),
            versionNo: nextVersionNo,
            fileName: file.name,
            storedPath,
            mimeType: canonicalMimeType(file.name),
            sizeBytes,
            notes: notes?.trim() || null,
            uploadedById: userId,
          },
        },
      },
      include: { versions: { orderBy: { versionNo: "desc" }, take: 1 } },
    });

    await logAudit({
      userId,
      projectId,
      action: "DOCUMENT_REVISION_ADDED",
      entityType: "Document",
      entityId: id,
      metadata: { documentNo: document.documentNo, revision: revision.trim(), versionNo: nextVersionNo },
    });

    return updated;
  } catch (err) {
    await deleteStoredFile(storedPath);
    throw err;
  }
}
