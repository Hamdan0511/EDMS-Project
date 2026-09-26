import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { assertProjectMember } from "@/lib/project-context";
import { hasPermission } from "@/lib/auth/permissions";
import { saveHseAttachment, HseAttachmentError } from "@/lib/hse/attachments";
import { HSE_RECORD_PERMISSION, resolveHseRecordProjectId } from "@/lib/hse/record-permissions";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const form = await request.formData();
  const recordType = form.get("recordType");
  const recordId = form.get("recordId");
  const file = form.get("file");

  if (typeof recordType !== "string" || !HSE_RECORD_PERMISSION[recordType]) {
    return NextResponse.json({ error: "Invalid recordType" }, { status: 400 });
  }
  if (typeof recordId !== "string" || !recordId) {
    return NextResponse.json({ error: "recordId is required" }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "A file is required" }, { status: 400 });
  }

  const projectId = await resolveHseRecordProjectId(recordType, recordId);
  if (!projectId) {
    return NextResponse.json({ error: "Record not found" }, { status: 404 });
  }

  try {
    await assertProjectMember(user, projectId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const allowed = await hasPermission(user.id, HSE_RECORD_PERMISSION[recordType], { projectId });
  if (!allowed) {
    return NextResponse.json({ error: "You do not have permission to add evidence to this record" }, { status: 403 });
  }

  try {
    const attachment = await saveHseAttachment({ recordType, recordId, uploadedById: user.id, projectId, file });
    return NextResponse.json({
      id: attachment.id,
      fileName: attachment.fileName,
      mimeType: attachment.mimeType,
      sizeBytes: attachment.sizeBytes,
    });
  } catch (err) {
    if (err instanceof HseAttachmentError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("POST /api/hse/attachments failed:", err);
    return NextResponse.json({ error: "Failed to upload the file. Please try again." }, { status: 500 });
  }
}
