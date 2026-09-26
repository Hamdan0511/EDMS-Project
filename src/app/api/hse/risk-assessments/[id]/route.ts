import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { assertProjectMember } from "@/lib/project-context";
import { prisma } from "@/lib/prisma";
import { updateRiskAssessmentStatus, setRiskAssessmentResidualRisk, RiskAssessmentError } from "@/lib/services/hse/risk-assessment-service";
import { ForbiddenPermissionError } from "@/lib/auth/permissions";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const { id } = await params;

  const record = await prisma.hseRiskAssessment.findUnique({ where: { id }, select: { projectId: true } });
  if (!record) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    await assertProjectMember(user, record.projectId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    if (typeof body.status === "string") {
      const updated = await updateRiskAssessmentStatus({ id, projectId: record.projectId, actingUserId: user.id, status: body.status as never });
      return NextResponse.json({ id: updated.id, status: updated.status });
    }

    if (body.residualLikelihood && body.residualSeverity) {
      const updated = await setRiskAssessmentResidualRisk({
        riskAssessmentId: id,
        projectId: record.projectId,
        actingUserId: user.id,
        residualLikelihood: body.residualLikelihood as never,
        residualSeverity: body.residualSeverity as never,
      });
      return NextResponse.json({ id: updated.id, residualRisk: updated.residualRisk });
    }

    return NextResponse.json({ error: "No recognized fields to update" }, { status: 400 });
  } catch (err) {
    if (err instanceof RiskAssessmentError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof ForbiddenPermissionError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error(`PATCH /api/hse/risk-assessments/${id} failed:`, err);
    return NextResponse.json({ error: "Failed to update the risk assessment. Please try again." }, { status: 500 });
  }
}
