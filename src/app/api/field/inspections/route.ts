import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { assertProjectMember } from "@/lib/project-context";
import { createInspection, InspectionError } from "@/lib/services/field/inspection-service";
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
  const { projectId, templateId, areaId, assigneeId, inspectorId, dueDate } = body as Record<string, unknown>;
  if (typeof projectId !== "string" || !projectId) {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 });
  }
  if (typeof templateId !== "string" || !templateId) {
    return NextResponse.json({ error: "templateId is required" }, { status: 400 });
  }

  try {
    await assertProjectMember(user, projectId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const inspection = await createInspection({
      projectId,
      createdById: user.id,
      templateId,
      areaId: typeof areaId === "string" && areaId ? areaId : undefined,
      assigneeId: typeof assigneeId === "string" && assigneeId ? assigneeId : undefined,
      inspectorId: typeof inspectorId === "string" && inspectorId ? inspectorId : undefined,
      dueDate: typeof dueDate === "string" && dueDate ? new Date(dueDate) : undefined,
    });
    return NextResponse.json({ id: inspection.id, inspectionNumber: inspection.inspectionNumber });
  } catch (err) {
    if (err instanceof InspectionError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof ForbiddenPermissionError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error("POST /api/field/inspections failed:", err);
    return NextResponse.json({ error: "Failed to create the inspection. Please try again." }, { status: 500 });
  }
}
