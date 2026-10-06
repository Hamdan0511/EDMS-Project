import "server-only";

import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { requirePermission } from "@/lib/auth/permissions";
import { computeNextNumber, fieldNumberPrefix } from "@/lib/field/numbering";
import { createIssue } from "@/lib/services/field/issue-service";
import type { FieldTestResult } from "@prisma/client";

export class TestError extends Error {}

const PERMISSION = "FIELD_MANAGE_TESTS";

async function resolveTestTypeId(projectId: string, typeName: string | undefined): Promise<string | undefined> {
  const name = typeName?.trim();
  if (!name) return undefined;
  const lookup = await prisma.fieldLookup.upsert({
    where: { projectId_kind_name: { projectId, kind: "TEST_TYPE", name } },
    update: {},
    create: { projectId, kind: "TEST_TYPE", name },
  });
  return lookup.id;
}

export async function createTest(params: {
  projectId: string;
  createdById: string;
  typeName?: string;
  areaId?: string;
  testDate: Date;
  testedByName: string;
  testedById?: string;
  witnessedByName?: string;
  responsibleOrgId?: string;
  requirement?: string;
  actualResult?: string;
  unit?: string;
  resultStatus: FieldTestResult;
  certificateReference?: string;
  notes?: string;
}) {
  const { projectId, createdById } = params;
  await requirePermission(createdById, PERMISSION, { projectId });

  if (!params.testedByName.trim()) throw new TestError("Tested By is required.");
  if (Number.isNaN(params.testDate.getTime())) throw new TestError("A valid test date is required.");

  const typeId = await resolveTestTypeId(projectId, params.typeName);

  const prefix = fieldNumberPrefix("TST");
  const existing = await prisma.fieldTest.findMany({
    where: { projectId, testNumber: { startsWith: prefix } },
    select: { testNumber: true },
  });
  const testNumber = computeNextNumber(existing.map((e) => e.testNumber), prefix);

  const test = await prisma.fieldTest.create({
    data: {
      projectId,
      testNumber,
      typeId: typeId ?? null,
      areaId: params.areaId ?? null,
      testDate: params.testDate,
      testedByName: params.testedByName.trim(),
      testedById: params.testedById ?? null,
      witnessedByName: params.witnessedByName?.trim() || null,
      responsibleOrgId: params.responsibleOrgId ?? null,
      requirement: params.requirement?.trim() || null,
      actualResult: params.actualResult?.trim() || null,
      unit: params.unit?.trim() || null,
      resultStatus: params.resultStatus,
      certificateReference: params.certificateReference?.trim() || null,
      notes: params.notes?.trim() || null,
      createdById,
    },
  });

  await logAudit({
    userId: createdById,
    projectId,
    action: "FIELD_TEST_CREATED",
    entityType: "FieldTest",
    entityId: test.id,
    metadata: { testNumber, resultStatus: test.resultStatus },
  });

  return test;
}

/** Retest chain mirrors Equipment Safety's proven previousInspectionId
 * pattern exactly: the original failed test is NEVER overwritten — a retest
 * is always a brand-new row linked back via previousTestId, so the full
 * TEST-0012 -> RETEST-0012-01 -> RETEST-0012-02 history is always visible. */
