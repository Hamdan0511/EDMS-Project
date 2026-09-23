import "server-only";

import ExcelJS from "exceljs";
import { DOCUMENT_STATUS_LABELS, DOCUMENT_REVIEW_STATUS_LABELS } from "./status";
import type { Document, DocumentType, User, Organization } from "@prisma/client";

export type ExportableDocument = Document & {
  type: DocumentType | null;
  createdBy: User & { organization: Organization };
};

const HEADERS = [
  "Document Number",
  "Title",
  "Document Type",
  "Revision",
  "Discipline",
  "Functional Breakdown",
  "Spatial Breakdown",
  "Review Status",
  "Status",
  "Originator",
  "Organization",
  "Date Uploaded",
  "Date Modified",
];

/** Builds a real .xlsx workbook — used for both the blank/example Metadata
 * Template download and the full Export to Excel report. `rows` is empty
 * for a blank template (headers only, no fabricated example data). */
export async function buildDocumentWorkbook(rows: ExportableDocument[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Documents");

  sheet.columns = HEADERS.map((header) => ({ header, width: Math.max(16, header.length + 4) }));
  sheet.getRow(1).font = { bold: true };

  for (const doc of rows) {
    sheet.addRow([
      doc.documentNo,
      doc.title,
      doc.type?.name ?? "",
      doc.currentRevision,
      doc.discipline ?? "",
      doc.functionalBreakdown ?? "",
      doc.spatialBreakdown ?? "",
      doc.reviewStatus ? DOCUMENT_REVIEW_STATUS_LABELS[doc.reviewStatus] : "",
      DOCUMENT_STATUS_LABELS[doc.status],
      doc.createdBy.name,
      doc.createdBy.organization.name,
      doc.createdAt.toLocaleDateString("en-GB"),
      doc.updatedAt.toLocaleDateString("en-GB"),
    ]);
  }

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
