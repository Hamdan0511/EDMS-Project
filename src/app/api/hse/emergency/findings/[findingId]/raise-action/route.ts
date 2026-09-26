import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { assertProjectMember } from "@/lib/project-context";
import { prisma } from "@/lib/prisma";
import { raiseFindingCorrectiveAction, EmergencyError } from "@/lib/services/hse/emergency-service";
import { CorrectiveActionError } from "@/lib/services/hse/corrective-action-service";
import { ForbiddenPermissionError } from "@/lib/auth/permissions";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ findingId: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const { findingId } = await params;

  const finding = await prisma.hseEmergencyDrillFinding.findUnique({
    where: { id: findingId },
    include: { drill: { select: { projectId: true } } },
  });
  if (!finding) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    await assertProjectMember(user, finding.drill.projectId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;

  try {
    const action = await raiseFindingCorrectiveAction({
      findingId,
      projectId: finding.drill.projectId,
      actingUserId: user.id,
      assignedToId: typeof body?.assignedToId === "string" ? body.assignedToId : undefined,
      priority: typeof body?.priority === "string" ? (body.priority as never) : undefined,
      dueDate: typeof body?.dueDate === "string" ? new Date(body.dueDate) : undefined,
    });
    return NextResponse.json({ id: action.id, actionNumber: action.actionNumber });
  } catch (err) {
    if (err instanceof EmergencyError || err instanceof CorrectiveActionError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof ForbiddenPermissionError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error(`POST /api/hse/emergency/findings/${findingId}/raise-action failed:`, err);
    return NextResponse.json({ error: "Failed to raise the corrective action. Please try again." }, { status: 500 });
  }
}
