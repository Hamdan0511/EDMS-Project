import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { assertProjectMember } from "@/lib/project-context";
import { prisma } from "@/lib/prisma";
import { beginInspection, saveInspectionResponses, completeInspection, InspectionError } from "@/lib/services/hse/inspection-service";
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

  const record = await prisma.hseInspection.findUnique({ where: { id }, select: { projectId: true } });
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
    if (body.action === "start") {
      const updated = await beginInspection({ id, projectId: record.projectId, actingUserId: user.id });
      return NextResponse.json({ id: updated.id, status: updated.status });
    }

    if (body.action === "complete") {
      const updated = await completeInspection({ id, projectId: record.projectId, actingUserId: user.id });
      return NextResponse.json({ id: updated.id, status: updated.status, result: updated.result });
    }

    if (Array.isArray(body.responses)) {
      const updated = await saveInspectionResponses({
        id,
        projectId: record.projectId,
        actingUserId: user.id,
        responses: body.responses as { questionId: string; answer?: string; comment?: string }[],
      });
      return NextResponse.json({ id: updated.id });
    }

    return NextResponse.json({ error: "No recognized fields to update" }, { status: 400 });
  } catch (err) {
    if (err instanceof InspectionError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof ForbiddenPermissionError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error(`PATCH /api/hse/inspections/${id} failed:`, err);
    return NextResponse.json({ error: "Failed to update the inspection. Please try again." }, { status: 500 });
  }
}
