import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { assertProjectMember } from "@/lib/project-context";
import { createEmergencyDrill, EmergencyError } from "@/lib/services/hse/emergency-service";
import { ForbiddenPermissionError } from "@/lib/auth/permissions";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const { projectId, drillType, scheduledAt, location, scenario, coordinatorId, expectedParticipants, assemblyPoint } =
    body as Record<string, unknown>;
  if (typeof projectId !== "string" || !projectId) {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 });
  }

  try {
    await assertProjectMember(user, projectId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const drill = await createEmergencyDrill({
      projectId,
      createdById: user.id,
      drillType: typeof drillType === "string" ? drillType : "Fire Drill",
      scheduledAt: typeof scheduledAt === "string" ? new Date(scheduledAt) : new Date(),
      location: typeof location === "string" ? location : "",
      scenario: typeof scenario === "string" ? scenario : undefined,
      coordinatorId: typeof coordinatorId === "string" ? coordinatorId : user.id,
      expectedParticipants: typeof expectedParticipants === "number" ? expectedParticipants : undefined,
      assemblyPoint: typeof assemblyPoint === "string" ? assemblyPoint : undefined,
    });
    return NextResponse.json({ id: drill.id, drillNumber: drill.drillNumber });
  } catch (err) {
    if (err instanceof EmergencyError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof ForbiddenPermissionError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error("POST /api/hse/emergency/drills failed:", err);
    return NextResponse.json({ error: "Failed to schedule the drill. Please try again." }, { status: 500 });
  }
}
