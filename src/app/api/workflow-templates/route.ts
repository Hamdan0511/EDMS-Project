import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { assertProjectMember } from "@/lib/project-context";
import { requirePermission, ForbiddenPermissionError } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";
import { createWorkflowTemplate, WorkflowError } from "@/lib/services/workflow-service";
import type { WorkflowStepCompletionRule, WorkflowOutcomeRule } from "@prisma/client";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");
  const status = searchParams.get("status");
  if (!projectId) {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 });
  }

  try {
    await assertProjectMember(user, projectId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const templates = await prisma.workflowTemplate.findMany({
    where: { projectId, ...(status ? { status: status as "DRAFT" | "ACTIVE" | "INACTIVE" } : {}) },
    include: {
      steps: { include: { reviewers: { include: { user: true } } }, orderBy: { groupNo: "asc" } },
      createdBy: true,
      _count: { select: { workflows: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(
    templates.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      outcomeRule: t.outcomeRule,
      status: t.status,
      createdByName: t.createdBy.name,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
      workflowCount: t._count.workflows,
      steps: t.steps.map((s) => ({
        id: s.id,
        name: s.name,
        groupNo: s.groupNo,
        durationDays: s.durationDays,
        completionRule: s.completionRule,
        commentsRequired: s.commentsRequired,
        reviewers: s.reviewers.map((r) => ({ userId: r.userId, name: r.user.name })),
      })),
    })),
  );
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const { projectId, name, description, outcomeRule, steps } = body as Record<string, unknown>;
  if (typeof projectId !== "string" || !projectId) {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 });
  }

  try {
    await assertProjectMember(user, projectId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    await requirePermission(user.id, "WORKFLOW_TEMPLATE_MANAGE", { projectId });
  } catch (err) {
    if (err instanceof ForbiddenPermissionError) {
      return NextResponse.json({ error: "Viewers cannot create workflow templates" }, { status: 403 });
    }
    throw err;
  }

  if (!Array.isArray(steps)) {
    return NextResponse.json({ error: "steps must be an array" }, { status: 400 });
  }

  try {
    const template = await createWorkflowTemplate({
      projectId,
      userId: user.id,
      name: typeof name === "string" ? name : "",
      description: typeof description === "string" ? description : undefined,
      outcomeRule: (outcomeRule as WorkflowOutcomeRule) ?? "FINAL_STEP_OUTCOME",
      steps: (steps as Record<string, unknown>[]).map((s) => ({
        name: typeof s.name === "string" ? s.name : "",
        groupNo: typeof s.groupNo === "number" ? s.groupNo : 1,
        durationDays: typeof s.durationDays === "number" ? s.durationDays : 5,
        completionRule: (s.completionRule as WorkflowStepCompletionRule) ?? "ALL_REVIEWERS",
        commentsRequired: !!s.commentsRequired,
        reviewerUserIds: Array.isArray(s.reviewerUserIds) ? (s.reviewerUserIds as string[]) : [],
      })),
    });
    return NextResponse.json({ id: template.id });
  } catch (err) {
    if (err instanceof WorkflowError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("POST /api/workflow-templates failed:", err);
    return NextResponse.json({ error: "Failed to create the template. Please try again." }, { status: 500 });
  }
}
