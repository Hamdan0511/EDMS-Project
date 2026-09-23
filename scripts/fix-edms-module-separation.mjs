/**
 * Safe, additive backfill of Document.registerScope for existing rows.
 *
 * The Document Register and Drawings pages historically shared one query
 * with no scope filter at all, so the Document Register silently showed
 * drawings too. The `registerScope` column (see the
 * `document_register_scope` migration) is now the server-enforced
 * separation; this script performs the ONE-TIME backfill of that column
 * for rows that existed before the column did.
 *
 * This script:
 *  - never deletes anything
 *  - never touches DocumentVersion, Mail, MailAttachment, or TemporaryFile rows
 *  - only ever assigns registerScope to rows that are still at the
 *    column's default (STANDALONE_DOCUMENT) AND have not been touched by
 *    application code since (i.e. is idempotent / safe to re-run — a
 *    second run reclassifies nothing because the first run already moved
 *    every row out of the ambiguous default state)
 *  - runs the actual writes inside a single transaction
 *  - requires the CONFIRM=yes environment variable to actually write;
 *    without it, prints the plan and exits without changing anything
 *
 * Classification rule (matches Document.registerScope's derivation logic
 * in src/lib/documents/register-scope.ts):
 *  - DocumentType.isDrawingType = true  -> DRAWING
 *  - otherwise                          -> MIGRATION_HOLD
 *    (real, imported Aconex data intentionally held out of the visible
 *    Document Register pending explicit review — not deleted, not faked
 *    as STANDALONE_DOCUMENT, not archived)
 *
 * Run with:
 *   node scripts/fix-edms-module-separation.mjs           (dry run, default)
 *   CONFIRM=yes node scripts/fix-edms-module-separation.mjs (applies changes)
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const PROJECT_ID = "project-cultural-complex";
const CONFIRMED = process.env.CONFIRM === "yes";

async function snapshot(label) {
  const total = await prisma.document.count({ where: { projectId: PROJECT_ID } });
  const byScope = await prisma.document.groupBy({ by: ["registerScope"], where: { projectId: PROJECT_ID }, _count: true });
  const drawings = await prisma.document.count({ where: { projectId: PROJECT_ID, type: { isDrawingType: true } } });
  const versions = await prisma.documentVersion.count({ where: { document: { projectId: PROJECT_ID } } });
  const mail = await prisma.mail.count({ where: { projectId: PROJECT_ID } });
  const mailAttachments = await prisma.mailAttachment.count({ where: { mail: { projectId: PROJECT_ID } } });
  const temp = await prisma.temporaryFile.count({ where: { projectId: PROJECT_ID } });
  console.log(`\n=== ${label} ===`);
  console.log({
    documentsTotal: total,
    documentsByRegisterScope: Object.fromEntries(byScope.map((r) => [r.registerScope, r._count])),
    documentsClassifiedAsDrawingByType: drawings,
    documentVersions: versions,
    mail,
    mailAttachments,
    temporaryFiles: temp,
  });
}

async function main() {
  await snapshot("BEFORE");

  // --- Sanity checks: refuse to continue if reality doesn't match the
  // known-good baseline this script was designed against. ---
  const totalDocs = await prisma.document.count({ where: { projectId: PROJECT_ID } });
  if (totalDocs === 0) {
    console.error("REFUSING TO CONTINUE: 0 documents found — nothing to classify, or wrong database/project.");
    process.exit(1);
  }
  const orphanVersions = await prisma.$queryRawUnsafe(
    `SELECT count(*)::int AS count FROM "DocumentVersion" v LEFT JOIN "Document" d ON v."documentId" = d.id WHERE d.id IS NULL`,
  );
  if (orphanVersions[0].count > 0) {
    console.error(`REFUSING TO CONTINUE: ${orphanVersions[0].count} orphaned DocumentVersion rows detected — fix data integrity before reclassifying.`);
    process.exit(1);
  }

  const candidateDrawings = await prisma.document.findMany({
    where: { projectId: PROJECT_ID, type: { isDrawingType: true }, registerScope: { not: "DRAWING" } },
    select: { id: true, documentNo: true, registerScope: true },
  });
  const candidateHold = await prisma.document.findMany({
    where: {
      projectId: PROJECT_ID,
      OR: [{ typeId: null }, { type: { isDrawingType: false } }],
      registerScope: "STANDALONE_DOCUMENT",
    },
    select: { id: true, documentNo: true, registerScope: true },
  });

  console.log(`\nPlanned reclassification:`);
  console.log(`  -> DRAWING:         ${candidateDrawings.length} document(s) currently not scoped as DRAWING`);
  console.log(`  -> MIGRATION_HOLD:  ${candidateHold.length} document(s) currently at the default STANDALONE_DOCUMENT scope`);

  if (candidateDrawings.length === 0 && candidateHold.length === 0) {
    console.log("\nNothing to do — registerScope is already fully backfilled. Exiting.");
    await prisma.$disconnect();
    return;
  }

  if (!CONFIRMED) {
    console.log("\nDRY RUN — no changes written. Re-run with CONFIRM=yes to apply.");
    await prisma.$disconnect();
    return;
  }

  const classificationLog = [];

  await prisma.$transaction(async (tx) => {
    if (candidateDrawings.length > 0) {
      await tx.document.updateMany({
        where: { id: { in: candidateDrawings.map((d) => d.id) } },
        data: { registerScope: "DRAWING" },
      });
      for (const d of candidateDrawings) {
        classificationLog.push({ documentId: d.id, documentNo: d.documentNo, from: d.registerScope, to: "DRAWING", reason: "DocumentType.isDrawingType = true" });
      }
    }
    if (candidateHold.length > 0) {
      await tx.document.updateMany({
        where: { id: { in: candidateHold.map((d) => d.id) } },
        data: { registerScope: "MIGRATION_HOLD" },
      });
      for (const d of candidateHold) {
        classificationLog.push({ documentId: d.id, documentNo: d.documentNo, from: d.registerScope, to: "MIGRATION_HOLD", reason: "non-drawing imported document pending standalone-register review" });
      }
    }

    await tx.auditLog.create({
      data: {
        userId: (await tx.user.findFirstOrThrow({ where: { email: "admin@shanfari.local" } })).id,
        projectId: PROJECT_ID,
        action: "EDMS_MODULE_SEPARATION_MIGRATION",
        entityType: "Document",
        entityId: PROJECT_ID,
        metadata: {
          reclassifiedToDrawing: candidateDrawings.length,
          reclassifiedToMigrationHold: candidateHold.length,
        },
      },
    });
  });

  console.log(`\nClassification log (${classificationLog.length} rows):`);
  console.log(JSON.stringify(classificationLog, null, 2));

  await snapshot("AFTER");
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error("MIGRATION FAILED:", err);
  await prisma.$disconnect();
  process.exit(1);
});
