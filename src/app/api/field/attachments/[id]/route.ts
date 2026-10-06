import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { assertProjectMember } from "@/lib/project-context";
import { hasPermission } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";
import { readStoredFile } from "@/lib/storage";
import { deleteFieldAttachment, FieldAttachmentError } from "@/lib/field/attachments";
import { FIELD_RECORD_PERMISSION, resolveFieldRecordProjectId } from "@/lib/field/record-permissions";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const { id } = await params;

  const attachment = await prisma.fieldAttachment.findUnique({ where: { id } });
  if (!attachment) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const projectId = await resolveFieldRecordProjectId(attachment.recordType, attachment.recordId);
  if (!projectId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    await assertProjectMember(user, projectId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let buffer: Buffer;
  try {
    buffer = await readStoredFile(attachment.storedPath);
  } catch {
    console.error(`Missing stored file for Field attachment ${attachment.id} (storedPath: ${attachment.storedPath})`);
    return NextResponse.json({ error: "This file could not be found." }, { status: 404 });
  }

  const forceDownload = request.nextUrl.searchParams.get("download") === "1";
  const canViewInline = attachment.mimeType === "application/pdf" || attachment.mimeType.startsWith("image/");
  const disposition = !forceDownload && canViewInline ? "inline" : "attachment";

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": attachment.mimeType,
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": `${disposition}; filename="${encodeURIComponent(attachment.fileName)}"`,
      "Content-Length": String(attachment.sizeBytes),
    },
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const { id } = await params;

  const attachment = await prisma.fieldAttachment.findUnique({ where: { id } });
  if (!attachment) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const projectId = await resolveFieldRecordProjectId(attachment.recordType, attachment.recordId);
  if (!projectId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    await assertProjectMember(user, projectId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const canManage = await hasPermission(user.id, FIELD_RECORD_PERMISSION[attachment.recordType], { projectId });

  try {
    await deleteFieldAttachment({
      id,
      recordType: attachment.recordType,
      recordId: attachment.recordId,
      actingUserId: user.id,
      projectId,
      canDelete: canManage,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof FieldAttachmentError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error(`DELETE /api/field/attachments/${id} failed:`, err);
    return NextResponse.json({ error: "Failed to delete the attachment. Please try again." }, { status: 500 });
  }
}
