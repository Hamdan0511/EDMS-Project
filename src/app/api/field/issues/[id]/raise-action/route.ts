import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { assertProjectMember } from "@/lib/project-context";
import { prisma } from "@/lib/prisma";
import { createCorrectiveAction, CorrectiveActionError } from "@/lib/services/hse/corrective-action-service";
import { ForbiddenPermissionError } from "@/lib/auth/permissions";

/** Reuses the EXISTING HSE Corrective Action infrastructure directly — no
 * parallel action-management system for Field Issues. Requires the real
 * HSE_MANAGE_ACTIONS permission (the same one that governs every other
 * corrective action in this app), not a separate Field-scoped bypass. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const { id } = await params;

  const issue = await prisma.fieldIssue.findUnique({ where: { id }, select: { projectId: true, title: true, description: true } });
  if (!issue) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    await assertProjectMember(user, issue.projectId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;

  try {
    const action = await createCorrectiveAction({
      projectId: issue.projectId,
      createdById: user.id,
      sourceType: "FieldIssue",
      sourceId: id,
      description: `${issue.title}: ${issue.description}`,
      assignedToId: typeof body?.assignedToId === "string" ? body.assignedToId : undefined,
      priority: typeof body?.priority === "string" ? (body.priority as never) : undefined,
      dueDate: typeof body?.dueDate === "string" ? new Date(body.dueDate) : undefined,
    });
    return NextResponse.json({ id: action.id, actionNumber: action.actionNumber });
  } catch (err) {
    if (err instanceof CorrectiveActionError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof ForbiddenPermissionError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error(`POST /api/field/issues/${id}/raise-action failed:`, err);
    return NextResponse.json({ error: "Failed to raise the corrective action. Please try again." }, { status: 500 });
  }
}
