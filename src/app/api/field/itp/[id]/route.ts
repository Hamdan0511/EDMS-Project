import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { assertProjectMember } from "@/lib/project-context";
import { prisma } from "@/lib/prisma";
import { approveItp, rejectItp, ItpError } from "@/lib/services/field/itp-service";
import { ForbiddenPermissionError } from "@/lib/auth/permissions";

/** Status-only, and intentionally narrow: only "APPROVED" and "REJECTED"
 * are accepted here — approval is the real trigger that activates hold
 * points server-side (see itp-service.ts's approveItp), never a free-form
 * status write. */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const { id } = await params;

  const record = await prisma.fieldItp.findUnique({ where: { id }, select: { projectId: true } });
  if (!record) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    await assertProjectMember(user, record.projectId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || (body.status !== "APPROVED" && body.status !== "REJECTED")) {
    return NextResponse.json({ error: "status must be APPROVED or REJECTED" }, { status: 400 });
  }

  try {
    const updated =
      body.status === "APPROVED"
        ? await approveItp({ id, projectId: record.projectId, actingUserId: user.id })
        : await rejectItp({ id, projectId: record.projectId, actingUserId: user.id });
    return NextResponse.json({ id: updated?.id, status: updated?.status });
  } catch (err) {
    if (err instanceof ItpError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof ForbiddenPermissionError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error(`PATCH /api/field/itp/${id} failed:`, err);
    return NextResponse.json({ error: "Failed to update the ITP. Please try again." }, { status: 500 });
  }
}
