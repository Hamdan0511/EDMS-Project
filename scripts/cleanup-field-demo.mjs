/**
 * Removes exactly the demonstration dataset created by
 * scripts/seed-field-demo.mjs — identified purely by the "DEMO — " title
 * prefix (and the demo document's known document number / temp file name)
 * — in dependency-safe order, including stored files on disk.
 *
 * Never touches non-demo records. Never uses `prisma migrate reset`.
 * Development-only: run directly with `node scripts/cleanup-field-demo.mjs`.
 */
import { chromium } from "playwright";
import { PrismaClient } from "@prisma/client";

const BASE = process.env.FIELD_DEMO_BASE_URL ?? "http://localhost:3001";
const ADMIN_EMAIL = "admin@shanfari.local";
const ADMIN_PASSWORD = "ChangeMe123!";
const DEMO_PREFIX = "DEMO — ";
const DEMO_DOCUMENT_NO = "SHF-CC-ARC-DRG-000124";

const prisma = new PrismaClient();

async function loginAsAdmin(browser) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(`${BASE}/login`);
  await page.fill('input[type="email"]', ADMIN_EMAIL);
  await page.fill('input[type="password"]', ADMIN_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE}/home`, { timeout: 15000 });
  return { ctx, page };
}

async function main() {
  console.log(`Cleaning up Field demo dataset (prefix "${DEMO_PREFIX}") against ${BASE} ...`);
  const browser = await chromium.launch();
  const { ctx, page } = await loginAsAdmin(browser);

  // 1. Demo photo attachments (cascades FieldPhoto automatically).
  const photoAttachments = await prisma.fieldAttachment.findMany({
    where: { recordType: "FieldPhoto", fileName: { startsWith: "DEMO" } },
  });
  for (const a of photoAttachments) await prisma.fieldAttachment.delete({ where: { id: a.id } });
  console.log("Deleted demo photo attachments (+cascaded FieldPhoto rows):", photoAttachments.length);

  // 2. Demo evidence attached directly to other records (e.g. the Observation).
  const otherAttachments = await prisma.fieldAttachment.findMany({
    where: { recordType: { not: "FieldPhoto" }, fileName: { startsWith: "DEMO" } },
  });
  for (const a of otherAttachments) await prisma.fieldAttachment.delete({ where: { id: a.id } });
  console.log("Deleted other demo evidence attachments:", otherAttachments.length);

  // 3. Issue (no demo punchlist-issue links exist, so this is a direct delete).
  const issues = await prisma.fieldIssue.deleteMany({ where: { title: { startsWith: DEMO_PREFIX } } });
  console.log("Deleted demo issues:", issues.count);

  // 4. Inspections (cascades their responses) -> then templates (cascades groups/items).
  const templates = await prisma.fieldInspectionTemplate.findMany({ where: { name: { startsWith: DEMO_PREFIX } } });
  const inspections = await prisma.fieldInspection.deleteMany({ where: { templateId: { in: templates.map((t) => t.id) } } });
  console.log("Deleted demo inspections:", inspections.count);
  const deletedTemplates = await prisma.fieldInspectionTemplate.deleteMany({ where: { id: { in: templates.map((t) => t.id) } } });
  console.log("Deleted demo inspection templates:", deletedTemplates.count);

  // 5. Observation.
  const observations = await prisma.fieldObservation.deleteMany({ where: { title: { startsWith: DEMO_PREFIX } } });
  console.log("Deleted demo observations:", observations.count);

  // 6. Punch items -> punchlists.
  const punchItems = await prisma.fieldPunchItem.deleteMany({ where: { title: { startsWith: DEMO_PREFIX } } });
  console.log("Deleted demo punch items:", punchItems.count);
  const punchlists = await prisma.fieldPunchlist.deleteMany({ where: { title: { startsWith: DEMO_PREFIX } } });
  console.log("Deleted demo punchlists:", punchlists.count);

  // 7. ITP (cascades its items).
  const itps = await prisma.fieldItp.deleteMany({ where: { title: { startsWith: DEMO_PREFIX } } });
  console.log("Deleted demo ITPs:", itps.count);

  // 8. Test.
  const tests = await prisma.fieldTest.deleteMany({ where: { notes: { startsWith: DEMO_PREFIX } } });
  console.log("Deleted demo tests:", tests.count);

  // 9. Site Walk (safe now — nothing references it anymore).
  const walks = await prisma.fieldSiteWalk.deleteMany({ where: { purpose: { startsWith: DEMO_PREFIX } } });
  console.log("Deleted demo site walks:", walks.count);

  // 10. Site Areas, children first (self-referencing FK is NoAction/Restrict).
  const demoAreaNames = ["Lobby", "Zone A", "Ground Floor"]; // child -> parent order
  for (const name of demoAreaNames) {
    const deleted = await prisma.fieldArea.deleteMany({ where: { name } });
    console.log(`Deleted demo area "${name}":`, deleted.count);
  }

  // 11. Document — through the real API (handles version file cleanup + temp file unlink).
  const document = await prisma.document.findFirst({ where: { documentNo: DEMO_DOCUMENT_NO } });
  if (document) {
    const res = await page.request.delete(`${BASE}/api/documents/${document.id}`);
    if (!res.ok()) throw new Error(`Failed to delete demo document: ${await res.text()}`);
    console.log("Deleted demo document via real API:", document.id);
  } else {
    console.log("Demo document already absent.");
  }

  // 12. The now-orphaned (reset to TEMPORARY) temporary file + its stored PDF bytes.
  const tempFile = await prisma.temporaryFile.findFirst({ where: { originalFileName: "SHF-CC-ARC-DRG-000124.pdf" } });
  if (tempFile) {
    const res = await page.request.delete(`${BASE}/api/temporary-files/${tempFile.id}`);
    if (!res.ok()) throw new Error(`Failed to delete demo temporary file: ${await res.text()}`);
    console.log("Deleted demo temporary file via real API:", tempFile.id);
  } else {
    console.log("Demo temporary file already absent.");
  }

  // 13. FieldLookup rows (Observation/Issue Type, Punch Trade, Test Type) are
  // upserted-by-name, so the demo seed's "Quality"/"Ceiling & Partition"/
  // etc. values are real, shared rows — never deleted by name (a real
  // record could legitimately use the same name). Instead, only remove a
  // lookup if it now has ZERO references left across every relation that
  // could use it, which is only ever true once every record that could
  // have referenced it (demo or real) is already gone.
  const lookups = await prisma.fieldLookup.findMany({
    include: { _count: { select: { observations: true, issues: true, punchItems: true, tests: true } } },
  });
  const orphanedLookups = lookups.filter(
    (l) => l._count.observations === 0 && l._count.issues === 0 && l._count.punchItems === 0 && l._count.tests === 0,
  );
  if (orphanedLookups.length > 0) {
    await prisma.fieldLookup.deleteMany({ where: { id: { in: orphanedLookups.map((l) => l.id) } } });
  }
  console.log(
    "Deleted orphaned (zero-reference) FieldLookup rows:",
    orphanedLookups.length,
    orphanedLookups.length > 0 ? orphanedLookups.map((l) => `${l.kind}:${l.name}`) : "",
  );

  console.log("\n=== DEMO CLEANUP COMPLETE ===");
  await ctx.close();
  await browser.close();
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error("CLEANUP FAILED:", err);
    await prisma.$disconnect();
    process.exit(1);
  });
