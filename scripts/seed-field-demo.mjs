/**
 * Seeds one small, fully interconnected demonstration dataset for the Field
 * module: a real Document (with a real generated PDF) -> Observation ->
 * Inspection (one failed item) -> Issue (from that failure) -> Punch Item
 * -> ITP (with an active hold point) -> Test -> Photos -> Site Walk.
 *
 * Every record is created through the real HTTP API (same routes, RBAC,
 * audit logging, and state machines a real user goes through) — nothing is
 * written directly to the database except read-only lookups used to
 * discover IDs (e.g. inspection response IDs) between API calls.
 *
 * Every human-readable title/purpose is prefixed "DEMO — " so
 * scripts/cleanup-field-demo.mjs can find and remove exactly these records
 * later, and nothing else.
 *
 * Usage: node scripts/seed-field-demo.mjs
 * Requires the dev server running at http://localhost:3001 and a seeded DB.
 */
import { chromium } from "playwright";
import { PrismaClient } from "@prisma/client";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const BASE = process.env.FIELD_DEMO_BASE_URL ?? "http://localhost:3001";
const PROJECT_ID = "project-cultural-complex";
const ADMIN_EMAIL = "admin@shanfari.local";
const ADMIN_PASSWORD = "ChangeMe123!";
const CONTRACTOR_USER_ID = "cmud2d27f00s943u4ee5pk6uc"; // Packiaraj Arumugam, BAHWAN ENGINEERING COMPANY LLC
const CONTRACTOR_ORG_ID = "cmud2d1zs00s743u41mbhoaqu"; // BAHWAN ENGINEERING COMPANY LLC

const prisma = new PrismaClient();

function iso(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

async function buildDemoPdf() {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 842]); // A4 portrait
  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const brand = rgb(0.33, 0.24, 0.15);
  const muted = rgb(0.44, 0.41, 0.37);

  let y = 780;
  const line = (text, { size = 11, f = regular, color = rgb(0.1, 0.1, 0.1), gap = 22 } = {}) => {
    page.drawText(text, { x: 56, y, size, font: f, color });
    y -= gap;
  };

  line("SHANFARI FURNISHING", { size: 16, f: font, color: brand, gap: 26 });
  line("Cultural Complex", { size: 12, color: muted, gap: 34 });
  line("Ground Floor Ceiling Coordination Drawing", { size: 14, f: font, gap: 24 });
  line("Drawing No: SHF-CC-ARC-DRG-000124", { gap: 18 });
  line("Revision: A", { gap: 18 });
  line("Discipline: Architectural", { gap: 18 });
  line("Status: For Construction", { gap: 34 });

  page.drawLine({ start: { x: 56, y: y + 10 }, end: { x: 539, y: y + 10 }, thickness: 1, color: rgb(0.87, 0.85, 0.78) });
  y -= 10;

  line("Scope of Works", { size: 12, f: font, gap: 20 });
  line("Ground floor lobby suspended ceiling framing, panel installation, and", { size: 10, color: muted, gap: 14 });
  line("coordination with mechanical/electrical services at Zone A, Lobby.", { size: 10, color: muted, gap: 14 });
  line("Framing tolerance: +/- 3mm over any 3m run. Refer to RCP for setting-out.", { size: 10, color: muted, gap: 30 });

  // Simple coordination sketch: a room outline with a grid + a flagged zone.
  const ox = 120, oy = y - 260, w = 340, h = 220;
  page.drawRectangle({ x: ox, y: oy, width: w, height: h, borderColor: rgb(0.44, 0.41, 0.37), borderWidth: 1.2 });
  for (let gx = ox + 40; gx < ox + w; gx += 40) {
    page.drawLine({ start: { x: gx, y: oy }, end: { x: gx, y: oy + h }, thickness: 0.5, color: rgb(0.85, 0.83, 0.78) });
  }
  for (let gy = oy + 40; gy < oy + h; gy += 40) {
    page.drawLine({ start: { x: ox, y: gy }, end: { x: ox + w, y: gy }, thickness: 0.5, color: rgb(0.85, 0.83, 0.78) });
  }
  // Flagged misalignment zone near the lobby entrance.
  page.drawEllipse({ x: ox + 260, y: oy + 150, xScale: 16, yScale: 16, borderColor: rgb(0.76, 0.2, 0.18), borderWidth: 1.5 });
  page.drawText("A", { x: ox + 256, y: oy + 145, size: 10, font, color: rgb(0.76, 0.2, 0.18) });
  page.drawText("Ground Floor — Zone A — Lobby (Reflected Ceiling Plan, indicative)", {
    x: ox, y: oy - 16, size: 9, font: regular, color: muted,
  });

  page.drawText("DEMONSTRATION DOCUMENT — NOT FOR CONSTRUCTION", {
    x: 56, y: 40, size: 9, font, color: rgb(0.76, 0.2, 0.18),
  });

  return doc.save();
}

