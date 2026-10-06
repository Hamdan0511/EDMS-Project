import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { assertProjectMember } from "@/lib/project-context";
import { startSiteWalk, SiteWalkError } from "@/lib/services/field/site-walk-service";
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
  const { projectId, purpose, areaId } = body as Record<string, unknown>;
  if (typeof projectId !== "string" || !projectId) {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 });
  }

  try {
    await assertProjectMember(user, projectId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const walk = await startSiteWalk({
      projectId,
      actingUserId: user.id,
      purpose: typeof purpose === "string" ? purpose : "",
      areaId: typeof areaId === "string" && areaId ? areaId : undefined,
    });
    return NextResponse.json({ id: walk.id });
  } catch (err) {
    if (err instanceof SiteWalkError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof ForbiddenPermissionError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error("POST /api/field/site-walks failed:", err);
    return NextResponse.json({ error: "Failed to start the site walk. Please try again." }, { status: 500 });
  }
}
