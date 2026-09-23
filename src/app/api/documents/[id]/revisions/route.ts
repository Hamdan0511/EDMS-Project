import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { assertProjectMember } from "@/lib/project-context";
import { requirePermission, ForbiddenPermissionError } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";
import { addDocumentRevision, DocumentError } from "@/lib/documents/service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const document = await prisma.document.findUnique({ where: { id }, select: { projectId: true } });
  if (!document) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let membership;
  try {
    membership = await assertProjectMember(user, document.projectId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await requirePermission(user.id, "DOCUMENT_UPDATE", { projectId: document.projectId });
  } catch (err) {
    if (err instanceof ForbiddenPermissionError) {
      return NextResponse.json({ error: "Viewers cannot create revisions" }, { status: 403 });
    }
    throw err;
  }

  const form = await request.formData();
  const revision = form.get("revision");
  const notes = form.get("notes");
  const file = form.get("file");

  if (typeof revision !== "string" || !revision.trim()) {
    return NextResponse.json({ error: "Revision is required" }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "A file is required" }, { status: 400 });
  }

  try {
    const updated = await addDocumentRevision({
      id,
      projectId: membership.projectId,
      userId: user.id,
      revision,
      file,
      notes: typeof notes === "string" ? notes : undefined,
    });
    return NextResponse.json({ id: updated.id, currentRevision: updated.currentRevision });
  } catch (err) {
    if (err instanceof DocumentError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("Add revision failed:", err);
    return NextResponse.json({ error: "Failed to add the revision. Please try again." }, { status: 500 });
  }
}
