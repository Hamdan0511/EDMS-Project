import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { assertProjectMember } from "@/lib/project-context";
import { createEmergencyProcedure, EmergencyError } from "@/lib/services/hse/emergency-service";
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
  const { projectId, title, emergencyType, immediateActions, evacuationInstructions, assemblyPoint, requiredEquipment, steps } =
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
    const procedure = await createEmergencyProcedure({
      projectId,
      createdById: user.id,
      title: typeof title === "string" ? title : "",
      emergencyType: typeof emergencyType === "string" ? emergencyType : "OTHER",
      immediateActions: typeof immediateActions === "string" ? immediateActions : "",
      evacuationInstructions: typeof evacuationInstructions === "string" ? evacuationInstructions : undefined,
      assemblyPoint: typeof assemblyPoint === "string" ? assemblyPoint : undefined,
      requiredEquipment: typeof requiredEquipment === "string" ? requiredEquipment : undefined,
      steps: typeof steps === "string" ? steps : undefined,
    });
    return NextResponse.json({ id: procedure.id });
  } catch (err) {
    if (err instanceof EmergencyError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof ForbiddenPermissionError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error("POST /api/hse/emergency/procedures failed:", err);
    return NextResponse.json({ error: "Failed to create the procedure. Please try again." }, { status: 500 });
  }
}
