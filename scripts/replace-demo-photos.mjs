/**
 * Replaces the Field demo's photographic evidence with real, realistic
 * construction-site photographs (stored as actual JPEG files under
 * scripts/demo-assets/), without touching anything else in the demo chain
 * (Document, Observation, Inspection, Issue, Punch, ITP, Test, Site Walk
 * all keep their existing IDs and relationships).
 *
 * 1. Deletes the old demo photo attachments (the previous SVG-based
 *    illustration) — both the gallery copies and the evidence copy
 *    attached directly to the Observation.
 * 2. Uploads 3 real JPEGs (Overview / Close-up / Location-context) to the
 *    real Photo gallery, scoped to the existing demo Lobby area.
 * 3. Attaches evidence copies to the existing demo Observation (all 3) and
 *    to the existing demo Issue (the close-up, as "Before" evidence).
 *
 * Usage: node scripts/replace-demo-photos.mjs
 */
import { chromium } from "playwright";
import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.FIELD_DEMO_BASE_URL ?? "http://localhost:3001";
const ADMIN_EMAIL = "admin@shanfari.local";
const ADMIN_PASSWORD = "ChangeMe123!";

const prisma = new PrismaClient();

function iso(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

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
  console.log(`Replacing Field demo photos against ${BASE} ...`);

  const observation = await prisma.fieldObservation.findFirst({ where: { title: { startsWith: "DEMO" } } });
  const issue = await prisma.fieldIssue.findFirst({ where: { title: { startsWith: "DEMO" } } });
  const area = await prisma.fieldArea.findFirst({ where: { name: "Lobby" } });
  if (!observation) throw new Error("Demo observation not found — run scripts/seed-field-demo.mjs first.");
  if (!issue) throw new Error("Demo issue not found.");
  if (!area) throw new Error("Demo Lobby area not found.");

  const browser = await chromium.launch();
  const { ctx, page } = await loginAsAdmin(browser);

  // --- 1. Remove the old (SVG-based) demo photo evidence ----------------
  const oldPhotoAttachments = await prisma.fieldAttachment.findMany({
    where: { recordType: "FieldPhoto", fileName: { startsWith: "DEMO" } },
  });
  for (const a of oldPhotoAttachments) await prisma.fieldAttachment.delete({ where: { id: a.id } }); // cascades FieldPhoto
  console.log("Removed old demo gallery photos (+cascaded FieldPhoto rows):", oldPhotoAttachments.length);

  const oldObservationEvidence = await prisma.fieldAttachment.findMany({
    where: { recordType: "FieldObservation", recordId: observation.id, fileName: { startsWith: "DEMO" } },
  });
  for (const a of oldObservationEvidence) await prisma.fieldAttachment.delete({ where: { id: a.id } });
  console.log("Removed old demo observation evidence:", oldObservationEvidence.length);

  const oldIssueEvidence = await prisma.fieldAttachment.findMany({
    where: { recordType: "FieldIssue", recordId: issue.id, fileName: { startsWith: "DEMO" } },
  });
  for (const a of oldIssueEvidence) await prisma.fieldAttachment.delete({ where: { id: a.id } });
  console.log("Removed old demo issue evidence:", oldIssueEvidence.length);

  // --- 2. Upload the 3 real photos to the gallery -------------------------
  const photos = [
    {
      file: "ceiling-overview.jpg",
      fileName: "DEMO - ceiling-framing-overview-lobby-entrance-corridor.jpg",
      category: "Quality",
      capturedAt: iso(2),
    },
    {
      file: "ceiling-closeup-measurement.jpg",
      fileName: "DEMO - closeup-6mm-frame-offset-measurement.jpg",
      category: "Defect",
      capturedAt: iso(2),
    },
    {
      file: "ceiling-location-lobby-corridor.jpg",
      fileName: "DEMO - lobby-entrance-corridor-affected-zone.jpg",
      category: "Inspection",
      capturedAt: iso(1),
    },
  ];

  const uploaded = [];
  for (const p of photos) {
    const buffer = fs.readFileSync(path.join(__dirname, "demo-assets", p.file));
    const res = await page.request.post(`${BASE}/api/field/photos`, {
      multipart: {
        projectId: observation.projectId,
        areaId: area.id,
        category: p.category,
        capturedAt: p.capturedAt,
        file: { name: p.fileName, mimeType: "image/jpeg", buffer },
      },
    });
    const body = await res.json();
    if (!res.ok()) throw new Error(`Upload failed for ${p.file}: ${JSON.stringify(body)}`);
    console.log("Uploaded gallery photo:", p.fileName, "->", body.id);
    uploaded.push({ ...p, photoId: body.id, buffer });
  }

  // --- 3. Attach evidence copies to the Observation (all 3) ---------------
  for (const p of uploaded) {
    const res = await page.request.post(`${BASE}/api/field/attachments`, {
      multipart: {
        recordType: "FieldObservation",
        recordId: observation.id,
        category: p.category,
        file: { name: p.fileName, mimeType: "image/jpeg", buffer: p.buffer },
      },
    });
    if (!res.ok()) throw new Error(`Observation evidence attach failed for ${p.file}: ${await res.text()}`);
  }
  console.log("Attached all 3 photos as evidence on the demo Observation.");

  // --- 4. Attach the close-up as "Before" evidence on the Issue -----------
  const closeup = uploaded.find((p) => p.file === "ceiling-closeup-measurement.jpg");
  const issueEvidenceRes = await page.request.post(`${BASE}/api/field/attachments`, {
    multipart: {
      recordType: "FieldIssue",
      recordId: issue.id,
      category: "Before",
      file: { name: closeup.fileName, mimeType: "image/jpeg", buffer: closeup.buffer },
    },
  });
  if (!issueEvidenceRes.ok()) throw new Error(`Issue evidence attach failed: ${await issueEvidenceRes.text()}`);
  console.log("Attached close-up photo as 'Before' evidence on the demo Issue.");

  console.log("\n=== DEMO PHOTO REPLACEMENT COMPLETE ===");
  await ctx.close();
  await browser.close();
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error("REPLACEMENT FAILED:", err);
    await prisma.$disconnect();
    process.exit(1);
  });
