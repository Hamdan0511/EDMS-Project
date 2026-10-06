import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { assertProjectMember } from "@/lib/project-context";
import { createPunchItem, PunchError } from "@/lib/services/field/punch-service";
import { SiteWalkError } from "@/lib/services/field/site-walk-service";
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
  const { projectId, punchlistId, title, description, areaId, siteWalkId, tradeName, priority, responsibleOrgId, responsibleUserId, dueDate } =
    body as Record<string, unknown>;
  if (typeof projectId !== "string" || !projectId) {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 });
  }

  try {
    await assertProjectMember(user, projectId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const item = await createPunchItem({
      projectId,
      createdById: user.id,
      punchlistId: typeof punchlistId === "string" && punchlistId ? punchlistId : undefined,
      title: typeof title === "string" ? title : "",
      description: typeof description === "string" ? description : "",
      areaId: typeof areaId === "string" && areaId ? areaId : undefined,
      siteWalkId: typeof siteWalkId === "string" && siteWalkId ? siteWalkId : undefined,
      tradeName: typeof tradeName === "string" && tradeName ? tradeName : undefined,
      priority: typeof priority === "string" ? (priority as never) : undefined,
      responsibleOrgId: typeof responsibleOrgId === "string" && responsibleOrgId ? responsibleOrgId : undefined,
      responsibleUserId: typeof responsibleUserId === "string" && responsibleUserId ? responsibleUserId : undefined,
      dueDate: typeof dueDate === "string" && dueDate ? new Date(dueDate) : undefined,
    });
    return NextResponse.json({ id: item.id, punchItemNumber: item.punchItemNumber });
  } catch (err) {
    if (err instanceof PunchError || err instanceof SiteWalkError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof ForbiddenPermissionError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error("POST /api/field/punch-items failed:", err);
    return NextResponse.json({ error: "Failed to create the punch item. Please try again." }, { status: 500 });
  }
}
