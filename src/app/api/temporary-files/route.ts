import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { assertProjectMember } from "@/lib/project-context";
import { requirePermission, ForbiddenPermissionError } from "@/lib/auth/permissions";
import { uploadTemporaryFile, TemporaryFileError } from "@/lib/temporary-files/service";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const form = await request.formData();
  const projectId = form.get("projectId");
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
      return NextResponse.json({ error: "Viewers cannot upload temporary files" }, { status: 403 });
    }
    throw err;
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "A file is required" }, { status: 400 });
  }

  try {
    const record = await uploadTemporaryFile({ projectId, uploadedById: user.id, file });
    return NextResponse.json({
      id: record.id,
      originalFileName: record.originalFileName,
      sizeBytes: record.sizeBytes,
      status: record.status,
    });
  } catch (err) {
    if (err instanceof TemporaryFileError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("Temporary file upload failed:", err);
    return NextResponse.json({ error: "Failed to upload the file. Please try again." }, { status: 500 });
  }
}
