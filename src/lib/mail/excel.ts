import "server-only";

import ExcelJS from "exceljs";
import { WORKFLOW_STATUS_LABELS } from "./workflow-status";
import { effectiveWorkflowStatus } from "./overdue";
import type { Mail, MailRecipient, MailType, User, Organization } from "@prisma/client";

export type ExportableMail = Mail & {
  sender: User & { organization: Organization };
  type: MailType;
  recipients: (MailRecipient & { user: User & { organization: Organization } })[];
  _count: { attachments: number; replies: number };
};

function dateCell(d: Date | null): Date | string {
  return d ?? "";
}

function statusLabel(mail: ExportableMail): string {
  return mail.status === "DRAFT" ? "Draft" : WORKFLOW_STATUS_LABELS[effectiveWorkflowStatus(mail)];
}

/** One row per Mail — matches the Mail Register's own columns, plus a few
 * real fields the register doesn't display but the model actually has.
 * Recipients are necessarily collapsed to a single delimited cell in this
 * mode (an explicit, documented Aconex-style tradeoff — never a fabricated
 * substitute for the row-per-recipient export). */
export async function buildMailWorkbookRowPerMail(rows: ExportableMail[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Mail");

  sheet.columns = [
    { header: "Mail No.", width: 24 },
    { header: "Subject", width: 50 },
    { header: "Type", width: 18 },
    { header: "Direction", width: 12 },
    { header: "Date", width: 14 },
    { header: "From", width: 22 },
    { header: "From Organization", width: 24 },
    { header: "To Organization", width: 24 },
    { header: "Recipients", width: 50 },
    { header: "Status", width: 16 },
    { header: "Reference No.", width: 18 },
    { header: "Response Due Date", width: 16 },
    { header: "Attachments", width: 12 },
    { header: "Replies", width: 10 },
    { header: "Reply Date", width: 14 },
    { header: "Created", width: 14 },
  ];
  sheet.getRow(1).font = { bold: true };

  for (const m of rows) {
    const toOrgs = [...new Set(m.recipients.filter((r) => r.type === "TO").map((r) => r.user.organization.name))];
    sheet.addRow([
      m.mailNumber,
      m.subject,
      m.type.name,
      m.direction === "INCOMING" ? "Incoming" : "Outgoing",
      dateCell(m.sentAt ?? m.createdAt),
      m.sender.name,
      m.sender.organization.name,
      toOrgs.join(", "),
      m.recipients.map((r) => `${r.user.name} (${r.type})`).join("; "),
      statusLabel(m),
      m.referenceNumber ?? "",
      dateCell(m.responseDueDate),
      m._count.attachments,
      m._count.replies,
      "",
      dateCell(m.createdAt),
    ]);
  }

  formatDateColumns(sheet, [5, 12, 16]);
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

/** One row per real MailRecipient record — never collapsed, never
 * fabricated. A mail with 26 recipients produces exactly 26 rows here. */
export async function buildMailWorkbookRowPerRecipient(rows: ExportableMail[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Mail (Row per Recipient)");

  sheet.columns = [
    { header: "Mail No.", width: 24 },
    { header: "Subject", width: 50 },
    { header: "Type", width: 18 },
    { header: "Direction", width: 12 },
    { header: "Date", width: 14 },
    { header: "From", width: 22 },
    { header: "From Organization", width: 24 },
    { header: "Recipient", width: 22 },
    { header: "Recipient Organization", width: 24 },
    { header: "Recipient Type", width: 14 },
    { header: "Status", width: 16 },
    { header: "Reference No.", width: 18 },
    { header: "Attachments", width: 12 },
  ];
  sheet.getRow(1).font = { bold: true };

  for (const m of rows) {
    if (m.recipients.length === 0) {
      // A real mail with zero recipients (e.g. a draft) still gets one row —
      // never silently dropped from the export.
      sheet.addRow([
        m.mailNumber,
        m.subject,
        m.type.name,
        m.direction === "INCOMING" ? "Incoming" : "Outgoing",
        dateCell(m.sentAt ?? m.createdAt),
        m.sender.name,
        m.sender.organization.name,
        "",
        "",
        "",
        statusLabel(m),
        m.referenceNumber ?? "",
        m._count.attachments,
      ]);
      continue;
    }
    for (const r of m.recipients) {
      sheet.addRow([
        m.mailNumber,
        m.subject,
        m.type.name,
        m.direction === "INCOMING" ? "Incoming" : "Outgoing",
        dateCell(m.sentAt ?? m.createdAt),
        m.sender.name,
        m.sender.organization.name,
        r.user.name,
        r.user.organization.name,
        r.type,
        statusLabel(m),
        m.referenceNumber ?? "",
        m._count.attachments,
      ]);
    }
  }

  formatDateColumns(sheet, [5]);
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

function formatDateColumns(sheet: ExcelJS.Worksheet, columnIndexes: number[]): void {
  for (const col of columnIndexes) {
    sheet.getColumn(col).numFmt = "dd/mm/yyyy";
  }
}
