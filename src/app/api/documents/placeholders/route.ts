import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { assertProjectMember } from "@/lib/project-context";
import { requirePermission, ForbiddenPermissionError } from "@/lib/auth/permissions";
import { createPlaceholderDocument, DocumentError } from "@/lib/documents/service";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const { projectId, documentNo, title, typeName, discipline, description } = body as Record<string, unknown>;

  if (typeof projectId !== "string" || !projectId) {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 });
  }

  try {
    await assertProjectMember(user, projectId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await requirePermission(user.id, "DOCUMENT_CREATE", { projectId });
  } catch (err) {
    if (err instanceof ForbiddenPermissionError) {
      return NextResponse.json({ error: "Viewers cannot create placeholders" }, { status: 403 });
    }
    throw err;
  }

  try {
    const document = await createPlaceholderDocument({
      projectId,
      userId: user.id,
      documentNo: typeof documentNo === "string" ? documentNo : "",
      title: typeof title === "string" ? title : "",
      typeName: typeof typeName === "string" ? typeName : undefined,
      discipline: typeof discipline === "string" ? discipline : undefined,
      description: typeof description === "string" ? description : undefined,
    });
    return NextResponse.json({ id: document.id, documentNo: document.documentNo });
  } catch (err) {
    if (err instanceof DocumentError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("POST /api/documents/placeholders failed:", err);
    return NextResponse.json({ error: "Failed to create the placeholder. Please try again." }, { status: 500 });
  }
}
