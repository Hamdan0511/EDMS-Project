import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { assertProjectMember } from "@/lib/project-context";
import { createItp, ItpError } from "@/lib/services/field/itp-service";
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
  const { projectId, title, revision, discipline, activity, description, areaId, responsibleOrgId, items } = body as Record<string, unknown>;
  if (typeof projectId !== "string" || !projectId) {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 });
  }
  if (!Array.isArray(items)) {
    return NextResponse.json({ error: "items is required" }, { status: 400 });
  }

  try {
    await assertProjectMember(user, projectId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const itp = await createItp({
      projectId,
      createdById: user.id,
      title: typeof title === "string" ? title : "",
      revision: typeof revision === "string" ? revision : undefined,
      discipline: typeof discipline === "string" ? discipline : undefined,
      activity: typeof activity === "string" ? activity : undefined,
      description: typeof description === "string" ? description : undefined,
      areaId: typeof areaId === "string" && areaId ? areaId : undefined,
      responsibleOrgId: typeof responsibleOrgId === "string" && responsibleOrgId ? responsibleOrgId : undefined,
      items: items as never,
    });
    return NextResponse.json({ id: itp.id, itpNumber: itp.itpNumber });
  } catch (err) {
    if (err instanceof ItpError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof ForbiddenPermissionError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error("POST /api/field/itp failed:", err);
    return NextResponse.json({ error: "Failed to create the ITP. Please try again." }, { status: 500 });
  }
}
