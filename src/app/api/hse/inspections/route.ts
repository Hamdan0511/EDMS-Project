import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { assertProjectMember } from "@/lib/project-context";
import { scheduleInspection, InspectionError } from "@/lib/services/hse/inspection-service";
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
    const inspection = await scheduleInspection({
      projectId: b.projectId,
      actingUserId: user.id,
      templateId: typeof b.templateId === "string" ? b.templateId : "",
      location: typeof b.location === "string" ? b.location : "",
      inspectorId: typeof b.inspectorId === "string" ? b.inspectorId : undefined,
      scheduledAt: typeof b.scheduledAt === "string" ? new Date(b.scheduledAt) : undefined,
    });
    return NextResponse.json({ id: inspection.id, inspectionNumber: inspection.inspectionNumber });
  } catch (err) {
    if (err instanceof InspectionError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof ForbiddenPermissionError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error("POST /api/hse/inspections failed:", err);
    return NextResponse.json({ error: "Failed to schedule the inspection. Please try again." }, { status: 500 });
  }
}
