import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { assertProjectMember } from "@/lib/project-context";
import { prisma } from "@/lib/prisma";
import { updateNearMissStatus, NearMissError } from "@/lib/services/hse/near-miss-service";
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

  const record = await prisma.hseNearMiss.findUnique({ where: { id }, select: { projectId: true } });
  if (!record) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    await assertProjectMember(user, record.projectId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const status = (await request.json().catch(() => null) as Record<string, unknown> | null)?.status;
  if (typeof status !== "string" || !["OPEN", "IN_PROGRESS", "CLOSED"].includes(status)) {
    return NextResponse.json({ error: "A valid status is required" }, { status: 400 });
  }

  try {
    const updated = await updateNearMissStatus({
      id,
      projectId: record.projectId,
      actingUserId: user.id,
      status: status as never,
    });
    return NextResponse.json({ id: updated.id, status: updated.status });
  } catch (err) {
    if (err instanceof NearMissError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof ForbiddenPermissionError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error(`PATCH /api/hse/near-misses/${id} failed:`, err);
    return NextResponse.json({ error: "Failed to update the near miss. Please try again." }, { status: 500 });
  }
}
