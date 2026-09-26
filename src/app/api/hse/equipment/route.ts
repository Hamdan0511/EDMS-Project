import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { assertProjectMember } from "@/lib/project-context";
import { createEquipment, EquipmentError } from "@/lib/services/hse/equipment-service";
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
  const {
    projectId,
    equipmentType,
    description,
    makeModel,
    serialNumber,
    location,
    organizationId,
    responsiblePersonId,
    riskLevel,
  } = body as Record<string, unknown>;
  if (typeof projectId !== "string" || !projectId) {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 });
  }

  try {
    await assertProjectMember(user, projectId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const equipment = await createEquipment({
      projectId,
      createdById: user.id,
      equipmentType: typeof equipmentType === "string" ? equipmentType : "",
      description: typeof description === "string" ? description : "",
      makeModel: typeof makeModel === "string" ? makeModel : undefined,
      serialNumber: typeof serialNumber === "string" ? serialNumber : undefined,
      location: typeof location === "string" ? location : undefined,
      organizationId: typeof organizationId === "string" ? organizationId : undefined,
      responsiblePersonId: typeof responsiblePersonId === "string" ? responsiblePersonId : undefined,
      riskLevel: typeof riskLevel === "string" ? (riskLevel as never) : undefined,
    });
    return NextResponse.json({ id: equipment.id, equipmentNumber: equipment.equipmentNumber });
  } catch (err) {
    if (err instanceof EquipmentError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof ForbiddenPermissionError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error("POST /api/hse/equipment failed:", err);
    return NextResponse.json({ error: "Failed to create the equipment record. Please try again." }, { status: 500 });
  }
}
