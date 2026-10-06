import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { assertProjectMember } from "@/lib/project-context";
import { hasPermission } from "@/lib/auth/permissions";
import { saveFieldAttachment, FieldAttachmentError } from "@/lib/field/attachments";
import { FIELD_RECORD_PERMISSION, resolveFieldRecordProjectId } from "@/lib/field/record-permissions";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const form = await request.formData();
  const recordType = form.get("recordType");
  const recordId = form.get("recordId");
  const file = form.get("file");
  const category = form.get("category");

  if (typeof recordType !== "string" || !FIELD_RECORD_PERMISSION[recordType]) {
    return NextResponse.json({ error: "Invalid recordType" }, { status: 400 });
  }
  if (typeof recordId !== "string" || !recordId) {
    return NextResponse.json({ error: "recordId is required" }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "A file is required" }, { status: 400 });
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

  const allowed = await hasPermission(user.id, FIELD_RECORD_PERMISSION[recordType], { projectId });
  if (!allowed) {
    return NextResponse.json({ error: "You do not have permission to add evidence to this record" }, { status: 403 });
  }

  try {
    const attachment = await saveFieldAttachment({
      recordType,
      recordId,
      uploadedById: user.id,
      projectId,
      file,
      category: typeof category === "string" ? category : undefined,
    });
    return NextResponse.json({
      id: attachment.id,
      fileName: attachment.fileName,
      mimeType: attachment.mimeType,
      sizeBytes: attachment.sizeBytes,
    });
  } catch (err) {
    if (err instanceof FieldAttachmentError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("POST /api/field/attachments failed:", err);
    return NextResponse.json({ error: "Failed to upload the file. Please try again." }, { status: 500 });
  }
}
