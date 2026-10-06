import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { assertProjectMember } from "@/lib/project-context";
import { createFieldArea, FieldAreaError } from "@/lib/services/field/area-service";
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
  const { projectId, name, parentId, code, description, levelType } = body as Record<string, unknown>;
  if (typeof projectId !== "string" || !projectId) {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 });
  }

  try {
    await assertProjectMember(user, projectId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const area = await createFieldArea({
      projectId,
      actingUserId: user.id,
      name: typeof name === "string" ? name : "",
      parentId: typeof parentId === "string" ? parentId : undefined,
      code: typeof code === "string" ? code : undefined,
      description: typeof description === "string" ? description : undefined,
      levelType: typeof levelType === "string" ? levelType : undefined,
    });
    return NextResponse.json({ id: area.id, name: area.name });
  } catch (err) {
    if (err instanceof FieldAreaError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof ForbiddenPermissionError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error("POST /api/field/areas failed:", err);
    return NextResponse.json({ error: "Failed to create the location. Please try again." }, { status: 500 });
  }
}
