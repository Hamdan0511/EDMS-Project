import "server-only";

import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { requirePermission } from "@/lib/auth/permissions";
import { computeNextNumber, hseNumberPrefix } from "@/lib/hse/numbering";
import { calculateRiskLevel } from "@/lib/hse/risk-matrix";
import type { HseLikelihood, HseSeverity, HseRiskAssessmentStatus, HseControlHierarchy, HseControlStatus } from "@prisma/client";

export class RiskAssessmentError extends Error {}

export async function createRiskAssessment(params: {
  projectId: string;
  createdById: string;
  activity: string;
  task?: string;
  hazard: string;
  potentialConsequence?: string;
  initialLikelihood: HseLikelihood;
  initialSeverity: HseSeverity;
  responsibleId?: string;
  reviewDate?: Date;
}) {
  const { projectId, createdById } = params;
  await requirePermission(createdById, "HSE_MANAGE_RISK_ASSESSMENTS", { projectId });

  if (!params.activity.trim()) throw new RiskAssessmentError("Activity is required.");
  if (!params.hazard.trim()) throw new RiskAssessmentError("Hazard is required.");
  if (params.responsibleId) {
    const member = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: params.responsibleId } },
    });
    if (!member) throw new RiskAssessmentError("Responsible person is not a member of this project.");
  }

  const prefix = hseNumberPrefix("RA");
  const existing = await prisma.hseRiskAssessment.findMany({
    where: { projectId, assessmentNumber: { startsWith: prefix } },
    select: { assessmentNumber: true },
  });
  const assessmentNumber = computeNextNumber(existing.map((e) => e.assessmentNumber), prefix);
  const initialRisk = calculateRiskLevel(params.initialLikelihood, params.initialSeverity);

  const assessment = await prisma.hseRiskAssessment.create({
    data: {
      projectId,
      assessmentNumber,
      activity: params.activity.trim(),
      task: params.task?.trim() || null,
      hazard: params.hazard.trim(),
      potentialConsequence: params.potentialConsequence?.trim() || null,
      initialLikelihood: params.initialLikelihood,
      initialSeverity: params.initialSeverity,
      initialRisk,
      responsibleId: params.responsibleId ?? null,
      reviewDate: params.reviewDate ?? null,
      createdById,
    },
  });

  await logAudit({
    userId: createdById,
    projectId,
    action: "HSE_RISK_ASSESSMENT_CREATED",
    entityType: "HseRiskAssessment",
    entityId: assessment.id,
    metadata: { assessmentNumber, initialRisk },
  });

  return assessment;
}

export async function addRiskAssessmentControl(params: {
  riskAssessmentId: string;
  projectId: string;
  actingUserId: string;
  hierarchy: HseControlHierarchy;
  description: string;
  ownerId?: string;
  dueDate?: Date;
}) {
  const { riskAssessmentId, projectId, actingUserId } = params;
  await requirePermission(actingUserId, "HSE_MANAGE_RISK_ASSESSMENTS", { projectId });

  const assessment = await prisma.hseRiskAssessment.findFirst({ where: { id: riskAssessmentId, projectId } });
  if (!assessment) throw new RiskAssessmentError("Risk assessment not found.");
  if (!params.description.trim()) throw new RiskAssessmentError("Control description is required.");
  if (params.ownerId) {
    const member = await prisma.projectMember.findUnique({ where: { projectId_userId: { projectId, userId: params.ownerId } } });
    if (!member) throw new RiskAssessmentError("Control owner is not a member of this project.");
  }

  const control = await prisma.hseControl.create({
    data: {
      riskAssessmentId,
      hierarchy: params.hierarchy,
      description: params.description.trim(),
      ownerId: params.ownerId ?? null,
      dueDate: params.dueDate ?? null,
    },
  });

  await logAudit({
    userId: actingUserId,
    projectId,
    action: "HSE_RISK_ASSESSMENT_CONTROL_ADDED",
    entityType: "HseRiskAssessment",
    entityId: riskAssessmentId,
    metadata: { hierarchy: params.hierarchy },
  });

  return control;
}

export async function updateRiskAssessmentControlStatus(params: {
  controlId: string;
  projectId: string;
  actingUserId: string;
  status: HseControlStatus;
}) {
  const { controlId, projectId, actingUserId, status } = params;
  await requirePermission(actingUserId, "HSE_MANAGE_RISK_ASSESSMENTS", { projectId });

  const control = await prisma.hseControl.findFirst({
    where: { id: controlId, riskAssessment: { projectId } },
    include: { riskAssessment: true },
  });
  if (!control || !control.riskAssessment) throw new RiskAssessmentError("Control not found.");

  const updated = await prisma.hseControl.update({
    where: { id: controlId },
    data: { status, verifiedAt: status === "VERIFIED" ? new Date() : control.verifiedAt },
  });

  await logAudit({
    userId: actingUserId,
    projectId,
    action: "HSE_RISK_ASSESSMENT_CONTROL_STATUS_CHANGED",
    entityType: "HseRiskAssessment",
    entityId: control.riskAssessmentId!,
    metadata: { controlId, from: control.status, to: status },
  });

  return updated;
}

export async function setRiskAssessmentResidualRisk(params: {
  riskAssessmentId: string;
  projectId: string;
  actingUserId: string;
  residualLikelihood: HseLikelihood;
  residualSeverity: HseSeverity;
}) {
  const { riskAssessmentId, projectId, actingUserId } = params;
  await requirePermission(actingUserId, "HSE_MANAGE_RISK_ASSESSMENTS", { projectId });

  const assessment = await prisma.hseRiskAssessment.findFirst({ where: { id: riskAssessmentId, projectId } });
  if (!assessment) throw new RiskAssessmentError("Risk assessment not found.");

  const residualRisk = calculateRiskLevel(params.residualLikelihood, params.residualSeverity);
  const updated = await prisma.hseRiskAssessment.update({
    where: { id: riskAssessmentId },
    data: { residualLikelihood: params.residualLikelihood, residualSeverity: params.residualSeverity, residualRisk },
  });

  await logAudit({
    userId: actingUserId,
    projectId,
    action: "HSE_RISK_ASSESSMENT_RESIDUAL_RISK_SET",
    entityType: "HseRiskAssessment",
    entityId: riskAssessmentId,
    metadata: { residualRisk },
  });

  return updated;
}

export async function updateRiskAssessmentStatus(params: {
  id: string;
  projectId: string;
  actingUserId: string;
  status: HseRiskAssessmentStatus;
}) {
  const { id, projectId, actingUserId, status } = params;
  await requirePermission(actingUserId, "HSE_MANAGE_RISK_ASSESSMENTS", { projectId });

  const existing = await prisma.hseRiskAssessment.findFirst({ where: { id, projectId } });
  if (!existing) throw new RiskAssessmentError("Risk assessment not found.");

  const updated = await prisma.hseRiskAssessment.update({ where: { id }, data: { status } });

  await logAudit({
    userId: actingUserId,
    projectId,
    action: "HSE_RISK_ASSESSMENT_STATUS_CHANGED",
    entityType: "HseRiskAssessment",
    entityId: id,
    metadata: { from: existing.status, to: status },
  });

  return updated;
}
