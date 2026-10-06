import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { assertProjectMember } from "@/lib/project-context";
import { createPunchlist, PunchError } from "@/lib/services/field/punch-service";
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
  const { projectId, title, areaId, description, dueDate, ownerId } = body as Record<string, unknown>;
  if (typeof projectId !== "string" || !projectId) {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 });
  }

  try {
    await assertProjectMember(user, projectId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const punchlist = await createPunchlist({
      projectId,
      createdById: user.id,
      title: typeof title === "string" ? title : "",
      areaId: typeof areaId === "string" && areaId ? areaId : undefined,
      description: typeof description === "string" ? description : undefined,
      dueDate: typeof dueDate === "string" && dueDate ? new Date(dueDate) : undefined,
      ownerId: typeof ownerId === "string" && ownerId ? ownerId : undefined,
    });
    return NextResponse.json({ id: punchlist.id, punchlistNumber: punchlist.punchlistNumber });
  } catch (err) {
    if (err instanceof PunchError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof ForbiddenPermissionError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error("POST /api/field/punchlists failed:", err);
    return NextResponse.json({ error: "Failed to create the punchlist. Please try again." }, { status: 500 });
  }
}
