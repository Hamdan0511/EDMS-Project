import "server-only";

import { PDFDocument } from "pdf-lib";
import { prisma } from "@/lib/prisma";
import { saveUploadedFile, deleteStoredFile } from "@/lib/storage";
import { logAudit } from "@/lib/audit";
import { parsePageSelection } from "./page-range";

export const MAX_SIZE_BYTES = 200 * 1024 * 1024;

export class ExtractPdfError extends Error {}

export type ExtractPdfResult = {
  id: string;
  originalFileName: string;
  sizeBytes: number;
  uploadedByName: string;
  uploadedAt: string;
  status: string;
  sourceFileName: string;
  pageCount: number;
  sourcePageCount: number;
  pages: number[];
};

function sanitizeOutputFileName(raw: string | undefined, sourceName: string): string {
  const fallback = sourceName.replace(/\.pdf$/i, "") + "-extracted.pdf";
  const candidate = (raw || "").trim();
  if (!candidate) return fallback;

  const parts = candidate.split(/[\\/]/);
  const base = parts[parts.length - 1] || "";
  const invalidChars = ["<", ">", ":", '"', "|", "?", "*"];
  let cleaned = base;
  for (const ch of invalidChars) {
    cleaned = cleaned.split(ch).join("");
  }
  cleaned = cleaned.trim();

  if (!cleaned || cleaned === "." || cleaned === "..") return fallback;

  return /\.pdf$/i.test(cleaned) ? cleaned : cleaned + ".pdf";
}

/**
 * True page extraction: reads the source PDF, copies only the selected
 * pages (in the requested order) into ONE new PDF, and stages it as a real
 * TemporaryFile — exactly like Split PDF's output, and per the same EDMS
 * rule, never auto-registered as a Document. The source file is only ever
 * read, never modified.
 */
export async function extractPdfPages(params: {
  projectId: string;
  userId: string;
  userName: string;
  file: File;
  pageSelection: string;
  keepOriginalOrder: boolean;
  outputFileName?: string;
}): Promise<ExtractPdfResult> {
  const { projectId, userId, userName, file, pageSelection, keepOriginalOrder, outputFileName } = params;

  if (!file || file.size === 0) {
    throw new ExtractPdfError("The selected file is empty. Please choose a valid PDF file.");
  }
  if (file.size > MAX_SIZE_BYTES) {
    throw new ExtractPdfError("The file is too large. Maximum file size is 200MB.");
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const header = Buffer.from(bytes.slice(0, 5)).toString("ascii");
  if (header !== "%PDF-") {
    throw new ExtractPdfError("The selected file is not a valid PDF.");
  }

  let sourceDoc: PDFDocument;
  try {
    sourceDoc = await PDFDocument.load(bytes, { ignoreEncryption: false, updateMetadata: false });
  } catch (err) {
    const message = err instanceof Error ? err.message.toLowerCase() : "";
    if (message.indexOf("encrypt") !== -1) {
      throw new ExtractPdfError(
        "This PDF is password-protected and cannot be processed. Please upload an unprotected PDF.",
      );
    }
    throw new ExtractPdfError("The uploaded file could not be read as a valid PDF. It may be corrupted.");
  }

  const totalPages = sourceDoc.getPageCount();
  if (totalPages === 0) {
    throw new ExtractPdfError("The PDF contains no pages.");
  }

  const parsed = parsePageSelection(pageSelection, totalPages);
  if (parsed.error) {
    throw new ExtractPdfError(parsed.error);
  }

  const orderedPages = keepOriginalOrder ? parsed.pages.slice().sort((a, b) => a - b) : parsed.pages;
  const zeroBasedIndices = orderedPages.map((p) => p - 1);

  let outBytes: Uint8Array;
  try {
    const outDoc = await PDFDocument.create();
    const copiedPages = await outDoc.copyPages(sourceDoc, zeroBasedIndices);
    for (const page of copiedPages) {
      outDoc.addPage(page);
    }
    outBytes = await outDoc.save();
  } catch (err) {
    console.error("Extract PDF failed while copying pages:", err);
    throw new ExtractPdfError("We couldn't create the extracted PDF. The original file has not been changed.");
  }

  const fileName = sanitizeOutputFileName(outputFileName, file.name || "document.pdf");
  const outFile = new File([new Uint8Array(outBytes)], fileName, { type: "application/pdf" });

  const { storedPath, sizeBytes } = await saveUploadedFile("documents", outFile);

  try {
    const record = await prisma.temporaryFile.create({
      data: {
        projectId,
        uploadedById: userId,
        originalFileName: fileName,
        storedPath,
        mimeType: "application/pdf",
        sizeBytes,
      },
    });

    await logAudit({
      userId,
      projectId,
      action: "DOCUMENT_EXTRACT_PDF",
      entityType: "TemporaryFile",
      entityId: record.id,
      metadata: {
        sourceFileName: file.name,
        sourcePageCount: totalPages,
        pageSelection,
        pages: orderedPages,
        outputFileName: fileName,
        temporaryFileId: record.id,
      },
    });

    return {
      id: record.id,
      originalFileName: record.originalFileName,
      sizeBytes: record.sizeBytes,
      uploadedByName: userName,
      uploadedAt: record.uploadedAt.toISOString(),
      status: record.status,
      sourceFileName: file.name,
      pageCount: orderedPages.length,
      sourcePageCount: totalPages,
      pages: orderedPages,
    };
  } catch (err) {
    await deleteStoredFile(storedPath).catch(() => {});
    console.error("Extract PDF failed while saving the temporary file:", err);
    throw new Error("We couldn't create the extracted PDF. The original file has not been changed.");
  }
}
