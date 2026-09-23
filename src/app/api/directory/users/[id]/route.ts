import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { assertProjectMember } from "@/lib/project-context";
import { updateUserDirectoryInfo, UserDirectoryError } from "@/lib/services/user-directory-service";
import { ForbiddenPermissionError } from "@/lib/auth/permissions";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const { id } = await params;

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const { projectId, jobTitle, division, phone, address, visibility, isActive } = body as Record<string, unknown>;
  if (typeof projectId !== "string" || !projectId) {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 });
  }

  try {
    await assertProjectMember(user, projectId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (visibility !== undefined && visibility !== "VISIBLE" && visibility !== "HIDDEN") {
    return NextResponse.json({ error: "visibility must be VISIBLE or HIDDEN" }, { status: 400 });
  }

  try {
    const updated = await updateUserDirectoryInfo({
      targetUserId: id,
      actingUserId: user.id,
      projectId,
      jobTitle: typeof jobTitle === "string" ? jobTitle || null : undefined,
      division: typeof division === "string" ? division || null : undefined,
      phone: typeof phone === "string" ? phone || null : undefined,
      address: typeof address === "string" ? address || null : undefined,
      visibility: visibility as "VISIBLE" | "HIDDEN" | undefined,
      isActive: typeof isActive === "boolean" ? isActive : undefined,
    });
    return NextResponse.json({ id: updated.id });
  } catch (err) {
    if (err instanceof UserDirectoryError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof ForbiddenPermissionError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error(`PATCH /api/directory/users/${id} failed:`, err);
    return NextResponse.json({ error: "Failed to update the user. Please try again." }, { status: 500 });
  }
}
