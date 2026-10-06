import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { assertProjectMember } from "@/lib/project-context";
import { prisma } from "@/lib/prisma";
import { convertObservationToIssue, ObservationError } from "@/lib/services/field/observation-service";
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

  const record = await prisma.fieldObservation.findUnique({ where: { id }, select: { projectId: true } });
  if (!record) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    await assertProjectMember(user, record.projectId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const issue = await convertObservationToIssue({ id, projectId: record.projectId, actingUserId: user.id });
    return NextResponse.json({ id: issue.id, issueNumber: issue.issueNumber });
  } catch (err) {
    if (err instanceof ObservationError || err instanceof IssueError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof ForbiddenPermissionError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error(`POST /api/field/observations/${id}/convert-to-issue failed:`, err);
    return NextResponse.json({ error: "Failed to convert the observation to an issue. Please try again." }, { status: 500 });
  }
}