function demoPhotoSvg(title, subtitle, accent) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 640 480">
    <rect width="640" height="480" fill="#f3efe6"/>
    <rect x="24" y="24" width="592" height="432" fill="#ffffff" stroke="#ded6c8" stroke-width="2"/>
    <rect x="60" y="70" width="520" height="260" fill="#e9e4d8" stroke="#c9c0ae" stroke-width="1.5"/>
    <g stroke="#c9c0ae" stroke-width="1">
      ${Array.from({ length: 12 }, (_, i) => `<line x1="${60 + i * 43.3}" y1="70" x2="${60 + i * 43.3}" y2="330"/>`).join("")}
      ${Array.from({ length: 6 }, (_, i) => `<line x1="60" y1="${70 + i * 43.3}" x2="580" y2="${70 + i * 43.3}"/>`).join("")}
    </g>
    <circle cx="430" cy="200" r="22" fill="none" stroke="${accent}" stroke-width="3"/>
    <line x1="430" y1="178" x2="430" y2="222" stroke="${accent}" stroke-width="3"/>
    <line x1="408" y1="200" x2="452" y2="200" stroke="${accent}" stroke-width="3"/>
    <text x="56" y="365" font-family="Arial, sans-serif" font-size="20" font-weight="700" fill="#2b2620">${title}</text>
    <text x="56" y="390" font-family="Arial, sans-serif" font-size="13" fill="#71695f">${subtitle}</text>
    <text x="56" y="440" font-family="Arial, sans-serif" font-size="11" fill="#a39a86">DEMONSTRATION PHOTO — Shanfari IMS Field Module</text>
  </svg>`;
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

async function postJson(page, path, data) {
  const res = await page.request.post(`${BASE}${path}`, { data });
  const body = await res.json().catch(() => ({}));
  if (!res.ok()) throw new Error(`POST ${path} failed (${res.status()}): ${JSON.stringify(body)}`);
  return body;
}

async function patchJson(page, path, data) {
  const res = await page.request.patch(`${BASE}${path}`, { data });
  const body = await res.json().catch(() => ({}));
  if (!res.ok()) throw new Error(`PATCH ${path} failed (${res.status()}): ${JSON.stringify(body)}`);
  return body;
}

async function main() {
  console.log(`Seeding Field demo dataset against ${BASE} ...`);
  const browser = await chromium.launch();
  const { ctx, page } = await loginAsAdmin(browser);
  const adminUser = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });

  const ids = {};

  // --- 1. Site Area hierarchy -------------------------------------------------
  const groundFloor = await postJson(page, "/api/field/areas", { projectId: PROJECT_ID, name: "Ground Floor", levelType: "Floor" });
  const zoneA = await postJson(page, "/api/field/areas", { projectId: PROJECT_ID, name: "Zone A", parentId: groundFloor.id, levelType: "Zone" });
  const lobby = await postJson(page, "/api/field/areas", { projectId: PROJECT_ID, name: "Lobby", parentId: zoneA.id, levelType: "Room" });
  ids.areaIds = [groundFloor.id, zoneA.id, lobby.id];
  console.log("Areas:", groundFloor.id, zoneA.id, lobby.id);

  // --- 2. Demo document (real PDF, registered through the real upload flow) --
  const pdfBytes = await buildDemoPdf();
  const tempUploadRes = await page.request.post(`${BASE}/api/temporary-files`, {
    multipart: { projectId: PROJECT_ID, file: { name: "SHF-CC-ARC-DRG-000124.pdf", mimeType: "application/pdf", buffer: Buffer.from(pdfBytes) } },
  });
  const tempFile = await tempUploadRes.json();
  if (!tempUploadRes.ok()) throw new Error(`temp upload failed: ${JSON.stringify(tempFile)}`);

  const document = await postJson(page, `/api/temporary-files/${tempFile.id}/register`, {
    documentNo: "SHF-CC-ARC-DRG-000124",
    title: "DEMO — Ground Floor Ceiling Coordination Drawing",
    revision: "A",
    typeName: "Drawing",
    discipline: "Architectural",
    reviewStatus: "A_NO_OBJECTION",
  });
  await patchJson(page, `/api/documents/${document.id}`, { status: "APPROVED" });
  ids.documentId = document.id;
  console.log("Document:", document.id, document.documentNo);

  // --- 3. Site Walk (started first so captured records tag to it, like a real walk) --
  const walk = await postJson(page, "/api/field/site-walks", {
    projectId: PROJECT_ID,
    purpose: "DEMO — Ground Floor Ceiling Coordination Walk",
    areaId: lobby.id,
  });
  ids.siteWalkId = walk.id;
  console.log("Site Walk:", walk.id);

  // --- 4. Site Observation (+ document link + evidence photo) ----------------
  const observation = await postJson(page, "/api/field/observations", {
    projectId: PROJECT_ID,
    areaId: lobby.id,
    siteWalkId: walk.id,
    typeName: "Quality",
    priority: "HIGH",
    responsibleUserId: CONTRACTOR_USER_ID,
    title: "DEMO — Ceiling frame misalignment",
    description:
      "Ceiling frame alignment is inconsistent with drawing SHF-CC-ARC-DRG-000124 Rev A. Frames are offset by approximately 6mm across the lobby entrance corridor.",
    dueDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
  });
  ids.observationId = observation.id;
  console.log("Observation:", observation.id, observation.observationNumber);

  await postJson(page, "/api/field/document-references", {
    recordType: "FieldObservation",
    recordId: observation.id,
    documentId: document.id,
  });

  const photo1Svg = demoPhotoSvg("Ceiling Frame Misalignment", "Ground Floor — Zone A — Lobby", "#c23327");
  const photo1Res = await page.request.post(`${BASE}/api/field/photos`, {
    multipart: {
      projectId: PROJECT_ID,
      areaId: lobby.id,
      siteWalkId: walk.id,
      category: "Defect",
      capturedAt: iso(2),
      file: { name: "DEMO - ceiling-frame-misalignment.svg", mimeType: "image/svg+xml", buffer: Buffer.from(photo1Svg) },
    },
  });
  const photo1 = await photo1Res.json();
  if (!photo1Res.ok()) throw new Error(`photo1 upload failed: ${JSON.stringify(photo1)}`);
  ids.photoIds = [photo1.id];
  console.log("Photo (gallery):", photo1.id);

  const evidenceRes = await page.request.post(`${BASE}/api/field/attachments`, {
    multipart: {
      recordType: "FieldObservation",
      recordId: observation.id,
      category: "Defect",
      file: { name: "DEMO - ceiling-frame-misalignment.svg", mimeType: "image/svg+xml", buffer: Buffer.from(photo1Svg) },
    },
  });
  if (!evidenceRes.ok()) throw new Error(`observation evidence upload failed: ${await evidenceRes.text()}`);
  console.log("Evidence attached to observation.");

  // --- 5. Quality Inspection (one FAIL, demonstrating the real workflow) -----
  const template = await postJson(page, "/api/field/inspection-templates", {
    projectId: PROJECT_ID,
    name: "DEMO — Ceiling Installation QA Checklist",
    description: "Demonstration checklist for suspended ceiling framing and panel installation.",
    groups: [
      { name: "Material", items: [{ label: "Material approved", responseType: "PASS_FAIL", isMandatory: true }] },
      {
        name: "Installation",
        items: [
          { label: "Installation correct", responseType: "PASS_FAIL", isMandatory: true },
          { label: "Alignment", responseType: "PASS_FAIL", isMandatory: true },
          { label: "Fixings", responseType: "PASS_FAIL", isMandatory: true },
        ],
      },
    ],
  });
  ids.inspectionTemplateId = template.id;
  console.log("Inspection Template:", template.id);

  const inspection = await postJson(page, "/api/field/inspections", {
    projectId: PROJECT_ID,
    templateId: template.id,
    areaId: lobby.id,
    assigneeId: CONTRACTOR_USER_ID,
    inspectorId: adminUser.id,
    dueDate: iso(-2),
  });
  ids.inspectionId = inspection.id;
  console.log("Inspection:", inspection.id, inspection.inspectionNumber);

  // Read-only lookup to map checklist labels -> real response row IDs.
  const responses = await prisma.fieldInspectionResponse.findMany({ where: { inspectionId: inspection.id } });
  const byLabel = Object.fromEntries(responses.map((r) => [r.label, r]));

  await patchJson(page, `/api/field/inspections/${inspection.id}/responses`, {
    responses: [
      { responseId: byLabel["Material approved"].id, result: "PASS" },
      { responseId: byLabel["Installation correct"].id, result: "PASS" },
      {
        responseId: byLabel["Alignment"].id,
        result: "FAIL",
        note: "Frame alignment deviates ~6mm from drawing SHF-CC-ARC-DRG-000124 Rev A at the lobby entrance corridor.",
      },
      { responseId: byLabel["Fixings"].id, result: "PASS" },
    ],
  });
  const submitted = await postJson(page, `/api/field/inspections/${inspection.id}/submit`, {});
  console.log("Inspection submitted, result:", submitted.status);

  const alignmentResponse = byLabel["Alignment"];

  // --- 6. Site Issue (created from the failed checklist item) ---------------
  const issue = await postJson(page, "/api/field/issues", {
    projectId: PROJECT_ID,
    areaId: lobby.id,
    siteWalkId: walk.id,
    title: "DEMO — Ceiling frame alignment non-conformance",
    description:
      'Failed checklist item "Alignment" on inspection ' +
      inspection.inspectionNumber +
      ". Frame alignment deviates ~6mm from drawing SHF-CC-ARC-DRG-000124 Rev A. Rework required before panel fixing proceeds.",
    typeName: "Quality",
    priority: "HIGH",
    responsibleUserId: CONTRACTOR_USER_ID,
    dueDate: iso(-5),
    sourceType: "FieldInspectionResponse",
    sourceId: alignmentResponse.id,
  });
  ids.issueId = issue.id;
  console.log("Issue:", issue.id, issue.issueNumber, "(auto-status: ASSIGNED)");

  await patchJson(page, `/api/field/issues/${issue.id}`, { status: "IN_PROGRESS" });
  console.log("Issue transitioned to IN_PROGRESS.");

  // --- 7. Punch Item ----------------------------------------------------------
  const punchlist = await postJson(page, "/api/field/punchlists", {
    projectId: PROJECT_ID,
    title: "DEMO — Ground Floor Lobby Punch List",
    areaId: lobby.id,
  });
  ids.punchlistId = punchlist.id;

  const punchItem = await postJson(page, "/api/field/punch-items", {
    projectId: PROJECT_ID,
    punchlistId: punchlist.id,
    areaId: lobby.id,
    siteWalkId: walk.id,
    title: "DEMO — Ceiling trim misaligned at Lobby entrance",
    description: "Ceiling trim at the lobby entrance does not sit flush — visible gap on the south side, likely linked to the frame alignment issue.",
    tradeName: "Ceiling & Partition",
    responsibleUserId: CONTRACTOR_USER_ID,
    priority: "MEDIUM",
    dueDate: iso(-5),
  });
  ids.punchItemId = punchItem.id;
  console.log("Punchlist:", punchlist.id, "| Punch Item:", punchItem.id, punchItem.punchItemNumber);

  // --- 8. ITP with an active Hold Point ---------------------------------------
  const itp = await postJson(page, "/api/field/itp", {
    projectId: PROJECT_ID,
    title: "DEMO — Ceiling Installation ITP",
    revision: "A",
    discipline: "Architectural",
    activity: "Ceiling Framing & Finishing",
    areaId: lobby.id,
    responsibleOrgId: CONTRACTOR_ORG_ID,
    items: [
      { activity: "Install ceiling framing", inspectionType: "S", acceptanceCriteria: "Framing per approved shop drawing SHF-CC-ARC-DRG-000124 Rev A." },
      { activity: "Fix ceiling panels", inspectionType: "W", acceptanceCriteria: "Panel alignment within 3mm tolerance over any 3m run." },
      { activity: "Final ceiling level & alignment inspection", inspectionType: "H", acceptanceCriteria: "Consultant sign-off required before ceiling closure." },
    ],
  });
  ids.itpId = itp.id;
  await patchJson(page, `/api/field/itp/${itp.id}`, { status: "APPROVED" });
  console.log("ITP:", itp.id, itp.itpNumber, "(approved — Hold Point item now HOLD_ACTIVE)");

  // --- 9. Test Result ----------------------------------------------------------
  const test = await postJson(page, "/api/field/tests", {
    projectId: PROJECT_ID,
    areaId: lobby.id,
    typeName: "Ceiling Level Tolerance Check",
    testDate: iso(1),
    testedByName: "QC Inspector — BAHWAN Engineering",
    requirement: "Deviation < 5mm per 3m run",
    actualResult: "3",
    unit: "mm",
    resultStatus: "PASS",
    certificateReference: "DEMO-CERT-0001",
    notes: "DEMO — ceiling tolerance verification for Ground Floor Lobby coordination drawing.",
  });
  ids.testId = test.id;
  console.log("Test:", test.id, test.testNumber);

  // --- 10. Second demo photo (progress, gallery only) -------------------------
  const photo2Svg = demoPhotoSvg("Ceiling Installation Progress", "Ground Floor — Zone A — Lobby", "#2f7a4f");
  const photo2Res = await page.request.post(`${BASE}/api/field/photos`, {
    multipart: {
      projectId: PROJECT_ID,
      areaId: lobby.id,
      siteWalkId: walk.id,
      category: "Progress",
      capturedAt: iso(1),
      file: { name: "DEMO - lobby-ceiling-progress.svg", mimeType: "image/svg+xml", buffer: Buffer.from(photo2Svg) },
    },
  });
  const photo2 = await photo2Res.json();
  if (!photo2Res.ok()) throw new Error(`photo2 upload failed: ${JSON.stringify(photo2)}`);
  ids.photoIds.push(photo2.id);
  console.log("Photo (gallery):", photo2.id);

  // --- 11. End the Site Walk ----------------------------------------------------
  await postJson(page, `/api/field/site-walks/${walk.id}/end`, {});
  console.log("Site Walk ended.");

  console.log("\n=== DEMO SEED COMPLETE ===");
  console.log(JSON.stringify(ids, null, 2));

  await ctx.close();
  await browser.close();
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error("SEED FAILED:", err);
    await prisma.$disconnect();
    process.exit(1);
  });
