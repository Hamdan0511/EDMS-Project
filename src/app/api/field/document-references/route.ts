import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { assertProjectMember } from "@/lib/project-context";
import { hasPermission } from "@/lib/auth/permissions";
import { linkFieldDocument, FieldDocumentReferenceError } from "@/lib/field/document-references";
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
  const { recordType, recordId, documentId } = body as Record<string, unknown>;

  if (typeof recordType !== "string" || !FIELD_RECORD_PERMISSION[recordType]) {
    return NextResponse.json({ error: "Invalid recordType" }, { status: 400 });
  }
  if (typeof recordId !== "string" || !recordId) {
    return NextResponse.json({ error: "recordId is required" }, { status: 400 });
  }
  if (typeof documentId !== "string" || !documentId) {
    return NextResponse.json({ error: "documentId is required" }, { status: 400 });
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
    return NextResponse.json({ error: "You do not have permission to link documents to this record" }, { status: 403 });
  }

  try {
    const reference = await linkFieldDocument({ recordType, recordId, projectId, documentId, actingUserId: user.id });
    return NextResponse.json({ id: reference.id });
  } catch (err) {
    if (err instanceof FieldDocumentReferenceError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("POST /api/field/document-references failed:", err);
    return NextResponse.json({ error: "Failed to link the document. Please try again." }, { status: 500 });
  }
}
