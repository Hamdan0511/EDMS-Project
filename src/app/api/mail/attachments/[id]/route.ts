import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { assertProjectMember } from "@/lib/project-context";
import { prisma } from "@/lib/prisma";
import { readStoredFile } from "@/lib/storage";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const attachment = await prisma.mailAttachment.findUnique({
    where: { id },
    include: { mail: true },
  });
  if (!attachment) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    await assertProjectMember(user, attachment.mail.projectId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Drafts are only visible to their author.
  if (attachment.mail.status === "DRAFT" && attachment.mail.senderId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let buffer: Buffer;
  try {
    buffer = await readStoredFile(attachment.storedPath);
  } catch {
    console.error(`Missing stored file for mail attachment ${attachment.id} (storedPath: ${attachment.storedPath})`);
    return NextResponse.json(
      { error: "This attachment could not be found. It may have been moved or removed outside the application." },
      { status: 404 },
    );
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
