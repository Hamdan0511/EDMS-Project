import "server-only";

import { PDFDocument } from "pdf-lib";
import { parsePageSelection } from "./page-range";

export const MAX_SIZE_BYTES = 200 * 1024 * 1024;

export class ExtractPdfError extends Error {}

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

export async function extractPdfPages(params: {
  file: File;
  pageSelection: string;
  keepOriginalOrder: boolean;
  outputFileName?: string;
}): Promise<{ bytes: Uint8Array; fileName: string; pageCount: number; sourcePageCount: number }> {
  const { file, pageSelection, keepOriginalOrder, outputFileName } = params;

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
    throw new ExtractPdfError(
      "The uploaded file could not be read as a valid PDF. It may be corrupted.",
    );
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

  const outDoc = await PDFDocument.create();
  const copiedPages = await outDoc.copyPages(sourceDoc, zeroBasedIndices);
  for (const page of copiedPages) {
    outDoc.addPage(page);
  }

  const outBytes = await outDoc.save();
  const fileName = sanitizeOutputFileName(outputFileName, file.name || "document.pdf");

  return { bytes: outBytes, fileName, pageCount: orderedPages.length, sourcePageCount: totalPages };
}
