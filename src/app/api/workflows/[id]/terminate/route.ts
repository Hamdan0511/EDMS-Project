import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { assertProjectMember } from "@/lib/project-context";
import { requirePermission, ForbiddenPermissionError } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";
import { terminateWorkflow, WorkflowError } from "@/lib/services/workflow-service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const workflow = await prisma.workflow.findUnique({ where: { id }, select: { projectId: true } });
  if (!workflow) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    await assertProjectMember(user, workflow.projectId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    await requirePermission(user.id, "WORKFLOW_TERMINATE", { projectId: workflow.projectId });
  } catch (err) {
    if (err instanceof ForbiddenPermissionError) {
      return NextResponse.json({ error: "Viewers cannot terminate workflows" }, { status: 403 });
    }
    throw err;
  }

  const body = await request.json().catch(() => null);
  const reason = body && typeof body === "object" ? (body as Record<string, unknown>).reason : undefined;
  if (typeof reason !== "string" || !reason.trim()) {
    return NextResponse.json({ error: "A reason is required to terminate a workflow" }, { status: 400 });
  }

  try {
    await terminateWorkflow({ workflowId: id, projectId: workflow.projectId, userId: user.id, reason });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof WorkflowError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error(`POST /api/workflows/${id}/terminate failed:`, err);
    return NextResponse.json({ error: "Failed to terminate the workflow. Please try again." }, { status: 500 });
  }
}
