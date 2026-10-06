import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { assertProjectMember } from "@/lib/project-context";
import { ForbiddenPermissionError } from "@/lib/auth/permissions";
import { addFieldComment, FieldCommentError } from "@/lib/field/comments";
import { FIELD_RECORD_PERMISSION, resolveFieldRecordProjectId } from "@/lib/field/record-permissions";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const { recordType, recordId, body: commentBody } = body as Record<string, unknown>;
  if (typeof recordType !== "string" || !FIELD_RECORD_PERMISSION[recordType]) {
    return NextResponse.json({ error: "Invalid recordType" }, { status: 400 });
  }
  if (typeof recordId !== "string" || !recordId) {
    return NextResponse.json({ error: "recordId is required" }, { status: 400 });
  }

  const projectId = await resolveFieldRecordProjectId(recordType, recordId);
  if (!projectId) {
    return NextResponse.json({ error: "Record not found" }, { status: 404 });
  }

  try {
    await assertProjectMember(user, projectId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const comment = await addFieldComment({
      recordType,
      recordId,
      projectId,
      authorId: user.id,
      governingPermission: FIELD_RECORD_PERMISSION[recordType],
      body: typeof commentBody === "string" ? commentBody : "",
    });
    return NextResponse.json({ id: comment.id });
  } catch (err) {
    if (err instanceof FieldCommentError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof ForbiddenPermissionError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error("POST /api/field/comments failed:", err);
    return NextResponse.json({ error: "Failed to add the comment. Please try again." }, { status: 500 });
  }
}
