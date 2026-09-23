import "server-only";

import { prisma } from "@/lib/prisma";
import { saveUploadedFile, deleteStoredFile } from "@/lib/storage";
import { logAudit } from "@/lib/audit";
import { isAllowedExtension, extensionOf, canonicalMimeType, MAX_TEMP_FILE_SIZE_BYTES } from "@/lib/files/file-types";
import { isDocumentStatus, isDocumentReviewStatus } from "./status";
import { deriveRegisterScope, isAutoSyncableScope } from "./register-scope";
import type { DocumentStatus, DocumentReviewStatus } from "@prisma/client";

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
  functionalBreakdown?: string;
  spatialBreakdown?: string;
  reviewStatus?: string;
  status?: string;
  description?: string;
}) {
  const {
    id,
    projectId,
    userId,
    title,
    typeName,
    discipline,
    functionalBreakdown,
    spatialBreakdown,
    reviewStatus,
    status,
    description,
  } = params;

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
  if (reviewStatus !== undefined && reviewStatus !== "" && !isDocumentReviewStatus(reviewStatus)) {
    throw new DocumentError("Invalid review status value.");
  }

  const updated = await prisma.$transaction(async (tx) => {
    let typeId: string | null | undefined;
    let isDrawingType: boolean | undefined;
    if (typeName !== undefined) {
      if (typeName.trim()) {
        const type = await tx.documentType.upsert({
          where: { projectId_name: { projectId, name: typeName.trim() } },
          update: {},
          create: { projectId, name: typeName.trim() },
        });
        typeId = type.id;
        isDrawingType = type.isDrawingType;
      } else {
        typeId = null;
        isDrawingType = false;
      }
    }

    // Keep registerScope in sync with the type's drawing-ness whenever the
    // type actually changes — but never silently pull a document out of a
    // deliberate MIGRATION_HOLD/ARCHIVED state via a routine metadata edit.
    const registerScope =
      isDrawingType !== undefined && isAutoSyncableScope(document.registerScope)
        ? deriveRegisterScope(isDrawingType)
        : undefined;

    return tx.document.update({
      where: { id },
      data: {
        title: title?.trim(),
        discipline: discipline !== undefined ? discipline.trim() || null : undefined,
        functionalBreakdown: functionalBreakdown !== undefined ? functionalBreakdown.trim() || null : undefined,
        spatialBreakdown: spatialBreakdown !== undefined ? spatialBreakdown.trim() || null : undefined,
        reviewStatus: reviewStatus !== undefined ? ((reviewStatus.trim() || null) as DocumentReviewStatus | null) : undefined,
        status: status !== undefined ? (status as DocumentStatus) : undefined,
        description: description !== undefined ? description.trim() || null : undefined,
        typeId,
        registerScope,
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
        // Uploading a file against a placeholder completes it — it's no
        // longer a reserved record with nothing behind it.
        isPlaceholder: false,
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

/** Creates a real, registered Document record with a reserved number and
 * metadata but no file yet — a placeholder. Structurally identical to any
 * other Document except it starts with zero DocumentVersion rows and
 * isPlaceholder: true; uploading its first revision (addDocumentRevision)
 * completes it. */
export async function createPlaceholderDocument(params: {
  projectId: string;
  userId: string;
  documentNo: string;
  title: string;
  typeName?: string;
  discipline?: string;
  description?: string;
}) {
  const { projectId, userId, documentNo, title, typeName, discipline, description } = params;

  if (!documentNo.trim()) throw new DocumentError("Document Number is required.");
  if (!title.trim()) throw new DocumentError("Title is required.");

  const existing = await prisma.document.findUnique({
    where: { projectId_documentNo: { projectId, documentNo: documentNo.trim() } },
  });
  if (existing) {
    throw new DocumentError(`Document number "${documentNo.trim()}" is already in use in this project.`);
  }

  try {
    const document = await prisma.$transaction(async (tx) => {
      let typeId: string | undefined;
      let isDrawingType = false;
      if (typeName?.trim()) {
        const type = await tx.documentType.upsert({
          where: { projectId_name: { projectId, name: typeName.trim() } },
          update: {},
          create: { projectId, name: typeName.trim() },
        });
        typeId = type.id;
        isDrawingType = type.isDrawingType;
      }

      return tx.document.create({
        data: {
          projectId,
          documentNo: documentNo.trim(),
          title: title.trim(),
          description: description?.trim() || null,
          discipline: discipline?.trim() || null,
          registerScope: deriveRegisterScope(isDrawingType),
          typeId,
          isPlaceholder: true,
          createdById: userId,
        },
      });
    });

    await logAudit({
      userId,
      projectId,
      action: "PLACEHOLDER_CREATED",
      entityType: "Document",
      entityId: document.id,
      metadata: { documentNo: document.documentNo },
    });

    return document;
  } catch (err) {
    if (err instanceof DocumentError) throw err;
    console.error("Create placeholder failed:", err);
    throw new DocumentError("Failed to create the placeholder. Please try again.");
  }
}

/** Restricted to type/discipline/status/description — documentNo and title
 * are deliberately excluded from bulk edit since they must stay unique and
 * meaningful per document; a bulk "set the same title on 25 documents"
 * action would corrupt the register rather than help it. */
export async function bulkUpdateDocumentMetadata(params: {
  projectId: string;
  userId: string;
  documentIds: string[];
  field: "typeName" | "discipline" | "status" | "description";
  value: string;
}) {
  const { projectId, userId, documentIds, field, value } = params;

  if (documentIds.length === 0) {
    throw new DocumentError("No documents selected.");
  }
  if (field === "status" && !isDocumentStatus(value)) {
    throw new DocumentError("Invalid status value.");
  }

  const documents = await prisma.document.findMany({
    where: { id: { in: documentIds }, projectId },
    select: { id: true },
  });
  if (documents.length !== documentIds.length) {
    throw new DocumentError("One or more selected documents could not be found in this project.");
  }

  const result = await prisma.$transaction(async (tx) => {
    if (field === "typeName") {
      let typeId: string | null = null;
      let isDrawingType = false;
      if (value.trim()) {
        const type = await tx.documentType.upsert({
          where: { projectId_name: { projectId, name: value.trim() } },
          update: {},
          create: { projectId, name: value.trim() },
        });
        typeId = type.id;
        isDrawingType = type.isDrawingType;
      }
      // Only resync registerScope for rows currently "live" in one of the
      // two registers — never silently release a MIGRATION_HOLD/ARCHIVED
      // document via a bulk type change.
      await tx.document.updateMany({
        where: { id: { in: documentIds }, projectId, registerScope: { in: ["STANDALONE_DOCUMENT", "DRAWING"] } },
        data: { registerScope: deriveRegisterScope(isDrawingType) },
      });
      return tx.document.updateMany({ where: { id: { in: documentIds }, projectId }, data: { typeId } });
    }
    if (field === "discipline") {
      return tx.document.updateMany({
        where: { id: { in: documentIds }, projectId },
        data: { discipline: value.trim() || null },
      });
    }
    if (field === "status") {
      return tx.document.updateMany({
        where: { id: { in: documentIds }, projectId },
        data: { status: value as DocumentStatus },
      });
    }
    return tx.document.updateMany({
      where: { id: { in: documentIds }, projectId },
      data: { description: value.trim() || null },
    });
  });

  await logAudit({
    userId,
    projectId,
    action: "DOCUMENTS_BULK_METADATA_UPDATED",
    entityType: "Document",
    entityId: documentIds[0],
    metadata: { documentIds, field, value },
  });

  return result.count;
}
