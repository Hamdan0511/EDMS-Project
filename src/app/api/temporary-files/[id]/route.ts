import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { assertProjectMember } from "@/lib/project-context";
import { requirePermission, ForbiddenPermissionError } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";
import { deleteTemporaryFile, TemporaryFileError } from "@/lib/temporary-files/service";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const record = await prisma.temporaryFile.findUnique({ where: { id } });
  if (!record) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    await assertProjectMember(user, record.projectId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await requirePermission(user.id, "DOCUMENT_DELETE", { projectId: record.projectId });
  } catch (err) {
    if (err instanceof ForbiddenPermissionError) {
      return NextResponse.json({ error: "Viewers cannot delete temporary files" }, { status: 403 });
    }
    throw err;
  }

  try {
    await deleteTemporaryFile({ id, projectId: record.projectId, userId: user.id });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof TemporaryFileError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }
}
