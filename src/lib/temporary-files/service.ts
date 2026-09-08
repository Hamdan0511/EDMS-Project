import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { saveUploadedFile, deleteStoredFile } from "@/lib/storage";
import { logAudit } from "@/lib/audit";
import { isAllowedExtension, extensionOf, canonicalMimeType, MAX_TEMP_FILE_SIZE_BYTES } from "@/lib/files/file-types";

export class TemporaryFileError extends Error {}

export async function uploadTemporaryFile(params: {
  projectId: string;
  uploadedById: string;
  file: File;
}) {
  const { projectId, uploadedById, file } = params;

  if (!file || file.size === 0) {
    throw new TemporaryFileError("The selected file is empty. Please choose a valid file.");
  }
  if (file.size > MAX_TEMP_FILE_SIZE_BYTES) {
    throw new TemporaryFileError("The file is too large. Maximum file size is 200MB.");
  }
  if (!isAllowedExtension(file.name)) {
    throw new TemporaryFileError(
      `Files with a .${extensionOf(file.name) || "unknown"} extension are not supported. Allowed types: PDF, Word, Excel, PowerPoint, images, DWG/DXF, TXT, CSV, ZIP.`,
    );
  }

  const { storedPath, sizeBytes } = await saveUploadedFile("temporary-files", file);

  try {
    const record = await prisma.temporaryFile.create({
      data: {
        projectId,
        uploadedById,
        originalFileName: file.name,
        storedPath,
        mimeType: canonicalMimeType(file.name),
        sizeBytes,
      },
    });

    await logAudit({
      userId: uploadedById,
      projectId,
      action: "TEMPORARY_FILE_UPLOADED",
      entityType: "TemporaryFile",
      entityId: record.id,
      metadata: { fileName: file.name, sizeBytes },
    });

    return record;
  } catch (err) {
    await deleteStoredFile(storedPath);
    throw err;
  }
}

export async function deleteTemporaryFile(params: {
  id: string;
  projectId: string;
  userId: string;
}) {
  const { id, projectId, userId } = params;

  const record = await prisma.temporaryFile.findFirst({ where: { id, projectId } });
  if (!record) {
    throw new TemporaryFileError("Temporary file not found.");
  }
  if (record.status === "REGISTERED") {
    throw new TemporaryFileError(
      "This file has already been registered as an official document and cannot be deleted from here.",
    );
  }

  await prisma.temporaryFile.delete({ where: { id } });
  await deleteStoredFile(record.storedPath);

  await logAudit({
    userId,
    projectId,
    action: "TEMPORARY_FILE_DELETED",
    entityType: "TemporaryFile",
    entityId: record.id,
    metadata: { fileName: record.originalFileName },
  });
}

export async function registerTemporaryFileAsDocument(params: {
  id: string;
  projectId: string;
  registeredById: string;
  documentNo: string;
  title: string;
  revision: string;
  typeName?: string;
  description?: string;
  discipline?: string;
}) {
  const { id, projectId, registeredById, documentNo, title, revision, typeName, description, discipline } = params;

  if (!documentNo.trim()) throw new TemporaryFileError("Document Number is required.");
  if (!title.trim()) throw new TemporaryFileError("Title is required.");
  if (!revision.trim()) throw new TemporaryFileError("Revision is required.");

  const record = await prisma.temporaryFile.findFirst({ where: { id, projectId } });
  if (!record) {
    throw new TemporaryFileError("Temporary file not found.");
  }
  if (record.status === "REGISTERED") {
    throw new TemporaryFileError("This file has already been registered as an official document.");
  }

  const existingDoc = await prisma.document.findUnique({
    where: { projectId_documentNo: { projectId, documentNo: documentNo.trim() } },
  });
  if (existingDoc) {
    throw new TemporaryFileError(`Document number "${documentNo.trim()}" is already in use in this project.`);
  }

  try {
    const document = await prisma.$transaction(async (tx) => {
      let typeId: string | undefined;
      if (typeName?.trim()) {
        const type = await tx.documentType.upsert({
          where: { projectId_name: { projectId, name: typeName.trim() } },
          update: {},
          create: { projectId, name: typeName.trim() },
        });
        typeId = type.id;
      }

      const doc = await tx.document.create({
        data: {
          projectId,
          documentNo: documentNo.trim(),
          title: title.trim(),
          description: description?.trim() || null,
          discipline: discipline?.trim() || null,
          typeId,
          currentRevision: revision.trim(),
          createdById: registeredById,
          versions: {
            create: {
              revision: revision.trim(),
              versionNo: 1,
              fileName: record.originalFileName,
              storedPath: record.storedPath,
              mimeType: record.mimeType,
              sizeBytes: record.sizeBytes,
              uploadedById: record.uploadedById,
              uploadedAt: record.uploadedAt,
            },
          },
        },
      });

      await tx.temporaryFile.update({
        where: { id: record.id },
        data: { status: "REGISTERED", registeredDocumentId: doc.id },
      });

      return doc;
    });

    await logAudit({
      userId: registeredById,
      projectId,
      action: "TEMPORARY_FILE_REGISTERED",
      entityType: "Document",
      entityId: document.id,
      metadata: { temporaryFileId: record.id, documentNo: document.documentNo },
    });

    return document;
  } catch (err) {
    if (err instanceof TemporaryFileError) throw err;
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new TemporaryFileError(
        `Document number "${documentNo.trim()}" is already in use in this project. Another registration may have used it just now — choose a different number.`,
      );
    }
    console.error("Register as document failed:", err);
    throw new TemporaryFileError("Failed to register the document. Please try again.");
  }
}
