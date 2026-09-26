import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { assertProjectMember } from "@/lib/project-context";
import { prisma } from "@/lib/prisma";
import { addRiskAssessmentControl, RiskAssessmentError } from "@/lib/services/hse/risk-assessment-service";
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

  const assessment = await prisma.hseRiskAssessment.findUnique({ where: { id }, select: { projectId: true } });
  if (!assessment) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    await assertProjectMember(user, assessment.projectId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    const control = await addRiskAssessmentControl({
      riskAssessmentId: id,
      projectId: assessment.projectId,
      actingUserId: user.id,
      hierarchy: (body.hierarchy as never) ?? "ADMINISTRATIVE",
      description: typeof body.description === "string" ? body.description : "",
      ownerId: typeof body.ownerId === "string" ? body.ownerId : undefined,
      dueDate: typeof body.dueDate === "string" ? new Date(body.dueDate) : undefined,
    });
    return NextResponse.json({ id: control.id });
  } catch (err) {
    if (err instanceof RiskAssessmentError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof ForbiddenPermissionError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error(`POST /api/hse/risk-assessments/${id}/controls failed:`, err);
    return NextResponse.json({ error: "Failed to add the control. Please try again." }, { status: 500 });
  }
}
