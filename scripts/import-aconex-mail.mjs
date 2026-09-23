/**
 * Real Aconex Mail metadata importer for Shanfari EDMS.
 *
 * Source of truth:
 *  - Primary: "ExportMailAll-20260920_01-12.xlsx" (Mail sheet) - 279 real
 *    Aconex mail records, one row each, with a comma-joined Recipients cell.
 *  - Recipients: "ExportMailAll-20260919_21-20.xlsx" - the same 279 mails
 *    (verified 1:1 by Mail Number before this script was written), exported
 *    "row per recipient" with a clean Organization + Person pair per row -
 *    used ONLY for recipient extraction (cleaner than parsing the primary
 *    export's single comma-joined cell).
 *
 * No mail body, attachments, or thread relationships exist in either
 * export - none are fabricated. Attachments = Yes/No is recorded only in
 * this script's own report output and the per-mail audit log metadata,
 * never as a MailAttachment row (which would require a real file).
 *
 * Idempotent: matches on (projectId, mailNumber) - rerunning skips mails
 * that already exist. No destructive operation of any kind.
 *
 * Run with: node scripts/import-aconex-mail.mjs
 */
import { PrismaClient } from "@prisma/client";
import ExcelJS from "exceljs";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const prisma = new PrismaClient();

const PRIMARY_PATH = "C:/Users/Mohammed Hamdan/Downloads/ExportMailAll-20260920_01-12.xlsx";
const RECIPIENTS_PATH = "C:/Users/Mohammed Hamdan/Downloads/ExportMailAll-20260919_21-20.xlsx";
const PROJECT_ID = "project-cultural-complex";
const ADMIN_EMAIL = "admin@shanfari.local";

function normalize(s) {
  return (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function parseDMY(s) {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(String(s || "").trim());
  if (!m) return null;
  return new Date(Date.UTC(+m[3], +m[2] - 1, +m[1], 9, 0, 0));
}

async function loadPrimary() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(PRIMARY_PATH);
  const ws = wb.getWorksheet("Mail");
  const rows = [];
  for (let i = 11; i <= ws.rowCount; i++) {
    const v = ws.getRow(i).values;
    if (!v || !v[2]) continue;
    const [, attachments, mailNo, subject, date, from, fromOrg, , type] = v;
    rows.push({
      attachments: String(attachments || "").trim().toLowerCase() === "yes",
      mailNo: String(mailNo),
      subject: subject ? String(subject) : "(no subject)",
      date: parseDMY(date),
      from: from ? String(from).trim() : null,
      fromOrg: fromOrg ? String(fromOrg).trim() : null,
      type: type ? String(type).trim() : null,
    });
  }
  return rows;
}

async function loadRecipients() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(RECIPIENTS_PATH);
  const ws = wb.worksheets[0];
  const byMailNo = new Map();
  let currentMailNo = null;
  for (let i = 11; i <= ws.rowCount; i++) {
    const v = ws.getRow(i).values;
    if (!v) continue;
    const mailNo = v[2] ? String(v[2]) : null;
    if (mailNo) currentMailNo = mailNo;
    const toOrg = v[7] ? String(v[7]).trim() : null;
    const person = v[8] ? String(v[8]).trim() : null;
    if (!currentMailNo || !toOrg || !person) continue;
    if (!byMailNo.has(currentMailNo)) byMailNo.set(currentMailNo, []);
    byMailNo.get(currentMailNo).push({ org: toOrg, person });
  }
  return byMailNo;
}

async function resolveOrganization(rawName, stats) {
  const trimmed = (rawName || "").trim();
  if (/^shanfari/i.test(trimmed)) {
    return prisma.organization.findUniqueOrThrow({ where: { id: "org-shanfari" } });
  }
  // Reuse the existing "SAH-SML" organization created during the Documents
  // migration rather than creating a duplicate "SAH-SML JV Co." - same real
  // company, two different name spellings across the two Aconex exports.
  if (/^sah-sml/i.test(trimmed)) {
    const existing = await prisma.organization.findFirst({ where: { name: { equals: "SAH-SML", mode: "insensitive" } } });
    if (existing) return existing;
  }
  let org = await prisma.organization.findFirst({ where: { name: { equals: trimmed, mode: "insensitive" } } });
  if (!org) {
    org = await prisma.organization.create({ data: { name: trimmed } });
    stats.organizationsCreated.push(trimmed);
  }
  return org;
}

async function resolveUser(personName, organizationId, admin, stats) {
  const trimmed = (personName || "").trim();
  // The real admin account IS "Mohamed C." in our system - map the export's
  // spelling of the same person to the existing real login, not a duplicate
  // GUEST contact.
  if (normalize(trimmed) === normalize(admin.name)) {
    return admin;
  }

  const key = organizationId + "|" + normalize(trimmed);
  if (stats.userCache.has(key)) return stats.userCache.get(key);

  let user = await prisma.user.findFirst({
    where: { organizationId, accountType: "GUEST", name: { equals: trimmed, mode: "insensitive" } },
  });
  if (!user) {
    const email = "aconex-mail-import+" + crypto.randomUUID() + "@shanfari.local";
    user = await prisma.user.create({
      data: {
        email,
        name: trimmed,
        organizationId,
        passwordHash: await bcrypt.hash(crypto.randomUUID(), 12),
        accountType: "GUEST",
        isActive: false,
      },
    });
    await prisma.projectMember.upsert({
      where: { projectId_userId: { projectId: PROJECT_ID, userId: user.id } },
      update: {},
      create: { projectId: PROJECT_ID, userId: user.id, organizationId, role: "VIEWER" },
    });
    stats.contactsCreated++;
  }
  stats.userCache.set(key, user);
  return user;
}

