import "server-only";

import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import type { WorkflowStepCompletionRule, WorkflowOutcomeRule, Prisma } from "@prisma/client";

export class WorkflowError extends Error {}

/** Real, human-facing sequential workflow number — same scan-max-suffix
 * pattern as Mail's nextMailNumber, scoped inside the same transaction that
 * creates the row (the DB's @@unique([projectId, workflowNumber]) is the
 * final backstop against a concurrent duplicate). */
async function nextWorkflowNumber(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  projectId: string,
  projectCode: string | null,
): Promise<string> {
  const prefix = (projectCode ?? "SF").toUpperCase();
  const numberPrefix = `${prefix}-WF-`;

  const existing = await tx.workflow.findMany({
    where: { projectId, workflowNumber: { startsWith: numberPrefix } },
    select: { workflowNumber: true },
  });

  let maxSuffix = 0;
  for (const w of existing) {
    const suffix = w.workflowNumber.slice(numberPrefix.length);
    const parsed = Number.parseInt(suffix, 10);
    if (Number.isFinite(parsed) && parsed > maxSuffix) {
      maxSuffix = parsed;
    }
  }

  return `${numberPrefix}${String(maxSuffix + 1).padStart(5, "0")}`;
}

async function recordEvent(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  params: { workflowId: string; action: string; actorId?: string; metadata?: Prisma.InputJsonValue },
) {
  await tx.workflowEvent.create({
    data: {
      workflowId: params.workflowId,
      action: params.action,
      actorId: params.actorId ?? null,
      metadata: params.metadata ?? undefined,
    },
  });
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

export type TemplateStepInput = {
  name: string;
  groupNo: number;
  durationDays: number;
  completionRule: WorkflowStepCompletionRule;
  commentsRequired: boolean;
  reviewerUserIds: string[];
};

export async function createWorkflowTemplate(params: {
  projectId: string;
  userId: string;
  name: string;
  description?: string;
  outcomeRule: WorkflowOutcomeRule;
  steps: TemplateStepInput[];
}) {
  const { projectId, userId, name, description, outcomeRule, steps } = params;

  if (!name.trim()) throw new WorkflowError("Template name is required.");
  if (steps.length === 0) throw new WorkflowError("A template needs at least one step.");
  const stepNames = new Set<string>();
  for (const step of steps) {
    if (!step.name.trim()) throw new WorkflowError("Every step needs a name.");
    const key = step.name.trim().toLowerCase();
    if (stepNames.has(key)) throw new WorkflowError(`Step name "${step.name}" is used more than once — step names must be unique within a template.`);
    stepNames.add(key);
    if (step.reviewerUserIds.length === 0) throw new WorkflowError(`Step "${step.name}" needs at least one reviewer.`);
    if (step.durationDays < 1) throw new WorkflowError(`Step "${step.name}" needs a duration of at least 1 day.`);
  }

  // Every reviewer must actually be a member of this project — without this,
  // a direct API call could assign any user system-wide as a reviewer
  // (confirmed exploitable in a live security audit), bypassing the
  // RecipientPicker's project-scoped search that the UI relies on.
  const allReviewerIds = [...new Set(steps.flatMap((s) => s.reviewerUserIds))];
  if (allReviewerIds.length > 0) {
    const memberCount = await prisma.projectMember.count({
      where: { projectId, userId: { in: allReviewerIds } },
    });
    if (memberCount !== allReviewerIds.length) {
      throw new WorkflowError("One or more selected reviewers are not members of this project.");
    }
  }

  const existing = await prisma.workflowTemplate.findUnique({ where: { projectId_name: { projectId, name: name.trim() } } });
  if (existing) throw new WorkflowError(`A template named "${name.trim()}" already exists.`);

  const template = await prisma.$transaction(async (tx) => {
    const created = await tx.workflowTemplate.create({
      data: {
        projectId,
        name: name.trim(),
        description: description?.trim() || null,
        outcomeRule,
        status: "DRAFT",
        createdById: userId,
      },
    });

    for (const step of steps) {
      await tx.workflowTemplateStep.create({
        data: {
          templateId: created.id,
          name: step.name.trim(),
          groupNo: step.groupNo,
          durationDays: step.durationDays,
          completionRule: step.completionRule,
          commentsRequired: step.commentsRequired,
          reviewers: { create: step.reviewerUserIds.map((userId) => ({ userId })) },
        },
      });
    }

    return created;
  });

  await logAudit({
    userId,
    projectId,
    action: "WORKFLOW_TEMPLATE_CREATED",
    entityType: "WorkflowTemplate",
    entityId: template.id,
    metadata: { name: template.name, stepCount: steps.length },
  });

  return template;
}

export async function setWorkflowTemplateStatus(params: {
  id: string;
  projectId: string;
  userId: string;
  status: "DRAFT" | "ACTIVE" | "INACTIVE";
}) {
  const { id, projectId, userId, status } = params;
  const template = await prisma.workflowTemplate.findFirst({ where: { id, projectId } });
  if (!template) throw new WorkflowError("Template not found.");

  const updated = await prisma.workflowTemplate.update({ where: { id }, data: { status } });

  await logAudit({
    userId,
    projectId,
    action: "WORKFLOW_TEMPLATE_STATUS_CHANGED",
    entityType: "WorkflowTemplate",
    entityId: id,
    metadata: { from: template.status, to: status },
  });

  return updated;
}

// ---------------------------------------------------------------------------
// Starting a workflow
// ---------------------------------------------------------------------------

export async function startWorkflow(params: {
  projectId: string;
  userId: string;
  templateId: string;
  documentIds: string[];
  title?: string;
  parentWorkflowId?: string;
}) {
  const { projectId, userId, templateId, documentIds, title, parentWorkflowId } = params;

  if (documentIds.length === 0) throw new WorkflowError("Select at least one document to start a workflow.");

  const template = await prisma.workflowTemplate.findFirst({
    where: { id: templateId, projectId },
    include: { steps: { include: { reviewers: true }, orderBy: { groupNo: "asc" } } },
  });
  if (!template) throw new WorkflowError("Workflow template not found.");
  if (template.status !== "ACTIVE") throw new WorkflowError("Only an Active template can be used to start a workflow.");

  const documents = await prisma.document.findMany({
    where: { id: { in: documentIds }, projectId },
    include: { versions: { orderBy: { versionNo: "desc" }, take: 1 } },
  });
  if (documents.length !== documentIds.length) {
    throw new WorkflowError("One or more selected documents could not be found in this project.");
  }

  const alreadyActive = await prisma.workflowDocument.findMany({
    where: { documentId: { in: documentIds }, workflow: { status: "IN_PROGRESS" } },
    include: { document: { select: { documentNo: true } } },
  });
  if (alreadyActive.length > 0) {
    throw new WorkflowError(
      `${alreadyActive.map((d) => d.document.documentNo).join(", ")} already ${alreadyActive.length === 1 ? "has" : "have"} an active workflow in progress.`,
    );
  }

  if (parentWorkflowId) {
    const parent = await prisma.workflow.findFirst({ where: { id: parentWorkflowId, projectId } });
    if (!parent) throw new WorkflowError("Parent workflow not found.");
  }

  const minGroupNo = Math.min(...template.steps.map((s) => s.groupNo));
  const firstGroupMaxDuration = Math.max(
    ...template.steps.filter((s) => s.groupNo === minGroupNo).map((s) => s.durationDays),
  );
  const now = new Date();
  const originalDueDate = new Date(now.getTime() + firstGroupMaxDuration * 86400000);

  const workflow = await prisma.$transaction(async (tx) => {
    const project = await tx.project.findUnique({ where: { id: projectId }, select: { code: true } });
    const workflowNumber = await nextWorkflowNumber(tx, projectId, project?.code ?? null);

    const created = await tx.workflow.create({
      data: {
        projectId,
        workflowNumber,
        templateId: template.id,
        title: title?.trim() || template.name,
        outcomeRule: template.outcomeRule,
        status: "IN_PROGRESS",
        initiatedById: userId,
        parentWorkflowId: parentWorkflowId ?? null,
        originalDueDate,
      },
    });

    for (const doc of documents) {
      await tx.workflowDocument.create({
        data: {
          workflowId: created.id,
          documentId: doc.id,
          documentVersionId: doc.versions[0]?.id ?? null,
        },
      });
    }

    for (const step of template.steps) {
      const isFirstGroup = step.groupNo === minGroupNo;
      await tx.workflowStepInstance.create({
        data: {
          workflowId: created.id,
          templateStepId: step.id,
          name: step.name,
          groupNo: step.groupNo,
          durationDays: step.durationDays,
          completionRule: step.completionRule,
          commentsRequired: step.commentsRequired,
          status: isFirstGroup ? "ACTIVE" : "PENDING",
          startedAt: isFirstGroup ? now : null,
          dueDate: isFirstGroup ? new Date(now.getTime() + step.durationDays * 86400000) : null,
          reviewers: { create: step.reviewers.map((r) => ({ userId: r.userId })) },
        },
      });
    }

    await recordEvent(tx, {
      workflowId: created.id,
      action: "WORKFLOW_STARTED",
      actorId: userId,
      metadata: { templateName: template.name, documentIds },
    });

    return created;
  });

  await logAudit({
    userId,
    projectId,
    action: "WORKFLOW_STARTED",
    entityType: "Workflow",
    entityId: workflow.id,
    metadata: { title: workflow.title, documentCount: documents.length, templateName: template.name },
  });

  return workflow;
}

// ---------------------------------------------------------------------------
// Submitting a review
// ---------------------------------------------------------------------------

export async function submitStepReview(params: {
  workflowId: string;
  stepInstanceId: string;
  projectId: string;
  userId: string;
  outcomeCode: string;
  comments?: string;
}) {
  const { workflowId, stepInstanceId, projectId, userId, outcomeCode, comments } = params;

  const workflow = await prisma.workflow.findFirst({ where: { id: workflowId, projectId } });
  if (!workflow) throw new WorkflowError("Workflow not found.");
  if (workflow.status !== "IN_PROGRESS") throw new WorkflowError("This workflow is no longer in progress.");

  const step = await prisma.workflowStepInstance.findFirst({
    where: { id: stepInstanceId, workflowId },
    include: { reviewers: true },
  });
  if (!step) throw new WorkflowError("Workflow step not found.");
  if (step.status !== "ACTIVE") throw new WorkflowError("This step is not currently active.");

  const reviewer = step.reviewers.find((r) => r.userId === userId);
  if (!reviewer) throw new WorkflowError("You are not a reviewer on this step.");
  if (reviewer.reviewedAt) throw new WorkflowError("You have already submitted your review for this step.");

  const outcome = await prisma.workflowOutcomeOption.findUnique({ where: { projectId_code: { projectId, code: outcomeCode } } });
  if (!outcome) throw new WorkflowError("Invalid review outcome.");
  if (step.commentsRequired && !comments?.trim()) throw new WorkflowError("Comments are required for this step.");

  const result = await prisma.$transaction(async (tx) => {
    await tx.workflowStepReviewer.update({
      where: { id: reviewer.id },
      data: { outcomeCode, comments: comments?.trim() || null, reviewedAt: new Date() },
    });

    await recordEvent(tx, {
      workflowId,
      action: "WORKFLOW_STEP_REVIEWED",
      actorId: userId,
      metadata: { stepInstanceId, stepName: step.name, outcomeCode },
    });

    const allReviewers = await tx.workflowStepReviewer.findMany({ where: { stepInstanceId } });
    const reviewed = allReviewers.filter((r) => r.reviewedAt);
    const outcomeOptions = await tx.workflowOutcomeOption.findMany({ where: { projectId } });
    const rankOf = (code: string) => outcomeOptions.find((o) => o.code === code)?.severityRank ?? 0;
    const isRejectionCode = (code: string) => outcomeOptions.find((o) => o.code === code)?.isRejection ?? false;

    const anyRejectionSoFar = reviewed.some((r) => r.outcomeCode && isRejectionCode(r.outcomeCode));

    let stepComplete = false;
    if (step.completionRule === "ALL_REVIEWERS") {
      stepComplete = reviewed.length === allReviewers.length;
    } else if (step.completionRule === "ANY_REVIEWER") {
      stepComplete = reviewed.length >= 1;
    } else if (step.completionRule === "REJECT_ON_ANY_REJECTION") {
      stepComplete = anyRejectionSoFar || reviewed.length === allReviewers.length;
    }

    if (!stepComplete) {
      return { workflow, stepCompleted: false, workflowCompleted: false };
    }

    const stepOutcomeCode = reviewed.reduce((worst, r) => {
      if (!r.outcomeCode) return worst;
      if (!worst) return r.outcomeCode;
      return rankOf(r.outcomeCode) > rankOf(worst) ? r.outcomeCode : worst;
    }, null as string | null);

    await tx.workflowStepInstance.update({
      where: { id: step.id },
      data: { status: "COMPLETED", completedAt: new Date(), outcomeCode: stepOutcomeCode },
    });
    await recordEvent(tx, {
      workflowId,
      action: "WORKFLOW_STEP_COMPLETED",
      actorId: userId,
      metadata: { stepInstanceId, stepName: step.name, outcomeCode: stepOutcomeCode },
    });

    // LOWEST_OF_ALL_STEP_OUTCOMES: a rejecting outcome on ANY step can never
    // be diluted by a later, better outcome under a "worst wins" rule, so
    // the workflow can safely terminate as REJECTED right now instead of
    // running through remaining steps for no reason.
    if (workflow.outcomeRule === "LOWEST_OF_ALL_STEP_OUTCOMES" && stepOutcomeCode && isRejectionCode(stepOutcomeCode)) {
      await tx.workflowStepInstance.updateMany({
        where: { workflowId, status: { in: ["PENDING", "ACTIVE"] }, id: { not: step.id } },
        data: { status: "SKIPPED" },
      });
      await tx.workflow.update({
        where: { id: workflowId },
        data: { status: "REJECTED", finalOutcomeCode: stepOutcomeCode, completedAt: new Date() },
      });
      await recordEvent(tx, {
        workflowId,
        action: "WORKFLOW_REJECTED",
        actorId: userId,
        metadata: { reason: "Rejecting outcome under Lowest-Of-All-Step-Outcomes rule", stepName: step.name, outcomeCode: stepOutcomeCode },
      });
      return { workflow, stepCompleted: true, workflowCompleted: true };
    }

    // Is the whole group (all parallel steps sharing this groupNo) done?
    const siblingSteps = await tx.workflowStepInstance.findMany({ where: { workflowId, groupNo: step.groupNo } });
    const groupDone = siblingSteps.every((s) => s.id === step.id || s.status === "COMPLETED" || s.status === "SKIPPED");
    if (!groupDone) {
      return { workflow, stepCompleted: true, workflowCompleted: false };
    }

    const nextSteps = await tx.workflowStepInstance.findMany({
      where: { workflowId, status: "PENDING", groupNo: { gt: step.groupNo } },
      orderBy: { groupNo: "asc" },
    });

    if (nextSteps.length === 0) {
      // Last group just finished — compute the final workflow outcome.
      const allSteps = await tx.workflowStepInstance.findMany({ where: { workflowId, status: "COMPLETED" } });
      let finalOutcomeCode: string | null;
      if (workflow.outcomeRule === "FINAL_STEP_OUTCOME") {
        const lastGroupSteps = allSteps.filter((s) => s.groupNo === step.groupNo);
        finalOutcomeCode = lastGroupSteps.reduce((worst, s) => {
          if (!s.outcomeCode) return worst;
          if (!worst) return s.outcomeCode;
          return rankOf(s.outcomeCode) > rankOf(worst) ? s.outcomeCode : worst;
        }, null as string | null);
      } else {
        finalOutcomeCode = allSteps.reduce((worst, s) => {
          if (!s.outcomeCode) return worst;
          if (!worst) return s.outcomeCode;
          return rankOf(s.outcomeCode) > rankOf(worst) ? s.outcomeCode : worst;
        }, null as string | null);
      }
      const finalIsRejection = finalOutcomeCode ? isRejectionCode(finalOutcomeCode) : false;

      await tx.workflow.update({
        where: { id: workflowId },
        data: {
          status: finalIsRejection ? "REJECTED" : "COMPLETED",
          finalOutcomeCode,
          completedAt: new Date(),
        },
      });
      await recordEvent(tx, {
        workflowId,
        action: "WORKFLOW_COMPLETED",
        actorId: userId,
        metadata: { finalOutcomeCode, status: finalIsRejection ? "REJECTED" : "COMPLETED" },
      });
      return { workflow, stepCompleted: true, workflowCompleted: true };
    }

    const nextGroupNo = nextSteps[0].groupNo;
    const now = new Date();
    for (const s of nextSteps.filter((s) => s.groupNo === nextGroupNo)) {
      await tx.workflowStepInstance.update({
        where: { id: s.id },
        data: { status: "ACTIVE", startedAt: now, dueDate: new Date(now.getTime() + s.durationDays * 86400000) },
      });
    }
    await recordEvent(tx, {
      workflowId,
      action: "WORKFLOW_NEXT_STEP_ACTIVATED",
      actorId: userId,
      metadata: { groupNo: nextGroupNo, stepNames: nextSteps.filter((s) => s.groupNo === nextGroupNo).map((s) => s.name) },
    });

    return { workflow, stepCompleted: true, workflowCompleted: false };
  });

  await logAudit({
    userId,
    projectId,
    action: "WORKFLOW_STEP_SUBMITTED",
    entityType: "Workflow",
    entityId: workflowId,
    metadata: { stepInstanceId, outcomeCode },
  });

  if (result.workflowCompleted) {
    const finalWorkflow = await prisma.workflow.findUniqueOrThrow({ where: { id: workflowId } });
    return { ...result, workflow: finalWorkflow };
  }

  return result;
}

// ---------------------------------------------------------------------------
// Termination / skip
// ---------------------------------------------------------------------------

export async function terminateWorkflow(params: { workflowId: string; projectId: string; userId: string; reason: string }) {
  const { workflowId, projectId, userId, reason } = params;
  if (!reason.trim()) throw new WorkflowError("A reason is required to terminate a workflow.");

  const workflow = await prisma.workflow.findFirst({ where: { id: workflowId, projectId } });
  if (!workflow) throw new WorkflowError("Workflow not found.");
  if (workflow.status !== "IN_PROGRESS") throw new WorkflowError("Only an in-progress workflow can be terminated.");

  await prisma.$transaction(async (tx) => {
    await tx.workflowStepInstance.updateMany({
      where: { workflowId, status: { in: ["PENDING", "ACTIVE"] } },
      data: { status: "TERMINATED" },
    });
    await tx.workflow.update({
      where: { id: workflowId },
      data: { status: "TERMINATED", terminatedReason: reason.trim(), completedAt: new Date() },
    });
    await recordEvent(tx, { workflowId, action: "WORKFLOW_TERMINATED", actorId: userId, metadata: { reason: reason.trim() } });
  });

  await logAudit({
    userId,
    projectId,
    action: "WORKFLOW_TERMINATED",
    entityType: "Workflow",
    entityId: workflowId,
    metadata: { reason: reason.trim() },
  });
}
