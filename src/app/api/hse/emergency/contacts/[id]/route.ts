import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { assertProjectMember } from "@/lib/project-context";
import { prisma } from "@/lib/prisma";
import { updateEmergencyContact, deleteEmergencyContact, EmergencyError } from "@/lib/services/hse/emergency-service";
import { ForbiddenPermissionError } from "@/lib/auth/permissions";

async function loadAndAuthorize(id: string) {
  const record = await prisma.hseEmergencyContact.findUnique({ where: { id }, select: { projectId: true } });
  return record;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const { id } = await params;
  const record = await loadAndAuthorize(id);
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
    const updated = await updateEmergencyContact({
      id,
      projectId: record.projectId,
      actingUserId: user.id,
      name: typeof body.name === "string" ? body.name : undefined,
      role: typeof body.role === "string" ? body.role : undefined,
      organizationId: typeof body.organizationId === "string" ? body.organizationId : body.organizationId === null ? null : undefined,
      phone: typeof body.phone === "string" ? body.phone : undefined,
      email: typeof body.email === "string" ? body.email : body.email === null ? null : undefined,
      emergencyType: typeof body.emergencyType === "string" ? body.emergencyType : body.emergencyType === null ? null : undefined,
      location: typeof body.location === "string" ? body.location : body.location === null ? null : undefined,
      availability: typeof body.availability === "string" ? body.availability : body.availability === null ? null : undefined,
      notes: typeof body.notes === "string" ? body.notes : body.notes === null ? null : undefined,
    });
    return NextResponse.json({ id: updated.id });
  } catch (err) {
    if (err instanceof EmergencyError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof ForbiddenPermissionError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error(`PATCH /api/hse/emergency/contacts/${id} failed:`, err);
    return NextResponse.json({ error: "Failed to update the emergency contact. Please try again." }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const { id } = await params;
  const record = await loadAndAuthorize(id);
  if (!record) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  try {
    await assertProjectMember(user, record.projectId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await deleteEmergencyContact({ id, projectId: record.projectId, actingUserId: user.id });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof EmergencyError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof ForbiddenPermissionError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error(`DELETE /api/hse/emergency/contacts/${id} failed:`, err);
    return NextResponse.json({ error: "Failed to delete the emergency contact. Please try again." }, { status: 500 });
  }
}
