/**
 * Real Aconex project data importer for Shanfari EDMS.
 *
 * Source of truth:
 *  - Metadata: "ExportDocs-20260912_11-27.xlsx" (Docs sheet), a genuine
 *    Aconex "Search Export To Excel" — 251 real project records.
 *  - Files: the Sep-12 export folder (251 files matching the metadata
 *    1:1), plus a smaller Sep-19 re-export folder that turned out (see
 *    .scratch/inspect-sep19.mjs) to be 158 byte-identical duplicates and
 *    exactly ONE genuine newer revision (OCC-STFC-NA-00-ID-DW-DE-SDG-1051,
 *    R1 -> R2), which is imported as a real second DocumentVersion.
 *
 * Idempotent: re-running skips any documentNo that already exists, and the
 * R2 revision step skips if that revision has already been added.
 *
 * Run with: node scripts/import-aconex.mjs
 */
import { PrismaClient } from "@prisma/client";
import ExcelJS from "exceljs";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const prisma = new PrismaClient();

const EXCEL_PATH = "C:/Users/Mohammed Hamdan/Desktop/ACONEX DOCUMENTS/ExportDocs-20260912_11-27.xlsx";
const SEP12_DIR = "C:/Users/Mohammed Hamdan/Desktop/ACONEX DOCUMENTS/SHANFARI FURNISHING -Cultural Complex-2026-09-12-11-29-11-818";
const SEP19_DIR = "C:/Users/Mohammed Hamdan/Downloads/SHANFARI FURNISHING -Cultural Complex-2026-09-19-21-26-04-592";
const PROJECT_ID = "project-cultural-complex";
const STORAGE_ROOT = path.join(process.cwd(), "storage");

// --- 9 filenames that don't follow the "{documentNo}-R{rev}.{ext}" or a
// clean full-title-substring pattern (real, messy source data — verified
// manually against meeting-number/date sequence and title abbreviations;
// see the final import report for the reasoning behind each). ---
const MANUAL_FILENAME_OVERRIDES = {
  "OCC-SHSM-F4-00-ID-CFS-GA-DDG-0054.pdf|0": "LH Plaza.pdf",
  "OCC-Mace-MA-SW-BC-MOM-0024|0": "260725 BIM LOD 400 BIM Coordination  Weekly Progress Review Meeting No. 24.pdf",
  "OCC-Mace-MA-SW-BC-MOM-0023|0": "260723 BIM LOD 400 BIM Coordination & Weekly Progress Meeting No. 23.pdf",
  "OCC-Mace-MA-SW-BC-MOM-0022|0": "260716 BIM LOD 400 BIM Coordination & Weekly Progress Meeting No. 22.pdf",
  "OCC-Mace-MA-SW-BC-MOM-0021|0": "260709 BIM LOD 400 BIM Coordination & Weekly Progress  Meeting No. 21.pdf",
  "OCC-Mace-MA-SW-BC-MOM-0020|0": "260702 BM LOD 400 BIM Coordination & Weekly Progress Meeting No. 20.pdf",
  "OCC-Mace-MA-SW-BC-MOM-0004|0": "260219~1.PDF",
  "SF-N-4010-VO|01": "SF-N-4010-VO-01.pdf",
  // Genuine ID discrepancy in the client's own source data (SP vs SF,
  // N-26 vs N026) — flagged for manual review in the report, imported
  // under the documentNo the Excel actually lists.
  "SP-N-26-4010|00": "SF-N026-4010.pdf",
};
const MANUAL_REVIEW_DOC_NUMBERS = new Set(["SP-N-26-4010"]);

const DRAWING_TYPE_NAMES = new Set(["Shop Drawing", "Design Drawing", "Plan"]);

const STATUS_MAP = {
  "Revise & Re-Submit": "REVISE_RESUBMIT",
  "No Objection With Comments": "NO_OBJECTION_WITH_COMMENTS",
  "For Action": "FOR_ACTION",
  "For Information": "FOR_INFORMATION",
  "No Objection": "NO_OBJECTION",
  "No Status": "NO_STATUS",
};

