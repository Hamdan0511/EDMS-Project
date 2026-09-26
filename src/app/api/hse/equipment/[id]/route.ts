import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { assertProjectMember } from "@/lib/project-context";
import { prisma } from "@/lib/prisma";
import { updateEquipment, EquipmentError } from "@/lib/services/hse/equipment-service";
import { ForbiddenPermissionError } from "@/lib/auth/permissions";

// Metadata only — never accepts a `status` field. Equipment status only
// changes as the server-computed result of an inspection (see
// /api/hse/equipment/[id]/inspections and .../reinspect).
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const { id } = await params;

  const record = await prisma.hseEquipment.findUnique({ where: { id }, select: { projectId: true } });
  if (!record) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    await assertProjectMember(user, record.projectId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    const updated = await updateEquipment({
      id,
      projectId: record.projectId,
      actingUserId: user.id,
      equipmentType: typeof body.equipmentType === "string" ? body.equipmentType : undefined,
      description: typeof body.description === "string" ? body.description : undefined,
      makeModel: typeof body.makeModel === "string" ? body.makeModel : undefined,
      serialNumber: typeof body.serialNumber === "string" ? body.serialNumber : undefined,
      location: typeof body.location === "string" ? body.location : undefined,
      organizationId: typeof body.organizationId === "string" ? body.organizationId : body.organizationId === null ? null : undefined,
      responsiblePersonId:
        typeof body.responsiblePersonId === "string" ? body.responsiblePersonId : body.responsiblePersonId === null ? null : undefined,
      riskLevel: typeof body.riskLevel === "string" ? (body.riskLevel as never) : body.riskLevel === null ? null : undefined,
    });
    return NextResponse.json({ id: updated.id });
  } catch (err) {
    if (err instanceof EquipmentError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof ForbiddenPermissionError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error(`PATCH /api/hse/equipment/${id} failed:`, err);
    return NextResponse.json({ error: "Failed to update the equipment record. Please try again." }, { status: 500 });
  }
}
