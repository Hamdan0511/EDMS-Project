import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { assertProjectMember } from "@/lib/project-context";
import { prisma } from "@/lib/prisma";
import { recordInspectionResponses, InspectionError } from "@/lib/services/field/inspection-service";
import { ForbiddenPermissionError } from "@/lib/auth/permissions";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const { id } = await params;

  const record = await prisma.fieldInspection.findUnique({ where: { id }, select: { projectId: true } });
  if (!record) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    await assertProjectMember(user, record.projectId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || !Array.isArray(body.responses)) {
    return NextResponse.json({ error: "A valid responses[] list is required." }, { status: 400 });
  }

  try {
    const updated = await recordInspectionResponses({
      id,
      projectId: record.projectId,
      actingUserId: user.id,
      responses: body.responses as never,
    });
    return NextResponse.json({ id: updated?.id });
  } catch (err) {
    if (err instanceof InspectionError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof ForbiddenPermissionError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error(`PATCH /api/field/inspections/${id}/responses failed:`, err);
    return NextResponse.json({ error: "Failed to save the responses. Please try again." }, { status: 500 });
  }
}
