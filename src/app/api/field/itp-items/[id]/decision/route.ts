import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { assertProjectMember } from "@/lib/project-context";
import { prisma } from "@/lib/prisma";
import { approveHoldPoint, rejectHoldPoint, ItpError } from "@/lib/services/field/itp-service";
import { ForbiddenPermissionError } from "@/lib/auth/permissions";

/** The only route that can ever move a hold point to RELEASED — always as
 * the output of an "approve" decision, requiring FIELD_ITP_APPROVE, never a
 * direct status write. */
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

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || (body.decision !== "approve" && body.decision !== "reject")) {
    return NextResponse.json({ error: "decision must be 'approve' or 'reject'" }, { status: 400 });
  }

  try {
    const updated =
      body.decision === "approve"
        ? await approveHoldPoint({ itemId: id, projectId, actingUserId: user.id, note: typeof body.note === "string" ? body.note : undefined })
        : await rejectHoldPoint({ itemId: id, projectId, actingUserId: user.id, note: typeof body.note === "string" ? body.note : undefined });
    return NextResponse.json({ id: updated.id, status: updated.status });
  } catch (err) {
    if (err instanceof ItpError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof ForbiddenPermissionError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error(`POST /api/field/itp-items/${id}/decision failed:`, err);
    return NextResponse.json({ error: "Failed to record the decision. Please try again." }, { status: 500 });
  }
}