export async function createRetest(params: {
  previousTestId: string;
  projectId: string;
  createdById: string;
  testDate: Date;
  testedByName: string;
  testedById?: string;
  witnessedByName?: string;
  actualResult?: string;
  resultStatus: FieldTestResult;
  certificateReference?: string;
  notes?: string;
}) {
  const { previousTestId, projectId, createdById } = params;
  await requirePermission(createdById, PERMISSION, { projectId });

  const previous = await prisma.fieldTest.findFirst({ where: { id: previousTestId, projectId } });
  if (!previous) throw new TestError("Original test not found.");
  if (previous.resultStatus !== "FAIL") throw new TestError("A retest can only be created for a failed test.");

  const existingRetest = await prisma.fieldTest.findUnique({ where: { previousTestId } });
  if (existingRetest) throw new TestError("A retest already exists for this test.");

  // Always number off the chain ROOT (not the immediate previous test), so a
  // multi-level chain stays readable — TEST-0001 -> RETEST-0001-01 ->
  // RETEST-0001-02 — instead of growing a new "RETEST-" wrapper per level.
  let root = previous;
  while (root.previousTestId) {
    const next = await prisma.fieldTest.findUnique({ where: { id: root.previousTestId } });
    if (!next) break;
    root = next;
  }
  const rootNumber = root.testNumber.replace(/^RETEST-/, "");

  const prefix = `RETEST-${rootNumber}-`;
  const existingRetestNumbers = await prisma.fieldTest.findMany({
    where: { projectId, testNumber: { startsWith: prefix } },
    select: { testNumber: true },
  });
  const testNumber = computeNextNumber(existingRetestNumbers.map((e) => e.testNumber), prefix);

  const retest = await prisma.fieldTest.create({
    data: {
      projectId,
      testNumber,
      typeId: previous.typeId,
      areaId: previous.areaId,
      testDate: params.testDate,
      testedByName: params.testedByName.trim(),
      testedById: params.testedById ?? null,
      witnessedByName: params.witnessedByName?.trim() || null,
      responsibleOrgId: previous.responsibleOrgId,
      requirement: previous.requirement,
      actualResult: params.actualResult?.trim() || null,
      unit: previous.unit,
      resultStatus: params.resultStatus,
      certificateReference: params.certificateReference?.trim() || null,
      notes: params.notes?.trim() || null,
      previousTestId,
      createdById,
    },
  });

  await logAudit({
    userId: createdById,
    projectId,
    action: "FIELD_TEST_RETEST_CREATED",
    entityType: "FieldTest",
    entityId: retest.id,
    metadata: { testNumber, previousTestId, resultStatus: retest.resultStatus },
  });

  return retest;
}

/** Full chronological chain for a test, oldest first — used by the detail
 * page to render TEST-0012 -> RETEST-0012-01 -> RETEST-0012-02. */
export async function getTestChain(testId: string, projectId: string) {
  const all = await prisma.fieldTest.findMany({ where: { projectId } });
  const byId = new Map(all.map((t) => [t.id, t]));
  const byPrevious = new Map(all.filter((t) => t.previousTestId).map((t) => [t.previousTestId as string, t]));

  let root = byId.get(testId);
  if (!root) return [];
  while (root.previousTestId && byId.has(root.previousTestId)) {
    root = byId.get(root.previousTestId)!;
  }

  const chain = [root];
  let current = root;
  while (byPrevious.has(current.id)) {
    current = byPrevious.get(current.id)!;
    chain.push(current);
  }
  return chain;
}

/** Same pre-populate-from-source pattern as createIssueFromInspectionResponse
 * — a failed test's details seed a new FieldIssue rather than requiring the
 * user to retype them, with sourceType:"FieldTest" preserving the link. */
export async function createIssueFromTest(params: {
  testId: string;
  projectId: string;
  actingUserId: string;
  responsibleUserId?: string;
  dueDate?: Date;
}) {
  const { testId, projectId, actingUserId } = params;

  const test = await prisma.fieldTest.findFirst({ where: { id: testId, projectId }, include: { type: true } });
  if (!test) throw new TestError("Test not found.");
  if (test.resultStatus !== "FAIL") throw new TestError("An issue can only be raised from a failed test.");

  return createIssue({
    projectId,
    createdById: actingUserId,
    areaId: test.areaId ?? undefined,
    title: `${test.testNumber}: ${test.type?.name ?? "Test"} failed`,
    description: test.notes?.trim() || `Test ${test.testNumber} recorded a FAIL result${test.requirement ? ` against requirement "${test.requirement}"` : ""}${test.actualResult ? ` (actual: ${test.actualResult}${test.unit ? ` ${test.unit}` : ""})` : ""}.`,
    responsibleUserId: params.responsibleUserId,
    dueDate: params.dueDate,
    sourceType: "FieldTest",
    sourceId: test.id,
  });
}
