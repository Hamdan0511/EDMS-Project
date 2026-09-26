import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { assertProjectMember } from "@/lib/project-context";
import { prisma } from "@/lib/prisma";
import { completeEmergencyDrill, EmergencyError } from "@/lib/services/hse/emergency-service";
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
  if (!body || typeof body.result !== "string") {
    return NextResponse.json({ error: "result is required" }, { status: 400 });
  }

  try {
    const drill = await completeEmergencyDrill({
      id,
      projectId: record.projectId,
      actingUserId: user.id,
      result: body.result as never,
      actualParticipants: typeof body.actualParticipants === "number" ? body.actualParticipants : undefined,
      observations: typeof body.observations === "string" ? body.observations : undefined,
    });
    return NextResponse.json({ id: drill.id, status: drill.status, result: drill.result });
  } catch (err) {
    if (err instanceof EmergencyError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof ForbiddenPermissionError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error(`POST /api/hse/emergency/drills/${id}/complete failed:`, err);
    return NextResponse.json({ error: "Failed to complete the drill. Please try again." }, { status: 500 });
  }
}