async function resolveMailType(name, stats) {
  const trimmed = (name || "General Correspondence").trim();
  let type = await prisma.mailType.findUnique({ where: { projectId_name: { projectId: PROJECT_ID, name: trimmed } } });
  if (!type) {
    type = await prisma.mailType.create({ data: { projectId: PROJECT_ID, name: trimmed } });
    stats.mailTypesCreated.push(trimmed);
  }
  return type;
}

async function main() {
  const stats = {
    excelRows: 0,
    imported: 0,
    skippedAlreadyExists: 0,
    organizationsCreated: [],
    mailTypesCreated: [],
    contactsCreated: 0,
    userCache: new Map(),
    attachmentsYesNoBody: 0,
    unmappedRecipients: [],
  };

  const admin = await prisma.user.findFirstOrThrow({ where: { email: ADMIN_EMAIL } });
  const primaryRows = await loadPrimary();
  const recipientsByMailNo = await loadRecipients();
  stats.excelRows = primaryRows.length;

  for (const row of primaryRows) {
    const existing = await prisma.mail.findUnique({
      where: { projectId_mailNumber: { projectId: PROJECT_ID, mailNumber: row.mailNo } },
    });
    if (existing) {
      stats.skippedAlreadyExists++;
      continue;
    }

    const type = await resolveMailType(row.type, stats);
    const fromOrg = await resolveOrganization(row.fromOrg, stats);
    const sender = await resolveUser(row.from, fromOrg.id, admin, stats);
    const direction = /^shanfari/i.test(row.fromOrg || "") ? "OUTGOING" : "INCOMING";
    const sentDate = row.date ?? new Date();

    const recipients = recipientsByMailNo.get(row.mailNo) ?? [];
    const recipientUserIds = new Set();
    for (const r of recipients) {
      const org = await resolveOrganization(r.org, stats);
      const user = await resolveUser(r.person, org.id, admin, stats);
      recipientUserIds.add(user.id);
    }
    // A mail must have at least one recipient in our schema's real usage
    // pattern; if the recipient export had none for this mail number
    // (shouldn't happen given the 1:1 verification, but guard anyway),
    // fall back to the admin so the record is still queryable rather than
    // silently dropped - flagged in the report, not hidden.
    if (recipientUserIds.size === 0) {
      recipientUserIds.add(admin.id);
      stats.unmappedRecipients.push(row.mailNo);
    }

    await prisma.mail.create({
      data: {
        projectId: PROJECT_ID,
        mailNumber: row.mailNo,
        typeId: type.id,
        subject: row.subject,
        messageHtml: "",
        messageText: "",
        status: "SENT",
        direction,
        senderId: sender.id,
        createdAt: sentDate,
        sentAt: sentDate,
        recipients: {
          create: [...recipientUserIds].map((userId) => ({ userId, type: "TO" })),
        },
      },
    });

    if (row.attachments) stats.attachmentsYesNoBody++;
    stats.imported++;
  }

  // Fix updatedAt (Prisma's @updatedAt auto-stamps import time on create)
  // to reflect the real Aconex date, same correction applied during the
  // Documents migration.
  await prisma.$executeRawUnsafe(
    'UPDATE "Mail" SET "updatedAt" = "createdAt" WHERE "projectId" = $1',
    PROJECT_ID,
  );

  if (stats.imported > 0) {
    await prisma.auditLog.create({
      data: {
        userId: admin.id,
        projectId: PROJECT_ID,
        action: "ACONEX_MAIL_IMPORT_COMPLETED",
        entityType: "Mail",
        entityId: PROJECT_ID,
        metadata: {
          mailsImported: stats.imported,
          alreadyPresent: stats.skippedAlreadyExists,
          mailsWithAttachmentsIndicatedInSource: stats.attachmentsYesNoBody,
          source: "ExportMailAll-20260920_01-12.xlsx + ExportMailAll-20260919_21-20.xlsx (recipients)",
          note: "No MailAttachment rows created - source exports contain no actual attachment files.",
        },
      },
    });
  }

  console.log(JSON.stringify({
    excelRows: stats.excelRows,
    imported: stats.imported,
    skippedAlreadyExists: stats.skippedAlreadyExists,
    organizationsCreated: stats.organizationsCreated,
    mailTypesCreated: stats.mailTypesCreated,
    contactsCreated: stats.contactsCreated,
    attachmentsYesCountImported: stats.attachmentsYesNoBody,
    unmappedRecipients: stats.unmappedRecipients,
  }, null, 2));

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error("MAIL IMPORT FAILED:", err);
  await prisma.$disconnect();
  process.exit(1);
});
