/**
 * Imports the real Phase 1 Management System document library
 * (phase2-assets/management-system-documents/) and the 3 real ISO
 * certificates (phase2-assets/iso-certificates/) into the application
 * through the real HTTP API — the same path a real document controller
 * would use. Never fabricates documents; only imports what's actually on
 * disk, and skips any file whose checksum already exists (handled
 * server-side).
 *
 * Usage: node scripts/import-management-system-documents.mjs
 */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import JSZip from "jszip";
import { QUALITY_TITLES, HSE_TITLES, documentTypeFor } from "./management-system-import-data.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSETS_ROOT = path.join(__dirname, "..", "phase2-assets");
const BASE = process.env.FIELD_DEMO_BASE_URL ?? "http://localhost:3001";
const ADMIN_EMAIL = "admin@shanfari.local";
const ADMIN_PASSWORD = "ChangeMe123!";
const PROJECT_ID = "project-cultural-complex";

async function extractDocxCreatedDate(buffer) {
  try {
    const zip = await JSZip.loadAsync(buffer);
    const coreXml = await zip.file("docProps/core.xml")?.async("string");
    if (!coreXml) return null;
    const match = coreXml.match(/<dcterms:created[^>]*>([^<]+)<\/dcterms:created>/);
    if (!match) return null;
    const date = new Date(match[1]);
    return Number.isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}

function parseDocumentNo(fileName) {
  const match = fileName.match(/^((?:QU|HS)-[A-Z]+-\d+(?:_\d+)?)/);
  return match ? match[1] : null;
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

async function importFolder(page, folder, titles, managementSystem, documentOwner) {
  const dir = path.join(ASSETS_ROOT, "management-system-documents", folder);
  const files = fs.readdirSync(dir).filter((f) => f.toLowerCase().endsWith(".docx"));
  const results = { created: 0, skipped: 0, failed: [] };

  for (const fileName of files) {
    const documentNo = parseDocumentNo(fileName);
    const title = documentNo ? titles[documentNo] : undefined;
    if (!documentNo || !title) {
      results.failed.push(`${fileName}: could not resolve a known document number/title`);
      continue;
    }

    const filePath = path.join(dir, fileName);
    const buffer = fs.readFileSync(filePath);
    const createdDate = await extractDocxCreatedDate(buffer);
    const documentType = documentTypeFor(documentNo);

    const res = await page.request.post(`${BASE}/api/management-system/documents`, {
      multipart: {
        projectId: PROJECT_ID,
        documentNo,
        title,
        managementSystem,
        documentType,
        revision: "01",
        ...(createdDate ? { documentDate: createdDate.toISOString().slice(0, 10) } : {}),
        documentOwner,
        file: { name: fileName, mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", buffer },
      },
    });
    const body = await res.json().catch(() => ({}));
    if (res.ok()) {
      console.log(`  [OK]   ${documentNo}  ${title}`);
      results.created++;
    } else if (res.status() === 400 && /already in use|duplicate checksum/i.test(body.error ?? "")) {
      console.log(`  [SKIP] ${documentNo}  (${body.error})`);
      results.skipped++;
    } else {
      console.log(`  [FAIL] ${documentNo}  ${body.error ?? res.status()}`);
      results.failed.push(`${documentNo}: ${body.error ?? res.status()}`);
    }
  }
  return results;
}

async function importCertificates(page) {
  const dir = path.join(ASSETS_ROOT, "iso-certificates");
  const mapping = [
    { match: /9001/, managementSystem: "QUALITY" },
    { match: /14001/, managementSystem: "ENVIRONMENT" },
    { match: /45001/, managementSystem: "HSE" },
  ];
  const files = fs.readdirSync(dir).filter((f) => f.toLowerCase().endsWith(".pdf"));
  for (const fileName of files) {
    const rule = mapping.find((m) => m.match.test(fileName));
    if (!rule) {
      console.log(`  [SKIP] ${fileName} — could not map to a management system`);
      continue;
    }
    const buffer = fs.readFileSync(path.join(dir, fileName));
    const res = await page.request.post(`${BASE}/api/management-system/certificates`, {
      multipart: {
        projectId: PROJECT_ID,
        managementSystem: rule.managementSystem,
        file: { name: fileName, mimeType: "application/pdf", buffer },
      },
    });
    const body = await res.json().catch(() => ({}));
    if (res.ok()) {
      console.log(`  [OK]   ${rule.managementSystem}  ${fileName}`);
    } else {
      console.log(`  [FAIL] ${rule.managementSystem}  ${body.error ?? res.status()}`);
    }
  }
}

async function main() {
  console.log(`Importing Management System documents against ${BASE} ...`);
  const browser = await chromium.launch();
  const { ctx, page } = await loginAsAdmin(browser);

  console.log("\n-- Quality --");
  const quality = await importFolder(page, "01_SHANFARI_QUALITY", QUALITY_TITLES, "QUALITY", "QA/QC");
  console.log("\n-- Health & Safety --");
  const hse = await importFolder(page, "02_SHANFARI_HSE", HSE_TITLES, "HSE", "HSE");
  console.log("\n-- ISO Certificates --");
  await importCertificates(page);

  console.log("\n=== IMPORT SUMMARY ===");
  console.log("Quality:", quality);
  console.log("HSE:", hse);

  await ctx.close();
  await browser.close();
}

main().catch((err) => {
  console.error("IMPORT FAILED:", err);
  process.exit(1);
});
