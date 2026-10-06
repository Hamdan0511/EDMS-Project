import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { assertProjectMember } from "@/lib/project-context";
import { prisma } from "@/lib/prisma";
import { createIssueFromInspectionResponse, InspectionError } from "@/lib/services/field/inspection-service";
import { IssueError } from "@/lib/services/field/issue-service";
import { ForbiddenPermissionError } from "@/lib/auth/permissions";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const { id } = await params;

  const response = await prisma.fieldInspectionResponse.findUnique({
    where: { id },
    select: { inspection: { select: { projectId: true } } },
  });
  if (!response) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const projectId = response.inspection.projectId;

  try {
    await assertProjectMember(user, projectId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;

  try {
    const issue = await createIssueFromInspectionResponse({
      responseId: id,
      projectId,
      actingUserId: user.id,
      responsibleUserId: typeof body?.responsibleUserId === "string" ? body.responsibleUserId : undefined,
      dueDate: typeof body?.dueDate === "string" ? new Date(body.dueDate) : undefined,
    });
    return NextResponse.json({ id: issue.id, issueNumber: issue.issueNumber });
  } catch (err) {
    if (err instanceof InspectionError || err instanceof IssueError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof ForbiddenPermissionError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error(`POST /api/field/inspection-responses/${id}/create-issue failed:`, err);
    return NextResponse.json({ error: "Failed to create the issue. Please try again." }, { status: 500 });
  }
}
