import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { assertProjectMember } from "@/lib/project-context";
import { requirePermission, ForbiddenPermissionError } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";
import { setWorkflowTemplateStatus, WorkflowError } from "@/lib/services/workflow-service";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const template = await prisma.workflowTemplate.findUnique({ where: { id }, select: { projectId: true } });
  if (!template) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    await assertProjectMember(user, template.projectId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    await requirePermission(user.id, "WORKFLOW_TEMPLATE_MANAGE", { projectId: template.projectId });
  } catch (err) {
    if (err instanceof ForbiddenPermissionError) {
      return NextResponse.json({ error: "Viewers cannot modify workflow templates" }, { status: 403 });
    }
    throw err;
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const { status } = body as Record<string, unknown>;
  if (status !== "DRAFT" && status !== "ACTIVE" && status !== "INACTIVE") {
    return NextResponse.json({ error: "status must be DRAFT, ACTIVE, or INACTIVE" }, { status: 400 });
  }

  try {
    const updated = await setWorkflowTemplateStatus({ id, projectId: template.projectId, userId: user.id, status });
    return NextResponse.json({ id: updated.id, status: updated.status });
  } catch (err) {
    if (err instanceof WorkflowError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error(`PATCH /api/workflow-templates/${id} failed:`, err);
    return NextResponse.json({ error: "Failed to update the template. Please try again." }, { status: 500 });
  }
}
