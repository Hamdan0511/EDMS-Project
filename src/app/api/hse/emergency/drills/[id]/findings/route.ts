import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { assertProjectMember } from "@/lib/project-context";
import { prisma } from "@/lib/prisma";
import { addDrillFinding, EmergencyError } from "@/lib/services/hse/emergency-service";
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

  const record = await prisma.hseEmergencyDrill.findUnique({ where: { id }, select: { projectId: true } });
  if (!record) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    await assertProjectMember(user, record.projectId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body.issue !== "string" || typeof body.finding !== "string") {
    return NextResponse.json({ error: "issue and finding are required" }, { status: 400 });
  }

  try {
    const finding = await addDrillFinding({
      drillId: id,
      projectId: record.projectId,
      actingUserId: user.id,
      issue: body.issue,
      severity: (typeof body.severity === "string" ? body.severity : "MEDIUM") as never,
      finding: body.finding,
    });
    return NextResponse.json({ id: finding.id });
  } catch (err) {
    if (err instanceof EmergencyError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof ForbiddenPermissionError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error(`POST /api/hse/emergency/drills/${id}/findings failed:`, err);
    return NextResponse.json({ error: "Failed to add the finding. Please try again." }, { status: 500 });
  }
}
