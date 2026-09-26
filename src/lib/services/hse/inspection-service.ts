import "server-only";

import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { requirePermission } from "@/lib/auth/permissions";
import { computeNextNumber, hseNumberPrefix } from "@/lib/hse/numbering";

export class InspectionError extends Error {}

/** A response counts as a "finding" (something not fully compliant) when a
 * YES_NO question is answered "NO" or a PASS_FAIL question is answered
 * "FAIL" — these are the only two answer types with an inherent pass/fail
 * meaning in this template system. */
function isFindingAnswer(type: string, answer: string | null): boolean {
  if (!answer) return false;
  if (type === "YES_NO") return answer === "NO";
  if (type === "PASS_FAIL") return answer === "FAIL";
  return false;
}

export async function scheduleInspection(params: {
  projectId: string;
  actingUserId: string;
  templateId: string;
  location: string;
  inspectorId?: string;
  scheduledAt?: Date;
}) {
  const { projectId, actingUserId } = params;
  await requirePermission(actingUserId, "HSE_MANAGE_INSPECTIONS", { projectId });

  const template = await prisma.hseInspectionTemplate.findFirst({ where: { id: params.templateId, projectId } });
  if (!template) throw new InspectionError("Inspection template not found.");
  if (!params.location.trim()) throw new InspectionError("Location is required.");

  const inspectorId = params.inspectorId ?? actingUserId;
  const member = await prisma.projectMember.findUnique({ where: { projectId_userId: { projectId, userId: inspectorId } } });
  if (!member) throw new InspectionError("Inspector is not a member of this project.");

  const prefix = hseNumberPrefix("INS");
  const existing = await prisma.hseInspection.findMany({
    where: { projectId, inspectionNumber: { startsWith: prefix } },
    select: { inspectionNumber: true },
  });
  const inspectionNumber = computeNextNumber(existing.map((e) => e.inspectionNumber), prefix);

  const inspection = await prisma.hseInspection.create({
    data: {
      projectId,
      inspectionNumber,
      templateId: params.templateId,
      location: params.location.trim(),
      inspectorId,
      scheduledAt: params.scheduledAt ?? null,
    },
  });

  await logAudit({
    userId: actingUserId,
    projectId,
    action: "HSE_INSPECTION_SCHEDULED",
    entityType: "HseInspection",
    entityId: inspection.id,
    metadata: { inspectionNumber, templateId: params.templateId },
  });

  return inspection;
}

export async function beginInspection(params: { id: string; projectId: string; actingUserId: string }) {
  const { id, projectId, actingUserId } = params;
  await requirePermission(actingUserId, "HSE_MANAGE_INSPECTIONS", { projectId });

  const existing = await prisma.hseInspection.findFirst({ where: { id, projectId } });
  if (!existing) throw new InspectionError("Inspection not found.");
  if (existing.status !== "SCHEDULED") throw new InspectionError("Only a scheduled inspection can be started.");

  const updated = await prisma.hseInspection.update({
    where: { id },
    data: { status: "IN_PROGRESS", startedAt: new Date() },
  });

  await logAudit({
    userId: actingUserId,
    projectId,
    action: "HSE_INSPECTION_STARTED",
    entityType: "HseInspection",
    entityId: id,
  });

  return updated;
}

export async function saveInspectionResponses(params: {
  id: string;
  projectId: string;
  actingUserId: string;
  responses: { questionId: string; answer?: string; comment?: string }[];
}) {
  const { id, projectId, actingUserId } = params;
  await requirePermission(actingUserId, "HSE_MANAGE_INSPECTIONS", { projectId });

  const inspection = await prisma.hseInspection.findFirst({ where: { id, projectId } });
  if (!inspection) throw new InspectionError("Inspection not found.");
  if (inspection.status === "COMPLETED") throw new InspectionError("This inspection is already completed.");

  const questions = await prisma.hseInspectionQuestion.findMany({ where: { templateId: inspection.templateId } });
  const questionIds = new Set(questions.map((q) => q.id));

  await prisma.$transaction(
    params.responses
      .filter((r) => questionIds.has(r.questionId))
      .map((r) =>
        prisma.hseInspectionResponse.upsert({
          where: { inspectionId_questionId: { inspectionId: id, questionId: r.questionId } },
          create: { inspectionId: id, questionId: r.questionId, answer: r.answer ?? null, comment: r.comment?.trim() || null },
          update: { answer: r.answer ?? null, comment: r.comment?.trim() || null },
        }),
      ),
  );

  return prisma.hseInspection.findUniqueOrThrow({ where: { id }, include: { responses: true } });
}

export async function completeInspection(params: { id: string; projectId: string; actingUserId: string }) {
  const { id, projectId, actingUserId } = params;
  await requirePermission(actingUserId, "HSE_MANAGE_INSPECTIONS", { projectId });

  const inspection = await prisma.hseInspection.findFirst({
    where: { id, projectId },
    include: { responses: { include: { question: true } }, template: { include: { questions: true } } },
  });
  if (!inspection) throw new InspectionError("Inspection not found.");
  if (inspection.status === "COMPLETED") throw new InspectionError("This inspection is already completed.");

  const requiredQuestions = inspection.template.questions.filter((q) => q.required);
  const answeredIds = new Set(inspection.responses.filter((r) => r.answer && r.answer.trim()).map((r) => r.questionId));
  const missing = requiredQuestions.filter((q) => !answeredIds.has(q.id));
  if (missing.length > 0) {
    throw new InspectionError(`All required questions must be answered before completing (${missing.length} remaining).`);
  }

  const findings = inspection.responses.filter((r) => isFindingAnswer(r.question.type, r.answer));
  const result = findings.length > 0 ? `Fail — ${findings.length} finding(s) recorded` : "Pass";

  const updated = await prisma.hseInspection.update({
    where: { id },
    data: { status: "COMPLETED", completedAt: new Date(), result },
  });

  await logAudit({
    userId: actingUserId,
    projectId,
    action: "HSE_INSPECTION_COMPLETED",
    entityType: "HseInspection",
    entityId: id,
    metadata: { result, findingCount: findings.length },
  });

  return updated;
}
