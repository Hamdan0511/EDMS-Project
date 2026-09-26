import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { assertProjectMember } from "@/lib/project-context";
import { createHazard, HazardError } from "@/lib/services/hse/hazard-service";
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
  const b = body as Record<string, unknown>;
  if (typeof b.projectId !== "string" || !b.projectId) {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 });
  }

  try {
    await assertProjectMember(user, b.projectId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const hazard = await createHazard({
      projectId: b.projectId,
      createdById: user.id,
      hazard: typeof b.hazard === "string" ? b.hazard : "",
      activity: typeof b.activity === "string" ? b.activity : undefined,
      location: typeof b.location === "string" ? b.location : "",
      initialLikelihood: (b.initialLikelihood as never) ?? "POSSIBLE",
      initialSeverity: (b.initialSeverity as never) ?? "LOW",
      responsibleId: typeof b.responsibleId === "string" ? b.responsibleId : undefined,
      reviewDate: typeof b.reviewDate === "string" ? new Date(b.reviewDate) : undefined,
    });
    return NextResponse.json({ id: hazard.id, hazardNumber: hazard.hazardNumber });
  } catch (err) {
    if (err instanceof HazardError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof ForbiddenPermissionError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error("POST /api/hse/hazards failed:", err);
    return NextResponse.json({ error: "Failed to create the hazard. Please try again." }, { status: 500 });
  }
}
