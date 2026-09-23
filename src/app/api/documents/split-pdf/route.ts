import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { assertProjectMember } from "@/lib/project-context";
import { requirePermission, ForbiddenPermissionError } from "@/lib/auth/permissions";
import {
  splitPdfIntoTemporaryFiles,
  SplitPdfValidationError,
  MAX_SIZE_BYTES,
} from "@/lib/documents/split-pdf-service";

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
      return NextResponse.json(
        { error: "Viewers cannot upload or split documents" },
        { status: 403 },
      );
    }
    throw err;
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "A PDF file is required" }, { status: 400 });
  }
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json(
      { error: "The file is too large. Maximum file size is 200MB." },
      { status: 400 },
    );
  }

  try {
    const result = await splitPdfIntoTemporaryFiles({
      projectId,
      userId: user.id,
      userName: user.name,
      file,
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof SplitPdfValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("Split PDF failed:", err);
    return NextResponse.json(
      { error: "Failed to process the PDF. Please try again." },
      { status: 500 },
    );
  }
}
