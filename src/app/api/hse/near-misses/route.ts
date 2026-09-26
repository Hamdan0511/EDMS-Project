import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { assertProjectMember } from "@/lib/project-context";
import { createNearMiss, NearMissError } from "@/lib/services/hse/near-miss-service";
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
    const nearMiss = await createNearMiss({
      projectId: b.projectId,
      reportedById: user.id,
      title: typeof b.title === "string" ? b.title : "",
      description: typeof b.description === "string" ? b.description : "",
      whatHappened: typeof b.whatHappened === "string" ? b.whatHappened : undefined,
      potentialConsequence: typeof b.potentialConsequence === "string" ? b.potentialConsequence : undefined,
      potentialSeverity: (b.potentialSeverity as never) ?? "LOW",
      immediateAction: typeof b.immediateAction === "string" ? b.immediateAction : undefined,
      location: typeof b.location === "string" ? b.location : "",
      building: typeof b.building === "string" ? b.building : undefined,
      floor: typeof b.floor === "string" ? b.floor : undefined,
      area: typeof b.area === "string" ? b.area : undefined,
      latitude: typeof b.latitude === "number" ? b.latitude : undefined,
      longitude: typeof b.longitude === "number" ? b.longitude : undefined,
      assignedToId: typeof b.assignedToId === "string" ? b.assignedToId : undefined,
      dueDate: typeof b.dueDate === "string" ? new Date(b.dueDate) : undefined,
    });
    return NextResponse.json({ id: nearMiss.id, nearMissNumber: nearMiss.nearMissNumber });
  } catch (err) {
    if (err instanceof NearMissError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof ForbiddenPermissionError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error("POST /api/hse/near-misses failed:", err);
    return NextResponse.json({ error: "Failed to create the near miss. Please try again." }, { status: 500 });
  }
}
