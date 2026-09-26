import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { assertProjectMember } from "@/lib/project-context";
import { prisma } from "@/lib/prisma";
import { updateHazardControlStatus, HazardError } from "@/lib/services/hse/hazard-service";
import { updateRiskAssessmentControlStatus, RiskAssessmentError } from "@/lib/services/hse/risk-assessment-service";
import { ForbiddenPermissionError } from "@/lib/auth/permissions";

/** A control belongs to exactly one of Hazard or Risk Assessment — this
 * shared endpoint resolves which and delegates to the matching service, so
 * the UI has one real update path regardless of the parent register. */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const { id } = await params;

  const control = await prisma.hseControl.findUnique({
    where: { id },
    include: { hazard: { select: { projectId: true } }, riskAssessment: { select: { projectId: true } } },
  });
  if (!control) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const projectId = control.hazard?.projectId ?? control.riskAssessment?.projectId;
  if (!projectId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    await assertProjectMember(user, projectId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const status = (await request.json().catch(() => null) as Record<string, unknown> | null)?.status;
  if (typeof status !== "string" || !["PLANNED", "IN_PROGRESS", "IMPLEMENTED", "VERIFIED"].includes(status)) {
    return NextResponse.json({ error: "A valid status is required" }, { status: 400 });
  }

  try {
    const updated = control.hazardId
      ? await updateHazardControlStatus({ controlId: id, projectId, actingUserId: user.id, status: status as never })
      : await updateRiskAssessmentControlStatus({ controlId: id, projectId, actingUserId: user.id, status: status as never });
    return NextResponse.json({ id: updated.id, status: updated.status });
  } catch (err) {
    if (err instanceof HazardError || err instanceof RiskAssessmentError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof ForbiddenPermissionError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error(`PATCH /api/hse/controls/${id} failed:`, err);
    return NextResponse.json({ error: "Failed to update the control. Please try again." }, { status: 500 });
  }
}
