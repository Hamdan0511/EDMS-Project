import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { assertProjectMember } from "@/lib/project-context";
import { prisma } from "@/lib/prisma";
import { submitStepReview, WorkflowError } from "@/lib/services/workflow-service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; stepId: string }> },
) {
  const { id, stepId } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const workflow = await prisma.workflow.findUnique({ where: { id }, select: { projectId: true } });
  if (!workflow) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let membership;
  try {
    membership = await assertProjectMember(user, workflow.projectId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const { outcomeCode, comments } = body as Record<string, unknown>;
  if (typeof outcomeCode !== "string" || !outcomeCode) {
    return NextResponse.json({ error: "outcomeCode is required" }, { status: 400 });
  }

  try {
    const result = await submitStepReview({
      workflowId: id,
      stepInstanceId: stepId,
      projectId: membership.projectId,
      userId: user.id,
      outcomeCode,
      comments: typeof comments === "string" ? comments : undefined,
    });
    return NextResponse.json({
      stepCompleted: result.stepCompleted,
      workflowCompleted: result.workflowCompleted,
      workflowStatus: result.workflow.status,
    });
  } catch (err) {
    if (err instanceof WorkflowError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error(`POST /api/workflows/${id}/steps/${stepId}/review failed:`, err);
    return NextResponse.json({ error: "Failed to submit the review. Please try again." }, { status: 500 });
  }
}