const REVIEW_STATUS_MAP = {
  "A - No Objection": "A_NO_OBJECTION",
  "B - No Objection with Comments": "B_NO_OBJECTION_WITH_COMMENTS",
  "C - Objection, Revise & Resubmit": "C_REVISE_RESUBMIT",
};

function copyIntoStorage(sourcePath, ext) {
  const key = `documents/${crypto.randomUUID()}.${ext}`;
  const fullPath = path.join(STORAGE_ROOT, key);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.copyFileSync(sourcePath, fullPath);
  const sizeBytes = fs.statSync(fullPath).size;
  return { storedPath: key, sizeBytes };
}

function normalize(s) {
  return (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

async function loadDocsSheet() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(EXCEL_PATH);
  const ws = wb.getWorksheet("Docs");
  const rows = [];
  for (let i = 12; i <= ws.rowCount; i++) {
    const v = ws.getRow(i).values;
    if (!v || v.length < 3) continue;
    const [, type, file, documentNo, title, revision, , originator, reviewStatus, , dateModified, status, functionalBreakdown, spatialBreakdown] = v;
    if (!documentNo) continue;
    rows.push({
      type: type ?? null,
      file: (file ?? "").toString().toLowerCase(),
      documentNo: String(documentNo),
      title: title ? String(title) : "(untitled)",
      revision: revision != null ? String(revision) : "0",
      originator: originator ?? null,
      reviewStatus: reviewStatus ?? null,
      dateModified: dateModified instanceof Date ? dateModified : dateModified ? new Date(dateModified) : null,
      status: status ?? null,
      functionalBreakdown: functionalBreakdown ?? null,
      spatialBreakdown: spatialBreakdown ?? null,
    });
  }
  return rows;
}

function resolveFile(row, sep12Files, remainingFiles) {
  const override = MANUAL_FILENAME_OVERRIDES[`${row.documentNo}|${row.revision}`];
  if (override) return override;

  const expected = `${row.documentNo}-R${row.revision}.${row.file}`.toLowerCase();
  const exact = sep12Files.find((f) => f.toLowerCase() === expected);
  if (exact) return exact;

  const prefixed = sep12Files.filter((f) => {
    const fl = f.toLowerCase();
    return fl.startsWith(`${row.documentNo}-r${row.revision}`.toLowerCase()) && fl.endsWith(`.${row.file}`);
  });
  if (prefixed.length === 1) return prefixed[0];

  const titleNorm = normalize(row.title);
  const byTitle = remainingFiles.filter((f) => {
    const fl = f.toLowerCase();
    return fl.endsWith(`.${row.file}`) && normalize(f).includes(titleNorm);
  });
  if (byTitle.length >= 1) return byTitle[0];

  return null;
}

async function ensureOrganizationAndUser(originatorName, stats) {
  const trimmed = (originatorName || "").trim();
  if (!trimmed || /^shanfari/i.test(trimmed)) {
    // The tenant's own organization — reuse the existing real org/admin
    // user rather than creating a duplicate "Shanfari" organization.
    const org = await prisma.organization.findUniqueOrThrow({ where: { id: "org-shanfari" } });
    const admin = await prisma.user.findFirstOrThrow({ where: { email: "admin@shanfari.local" } });
    return { organizationId: org.id, userId: admin.id };
  }

  let org = await prisma.organization.findFirst({ where: { name: { equals: trimmed, mode: "insensitive" } } });
  if (!org) {
    org = await prisma.organization.create({ data: { name: trimmed } });
    stats.organizationsCreated.push(trimmed);
  }

  let user = await prisma.user.findFirst({ where: { organizationId: org.id, accountType: "GUEST" } });
  if (!user) {
    const email = `aconex-import+${trimmed.toLowerCase().replace(/[^a-z0-9]+/g, "-")}@shanfari.local`;
    user = await prisma.user.create({
      data: {
        email,
        name: `${trimmed} (Aconex Import)`,
        organizationId: org.id,
        passwordHash: await bcrypt.hash(crypto.randomUUID(), 12),
        accountType: "GUEST",
        isActive: false,
      },
    });
    await prisma.projectMember.upsert({
      where: { projectId_userId: { projectId: PROJECT_ID, userId: user.id } },
      update: {},
      create: { projectId: PROJECT_ID, userId: user.id, organizationId: org.id, role: "VIEWER" },
    });
    stats.usersCreated.push(user.email);
  }

  return { organizationId: org.id, userId: user.id };
}

async function ensureDocumentType(typeName, stats) {
  if (!typeName || typeName === "No Document Type") return null;
  const isDrawingType = DRAWING_TYPE_NAMES.has(typeName);
  const existing = await prisma.documentType.findUnique({
    where: { projectId_name: { projectId: PROJECT_ID, name: typeName } },
  });
  if (existing) {
    if (existing.isDrawingType !== isDrawingType) {
      await prisma.documentType.update({ where: { id: existing.id }, data: { isDrawingType } });
      stats.typeFlagsCorrected.push(`${typeName} -> isDrawingType=${isDrawingType}`);
    }
    return existing.id;
  }
  const created = await prisma.documentType.create({ data: { projectId: PROJECT_ID, name: typeName, isDrawingType } });
  stats.typesCreated.push(typeName);
  return created.id;
}

async function main() {
  const stats = {
    excelRows: 0,
    matchedByExactPattern: 0,
    matchedManualOverride: 0,
    unmatchedRows: [],
    imported: 0,
    skippedAlreadyExists: 0,
    organizationsCreated: [],
    usersCreated: [],
    typesCreated: [],
    typeFlagsCorrected: [],
    statusUnmapped: [],
    reviewStatusBlank: 0,
    functionalBreakdownValues: new Set(),
    spatialBreakdownValues: new Set(),
    manualReviewDocs: [],
    revisionUpdateApplied: false,
  };

  const rows = await loadDocsSheet();
  stats.excelRows = rows.length;
  const sep12Files = fs.readdirSync(SEP12_DIR).filter((f) => fs.statSync(path.join(SEP12_DIR, f)).isFile());
  const usedFiles = new Set();

  for (const row of rows) {
    const remaining = sep12Files.filter((f) => !usedFiles.has(f));
    const file = resolveFile(row, sep12Files, remaining);
    if (!file) {
      stats.unmatchedRows.push(row.documentNo);
      continue;
    }
    usedFiles.add(file);

    if (MANUAL_REVIEW_DOC_NUMBERS.has(row.documentNo)) {
      stats.manualReviewDocs.push({ documentNo: row.documentNo, reason: "Document No in Excel does not match its filename convention (SP vs SF, N-26 vs N026) — verified by elimination, not an exact ID match." });
    }

    const existing = await prisma.document.findUnique({
      where: { projectId_documentNo: { projectId: PROJECT_ID, documentNo: row.documentNo } },
    });
    if (existing) {
      stats.skippedAlreadyExists++;
      continue;
    }

    const { organizationId, userId } = await ensureOrganizationAndUser(row.originator, stats);
    const typeId = await ensureDocumentType(row.type, stats);

    const statusValue = row.status ? STATUS_MAP[row.status] : null;
    if (row.status && !statusValue) stats.statusUnmapped.push(row.status);
    const reviewStatusValue = row.reviewStatus ? REVIEW_STATUS_MAP[row.reviewStatus] ?? null : null;
    if (!row.reviewStatus) stats.reviewStatusBlank++;

    if (row.functionalBreakdown) stats.functionalBreakdownValues.add(row.functionalBreakdown);
    if (row.spatialBreakdown) stats.spatialBreakdownValues.add(row.spatialBreakdown);

    const sourcePath = path.join(SEP12_DIR, file);
    const ext = path.extname(file).slice(1).toLowerCase();
    const mimeType = ext === "pdf" ? "application/pdf" : ext === "dwg" ? "application/acad" : "application/octet-stream";
    const { storedPath, sizeBytes } = copyIntoStorage(sourcePath, ext);
    const importDate = row.dateModified && !isNaN(row.dateModified.getTime()) ? row.dateModified : new Date();

    await prisma.document.create({
      data: {
        projectId: PROJECT_ID,
        documentNo: row.documentNo,
        title: row.title,
        typeId,
        status: statusValue ?? "NO_STATUS",
        reviewStatus: reviewStatusValue,
        functionalBreakdown: row.functionalBreakdown || null,
        spatialBreakdown: row.spatialBreakdown || null,
        currentRevision: row.revision,
        createdById: userId,
        createdAt: importDate,
        versions: {
          create: {
            revision: row.revision,
            versionNo: 1,
            fileName: file,
            storedPath,
            mimeType,
            sizeBytes,
            uploadedById: userId,
            uploadedAt: importDate,
          },
        },
      },
    });
    // createdBy.organization is derived through the user, but keep the
    // resolved organizationId around for the report even though the
    // Document model itself has no direct organization FK.
    void organizationId;
    stats.imported++;
  }

  // --- The one genuine Sep-19 revision update (1051: R1 -> R2) ---
  const target = await prisma.document.findUnique({
    where: { projectId_documentNo: { projectId: PROJECT_ID, documentNo: "OCC-STFC-NA-00-ID-DW-DE-SDG-1051.pdf" } },
    include: { versions: true },
  });
  if (target && !target.versions.some((v) => v.revision === "2")) {
    const sep19File = "OCC-STFC-NA-00-ID-DW-DE-SDG-1051.pdf-R2.pdf";
    const sep19Path = path.join(SEP19_DIR, sep19File);
    if (fs.existsSync(sep19Path)) {
      const { storedPath, sizeBytes } = copyIntoStorage(sep19Path, "pdf");
      const mtime = fs.statSync(sep19Path).mtime;
      await prisma.$transaction([
        prisma.documentVersion.create({
          data: {
            documentId: target.id,
            revision: "2",
            versionNo: (target.versions[0]?.versionNo ?? 1) + 1,
            fileName: sep19File,
            storedPath,
            mimeType: "application/pdf",
            sizeBytes,
            uploadedById: target.createdById,
            uploadedAt: mtime,
          },
        }),
        prisma.document.update({ where: { id: target.id }, data: { currentRevision: "2" } }),
      ]);
      stats.revisionUpdateApplied = true;
    }
  }

  // --- Real distinct Functional/Spatial Breakdown values -> master data ---
  for (const name of stats.functionalBreakdownValues) {
    await prisma.documentMetadataOption.upsert({
      where: { projectId_category_name: { projectId: PROJECT_ID, category: "FUNCTIONAL_BREAKDOWN", name } },
      update: {},
      create: { projectId: PROJECT_ID, category: "FUNCTIONAL_BREAKDOWN", name },
    });
  }
  for (const name of stats.spatialBreakdownValues) {
    await prisma.documentMetadataOption.upsert({
      where: { projectId_category_name: { projectId: PROJECT_ID, category: "SPATIAL_BREAKDOWN", name } },
      update: {},
      create: { projectId: PROJECT_ID, category: "SPATIAL_BREAKDOWN", name },
    });
  }

  if (stats.imported > 0 || stats.revisionUpdateApplied) {
    const admin = await prisma.user.findFirstOrThrow({ where: { email: "admin@shanfari.local" } });
    await prisma.auditLog.create({
      data: {
        userId: admin.id,
        projectId: PROJECT_ID,
        action: "ACONEX_IMPORT_COMPLETED",
        entityType: "Document",
        entityId: PROJECT_ID,
        metadata: {
          documentsImported: stats.imported,
          alreadyPresent: stats.skippedAlreadyExists,
          revisionUpdateApplied: stats.revisionUpdateApplied,
          source: "ExportDocs-20260912_11-27.xlsx",
        },
      },
    });
  }

  console.log(JSON.stringify({
    ...stats,
    functionalBreakdownValues: [...stats.functionalBreakdownValues],
    spatialBreakdownValues: [...stats.spatialBreakdownValues],
  }, null, 2));

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error("IMPORT FAILED:", err);
  await prisma.$disconnect();
  process.exit(1);
});
