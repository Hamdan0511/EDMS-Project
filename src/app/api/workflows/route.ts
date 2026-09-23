import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { assertProjectMember } from "@/lib/project-context";
import { requirePermission, ForbiddenPermissionError } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";
import { startWorkflow, WorkflowError } from "@/lib/services/workflow-service";
import { buildWorkflowWhere } from "@/lib/workflows/query";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");
  const filter = searchParams.get("filter") ?? "ALL";
  const search = searchParams.get("search")?.trim();
  if (!projectId) {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 });
  }

  try {
    await assertProjectMember(user, projectId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const where = buildWorkflowWhere({ projectId, userId: user.id, filter, search });

  const workflows = await prisma.workflow.findMany({
    where,
    include: {
      initiatedBy: true,
      documents: { include: { document: { select: { id: true, documentNo: true, title: true } } } },
      steps: {
        where: { status: "ACTIVE" },
        include: { reviewers: { include: { user: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return NextResponse.json(
    workflows.map((w) => ({
      id: w.id,
      title: w.title,
      status: w.status,
      finalOutcomeCode: w.finalOutcomeCode,
      initiatedByName: w.initiatedBy.name,
      createdAt: w.createdAt.toISOString(),
      completedAt: w.completedAt?.toISOString() ?? null,
      documents: w.documents.map((d) => ({ id: d.document.id, documentNo: d.document.documentNo, title: d.document.title })),
      activeSteps: w.steps.map((s) => ({
        id: s.id,
        name: s.name,
        dueDate: s.dueDate?.toISOString() ?? null,
        overdue: s.dueDate ? s.dueDate.getTime() < Date.now() : false,
        reviewers: s.reviewers.map((r) => ({ userId: r.userId, name: r.user.name, reviewedAt: r.reviewedAt?.toISOString() ?? null })),
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
  const { projectId, templateId, documentIds, title, parentWorkflowId } = body as Record<string, unknown>;
  if (typeof projectId !== "string" || !projectId) {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 });
  }
  if (typeof templateId !== "string" || !templateId) {
    return NextResponse.json({ error: "templateId is required" }, { status: 400 });
  }
  if (!Array.isArray(documentIds) || documentIds.some((d) => typeof d !== "string")) {
    return NextResponse.json({ error: "documentIds must be an array of strings" }, { status: 400 });
  }

  try {
    await assertProjectMember(user, projectId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    await requirePermission(user.id, "WORKFLOW_CREATE", { projectId });
  } catch (err) {
    if (err instanceof ForbiddenPermissionError) {
      return NextResponse.json({ error: "Viewers cannot start workflows" }, { status: 403 });
    }
    throw err;
  }

  try {
    const workflow = await startWorkflow({
      projectId,
      userId: user.id,
      templateId,
      documentIds: documentIds as string[],
      title: typeof title === "string" ? title : undefined,
      parentWorkflowId: typeof parentWorkflowId === "string" ? parentWorkflowId : undefined,
    });
    return NextResponse.json({ id: workflow.id });
  } catch (err) {
    if (err instanceof WorkflowError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("POST /api/workflows failed:", err);
    return NextResponse.json({ error: "Failed to start the workflow. Please try again." }, { status: 500 });
  }
}
