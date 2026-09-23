/**
 * Read-only EDMS data classification audit.
 *
 * Inspects the current database and reports how every Document, mail
 * record, and related row is actually classified — without changing
 * anything. Run this before (and after) scripts/fix-edms-module-separation.mjs
 * to compare before/after state.
 *
 * Run with: node scripts/audit-edms-data.mjs
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const PROJECT_ID = "project-cultural-complex";

async function main() {
  const report = {};

  // --- Documents ---
  const totalDocs = await prisma.document.count({ where: { projectId: PROJECT_ID } });
  const drawingDocs = await prisma.document.count({ where: { projectId: PROJECT_ID, type: { isDrawingType: true } } });
  const standaloneCandidates = await prisma.document.count({
    where: { projectId: PROJECT_ID, OR: [{ typeId: null }, { type: { isDrawingType: false } }] },
  });
  report.documents = {
    total: totalDocs,
    classifiedAsDrawingByType: drawingDocs,
    nonDrawingByType: standaloneCandidates,
    mailRelated: 0, // no MailDocumentReference rows exist yet — see relationships section
    temporary: 0, // Documents are never TemporaryFile rows themselves
    unknown: 0,
  };

  // registerScope breakdown, if the column exists yet (pre-migration this
  // throws — caught below so the audit still runs before the migration).
  try {
    const byScope = await prisma.document.groupBy({ by: ["registerScope"], where: { projectId: PROJECT_ID }, _count: true });
    report.documents.byRegisterScope = Object.fromEntries(byScope.map((r) => [r.registerScope, r._count]));
  } catch {
    report.documents.byRegisterScope = "registerScope column not present yet (pre-migration)";
  }

  const byType = await prisma.documentType.findMany({
    where: { projectId: PROJECT_ID },
    select: { name: true, isDrawingType: true, _count: { select: { documents: true } } },
    orderBy: { name: "asc" },
  });
  report.documentsByType = byType.map((t) => ({ type: t.name, isDrawingType: t.isDrawingType, count: t._count.documents }));

  // --- DocumentVersions ---
  const totalVersions = await prisma.documentVersion.count({ where: { document: { projectId: PROJECT_ID } } });
  const orphanVersions = await prisma.$queryRawUnsafe(
    `SELECT count(*)::int AS count FROM "DocumentVersion" v LEFT JOIN "Document" d ON v."documentId" = d.id WHERE d.id IS NULL`,
  );
  report.documentVersions = { total: totalVersions, orphaned: orphanVersions[0].count };

  // --- Drawings breakdown ---
  const pdfCount = await prisma.documentVersion.count({ where: { document: { projectId: PROJECT_ID, type: { isDrawingType: true } } }, ...{} });
  const drawingVersions = await prisma.documentVersion.findMany({
    where: { document: { projectId: PROJECT_ID, type: { isDrawingType: true } } },
    select: { mimeType: true },
  });
  const drawingPdf = drawingVersions.filter((v) => v.mimeType === "application/pdf").length;
  const drawingDwg = drawingVersions.filter((v) => v.mimeType === "application/acad").length;
  const shopDrawing = byType.find((t) => t.name === "Shop Drawing")?._count.documents ?? 0;
  const plan = byType.find((t) => t.name === "Plan")?._count.documents ?? 0;
  const designDrawing = byType.find((t) => t.name === "Design Drawing")?._count.documents ?? 0;
  report.drawings = { total: drawingDocs, pdf: drawingPdf, dwg: drawingDwg, shopDrawing, plan, designDrawing };
  void pdfCount;

  // --- Mail ---
  report.mail = { total: await prisma.mail.count({ where: { projectId: PROJECT_ID } }) };
  report.mailRecipients = { total: await prisma.mailRecipient.count({ where: { mail: { projectId: PROJECT_ID } } }) };
  report.mailAttachments = { total: await prisma.mailAttachment.count({ where: { mail: { projectId: PROJECT_ID } } }) };
  report.mailDocumentReferences = { total: await prisma.mailDocumentReference.count({ where: { mail: { projectId: PROJECT_ID } } }) };

  // --- TemporaryFiles ---
  report.temporaryFiles = { total: await prisma.temporaryFile.count({ where: { projectId: PROJECT_ID } }) };

  // --- AuditLogs ---
  report.auditLogs = { total: await prisma.auditLog.count({ where: { projectId: PROJECT_ID } }) };

  // --- Relationship integrity ---
  const crossProjectDocs = await prisma.document.count({ where: { projectId: { not: PROJECT_ID } } });
  const docsWithoutVersions = await prisma.document.count({
    where: { projectId: PROJECT_ID, isPlaceholder: false, versions: { none: {} } },
  });
  const docNoCounts = await prisma.document.groupBy({
    by: ["documentNo"],
    where: { projectId: PROJECT_ID },
    _count: true,
    having: { documentNo: { _count: { gt: 1 } } },
  });
  const mailNoCounts = await prisma.mail.groupBy({
    by: ["mailNumber"],
    where: { projectId: PROJECT_ID },
    _count: true,
    having: { mailNumber: { _count: { gt: 1 } } },
  });
  const orphanMailAttachments = await prisma.$queryRawUnsafe(
    `SELECT count(*)::int AS count FROM "MailAttachment" a LEFT JOIN "Mail" m ON a."mailId" = m.id WHERE m.id IS NULL`,
  );
  const orphanMailRecipients = await prisma.$queryRawUnsafe(
    `SELECT count(*)::int AS count FROM "MailRecipient" r LEFT JOIN "Mail" m ON r."mailId" = m.id WHERE m.id IS NULL`,
  );
  report.relationships = {
    crossProjectDocuments: crossProjectDocs,
    documentsWithoutAnyVersion: docsWithoutVersions,
    duplicateDocumentNumbers: docNoCounts.length,
    duplicateMailNumbers: mailNoCounts.length,
    orphanedMailAttachments: orphanMailAttachments[0].count,
    orphanedMailRecipients: orphanMailRecipients[0].count,
  };

  console.log(JSON.stringify(report, null, 2));
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error("AUDIT FAILED:", err);
  await prisma.$disconnect();
  process.exit(1);
});
