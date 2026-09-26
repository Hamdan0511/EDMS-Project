import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { assertProjectMember } from "@/lib/project-context";
import { createCorrectiveAction, CorrectiveActionError } from "@/lib/services/hse/corrective-action-service";
import { ForbiddenPermissionError } from "@/lib/auth/permissions";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const b = body as Record<string, unknown>;
  if (typeof b.projectId !== "string" || !b.projectId) {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 });
  }

  try {
    await assertProjectMember(user, b.projectId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const action = await createCorrectiveAction({
      projectId: b.projectId,
      createdById: user.id,
      sourceType: typeof b.sourceType === "string" ? b.sourceType : "manual",
      sourceId: typeof b.sourceId === "string" ? b.sourceId : undefined,
      description: typeof b.description === "string" ? b.description : "",
      assignedToId: typeof b.assignedToId === "string" ? b.assignedToId : undefined,
      priority: (b.priority as never) ?? undefined,
      dueDate: typeof b.dueDate === "string" ? new Date(b.dueDate) : undefined,
    });
    return NextResponse.json({ id: action.id, actionNumber: action.actionNumber });
  } catch (err) {
    if (err instanceof CorrectiveActionError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof ForbiddenPermissionError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error("POST /api/hse/corrective-actions failed:", err);
    return NextResponse.json({ error: "Failed to create the corrective action. Please try again." }, { status: 500 });
  }
}
