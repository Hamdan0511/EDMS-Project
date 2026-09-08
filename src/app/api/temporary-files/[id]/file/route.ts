import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { assertProjectMember } from "@/lib/project-context";
import { prisma } from "@/lib/prisma";
import { readStoredFile } from "@/lib/storage";
import { logAudit } from "@/lib/audit";

export async function GET(
  request: NextRequest,
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

  let buffer: Buffer;
  try {
    buffer = await readStoredFile(record.storedPath);
  } catch {
    console.error(`Missing stored file for temporary file ${record.id} (storedPath: ${record.storedPath})`);
    return NextResponse.json(
      { error: "This file could not be found. It may have been moved or removed outside the application." },
      { status: 404 },
    );
  }
  const forceDownload = request.nextUrl.searchParams.get("download") === "1";
  const canViewInline = record.mimeType === "application/pdf" || record.mimeType.startsWith("image/");
  const disposition = !forceDownload && canViewInline ? "inline" : "attachment";

  await logAudit({
    userId: user.id,
    projectId: record.projectId,
    action: forceDownload ? "TEMPORARY_FILE_DOWNLOADED" : "TEMPORARY_FILE_OPENED",
    entityType: "TemporaryFile",
    entityId: record.id,
    metadata: { fileName: record.originalFileName },
  });

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": record.mimeType,
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": `${disposition}; filename="${encodeURIComponent(record.originalFileName)}"`,
      "Content-Length": String(record.sizeBytes),
    },
  });
}
