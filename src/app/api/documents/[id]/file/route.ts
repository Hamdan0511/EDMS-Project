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
  const document = await prisma.document.findUnique({
    where: { id },
    include: { versions: { orderBy: { versionNo: "desc" }, take: 1 } },
  });
  if (!document || document.versions.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    await assertProjectMember(user, document.projectId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const version = document.versions[0];
  let buffer: Buffer;
  try {
    buffer = await readStoredFile(version.storedPath);
  } catch {
    console.error(`Missing stored file for document ${document.id} (storedPath: ${version.storedPath})`);
    return NextResponse.json(
      { error: "The file for this document could not be found. It may have been moved or removed outside the application." },
      { status: 404 },
    );
  }

  const forceDownload = request.nextUrl.searchParams.get("download") === "1";
  const canViewInline = version.mimeType === "application/pdf" || version.mimeType.startsWith("image/");
  const disposition = !forceDownload && canViewInline ? "inline" : "attachment";

  await logAudit({
    userId: user.id,
    projectId: document.projectId,
    action: forceDownload ? "DOCUMENT_DOWNLOADED" : "DOCUMENT_OPENED",
    entityType: "Document",
    entityId: document.id,
    metadata: { documentNo: document.documentNo, fileName: version.fileName },
  });

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": version.mimeType,
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": `${disposition}; filename="${encodeURIComponent(version.fileName)}"`,
      "Content-Length": String(version.sizeBytes),
    },
  });
}
