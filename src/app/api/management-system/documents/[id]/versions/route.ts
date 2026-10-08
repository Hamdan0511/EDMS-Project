import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { assertProjectMember } from "@/lib/project-context";
import { prisma } from "@/lib/prisma";
import { addManagementSystemDocumentVersion, ManagementSystemError } from "@/lib/services/management-system/document-service";
import { ForbiddenPermissionError } from "@/lib/auth/permissions";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const { id } = await params;

  const document = await prisma.managementSystemDocument.findUnique({ where: { id }, select: { projectId: true } });
  if (!document) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    await assertProjectMember(user, document.projectId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const form = await request.formData();
  const revision = form.get("revision");
  const notes = form.get("notes");
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "A file is required" }, { status: 400 });
  }

  try {
    const version = await addManagementSystemDocumentVersion({
      id,
      projectId: document.projectId,
      actingUserId: user.id,
      revision: typeof revision === "string" ? revision : "",
      file,
      notes: typeof notes === "string" ? notes : undefined,
    });
    return NextResponse.json({ id: version.id, revision: version.revision, versionNo: version.versionNo });
  } catch (err) {
    if (err instanceof ManagementSystemError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof ForbiddenPermissionError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error(`POST /api/management-system/documents/${id}/versions failed:`, err);
    return NextResponse.json({ error: "Failed to add the new version. Please try again." }, { status: 500 });
  }
}
