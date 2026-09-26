import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { assertProjectMember } from "@/lib/project-context";
import { prisma } from "@/lib/prisma";
import { addHazardControl, HazardError } from "@/lib/services/hse/hazard-service";
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

  const hazard = await prisma.hseHazard.findUnique({ where: { id }, select: { projectId: true } });
  if (!hazard) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    await assertProjectMember(user, hazard.projectId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    const control = await addHazardControl({
      hazardId: id,
      projectId: hazard.projectId,
      actingUserId: user.id,
      hierarchy: (body.hierarchy as never) ?? "ADMINISTRATIVE",
      description: typeof body.description === "string" ? body.description : "",
      ownerId: typeof body.ownerId === "string" ? body.ownerId : undefined,
      dueDate: typeof body.dueDate === "string" ? new Date(body.dueDate) : undefined,
    });
    return NextResponse.json({ id: control.id });
  } catch (err) {
    if (err instanceof HazardError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof ForbiddenPermissionError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error(`POST /api/hse/hazards/${id}/controls failed:`, err);
    return NextResponse.json({ error: "Failed to add the control. Please try again." }, { status: 500 });
  }
}
