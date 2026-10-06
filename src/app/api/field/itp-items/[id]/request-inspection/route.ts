import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { assertProjectMember } from "@/lib/project-context";
import { prisma } from "@/lib/prisma";
import { requestHoldPointInspection, ItpError } from "@/lib/services/field/itp-service";
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

  const item = await prisma.fieldItpItem.findUnique({ where: { id }, select: { itp: { select: { projectId: true } } } });
  if (!item) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const projectId = item.itp.projectId;

  try {
    await assertProjectMember(user, projectId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const updated = await requestHoldPointInspection({ itemId: id, projectId, actingUserId: user.id });
    return NextResponse.json({ id: updated.id, status: updated.status });
  } catch (err) {
    if (err instanceof ItpError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof ForbiddenPermissionError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error(`POST /api/field/itp-items/${id}/request-inspection failed:`, err);
    return NextResponse.json({ error: "Failed to request inspection. Please try again." }, { status: 500 });
  }
}
