import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { assertProjectMember } from "@/lib/project-context";
import { createInspectionTemplate, InspectionError } from "@/lib/services/field/inspection-service";
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
  const { projectId, name, description, groups } = body as Record<string, unknown>;
  if (typeof projectId !== "string" || !projectId) {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 });
  }
  if (!Array.isArray(groups)) {
    return NextResponse.json({ error: "groups is required" }, { status: 400 });
  }

  try {
    await assertProjectMember(user, projectId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const template = await createInspectionTemplate({
      projectId,
      createdById: user.id,
      name: typeof name === "string" ? name : "",
      description: typeof description === "string" ? description : undefined,
      groups: groups as never,
    });
    return NextResponse.json({ id: template.id });
  } catch (err) {
    if (err instanceof InspectionError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof ForbiddenPermissionError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error("POST /api/field/inspection-templates failed:", err);
    return NextResponse.json({ error: "Failed to create the template. Please try again." }, { status: 500 });
  }
}
