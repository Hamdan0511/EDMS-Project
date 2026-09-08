import "server-only";

import { PDFDocument } from "pdf-lib";
import { prisma } from "@/lib/prisma";
import { saveUploadedFile, deleteStoredFile } from "@/lib/storage";
import { logAudit } from "@/lib/audit";

export const MAX_SIZE_BYTES = 200 * 1024 * 1024;
export const MAX_PAGES = 60;

/** Expected, user-facing rejections (bad input) — reported as 400, never logged as server errors. */
export class SplitPdfValidationError extends Error {}

export type SplitPdfResultFile = {
  id: string;
  originalFileName: string;
  sizeBytes: number;
  uploadedByName: string;
  uploadedAt: string;
  status: string;
};

export type SplitPdfResult = {
  originalFileName: string;
  pageCount: number;
  temporaryFiles: SplitPdfResultFile[];
};

function baseNameWithoutExtension(fileName: string): string {
  const withoutExt = fileName.replace(/\.pdf$/i, "");
  return withoutExt.trim() || "Untitled Document";
}

function pad3(n: number): string {
  return String(n).padStart(3, "0");
}

/**
 * Splits a PDF into genuine one-page PDFs and stages each as a real
 * TemporaryFile — NOT an official Document. Per EDMS lifecycle rules, a
 * utility's generated output is working/unregistered material until a user
 * explicitly registers it (see Temporary Files -> Register as Document).
 * This function never creates Document/DocumentVersion rows.
 */
export async function splitPdfIntoTemporaryFiles(params: {
  projectId: string;
  userId: string;
  userName: string;
  file: File;
}): Promise<SplitPdfResult> {
  const { projectId, userId, userName, file } = params;

  if (!file || file.size === 0) {
    throw new SplitPdfValidationError("The selected file is empty. Please choose a valid PDF file.");
  }
  if (file.size > MAX_SIZE_BYTES) {
    throw new SplitPdfValidationError("The file is too large. Maximum file size is 200MB.");
  }

  const bytes = new Uint8Array(await file.arrayBuffer());

  // Verify the actual file content, not the client-supplied extension/MIME type.
  const header = Buffer.from(bytes.slice(0, 5)).toString("ascii");
  if (header !== "%PDF-") {
    throw new SplitPdfValidationError("The selected file is not a valid PDF.");
  }

  let sourceDoc: PDFDocument;
  try {
    sourceDoc = await PDFDocument.load(bytes, { ignoreEncryption: false, updateMetadata: false });
  } catch (err) {
    const message = err instanceof Error ? err.message.toLowerCase() : "";
    if (message.includes("encrypt")) {
      throw new SplitPdfValidationError(
        "This PDF is password-protected and cannot be split. Please upload an unprotected PDF.",
      );
    }
    throw new SplitPdfValidationError(
      "The uploaded file could not be read as a valid PDF. It may be corrupted.",
    );
  }

  const pageCount = sourceDoc.getPageCount();
  if (pageCount === 0) {
    throw new SplitPdfValidationError("The PDF contains no pages.");
  }
  if (pageCount > MAX_PAGES) {
    throw new SplitPdfValidationError("The PDF cannot contain more than 60 pages.");
  }

  const baseName = baseNameWithoutExtension(file.name);

  const saved: Array<{ storedPath: string; sizeBytes: number; fileName: string }> = [];
  const createdTempFileIds: string[] = [];

  try {
    for (let i = 0; i < pageCount; i++) {
      let outBytes: Uint8Array;
      try {
        const outDoc = await PDFDocument.create();
        const [copiedPage] = await outDoc.copyPages(sourceDoc, [i]);
        outDoc.addPage(copiedPage);
        outBytes = await outDoc.save();
      } catch (err) {
        console.error(`Split PDF failed while processing page ${i + 1}:`, err);
        throw new SplitPdfValidationError(
          `Could not process page ${i + 1} of this PDF. It may use an unsupported PDF feature.`,
        );
      }

      const fileName = `${baseName} - Page ${pad3(i + 1)}.pdf`;
      const outFile = new File([new Uint8Array(outBytes)], fileName, { type: "application/pdf" });
      const { storedPath, sizeBytes } = await saveUploadedFile("documents", outFile);
      saved.push({ storedPath, sizeBytes, fileName });
    }

    const results: SplitPdfResultFile[] = [];
    for (const item of saved) {
      const record = await prisma.temporaryFile.create({
        data: {
          projectId,
          uploadedById: userId,
          originalFileName: item.fileName,
          storedPath: item.storedPath,
          mimeType: "application/pdf",
          sizeBytes: item.sizeBytes,
        },
      });
      createdTempFileIds.push(record.id);
      results.push({
        id: record.id,
        originalFileName: record.originalFileName,
        sizeBytes: record.sizeBytes,
        uploadedByName: userName,
        uploadedAt: record.uploadedAt.toISOString(),
        status: record.status,
      });
    }

    await logAudit({
      userId,
      projectId,
      action: "DOCUMENT_SPLIT_PDF",
      entityType: "TemporaryFile",
      entityId: createdTempFileIds[0] ?? projectId,
      metadata: { originalFileName: file.name, pageCount, temporaryFileIds: createdTempFileIds },
    });

    return { originalFileName: file.name, pageCount, temporaryFiles: results };
  } catch (err) {
    // Never leave orphaned split files or partial temp-file rows behind.
    await Promise.all(saved.map((s) => deleteStoredFile(s.storedPath)));
    if (createdTempFileIds.length > 0) {
      await prisma.temporaryFile.deleteMany({ where: { id: { in: createdTempFileIds } } }).catch(() => {});
    }
    if (err instanceof SplitPdfValidationError) throw err;
    console.error("Split PDF failed while saving temporary files:", err);
    throw new Error("Failed to save the split PDF pages. Please try again.");
  }
}
