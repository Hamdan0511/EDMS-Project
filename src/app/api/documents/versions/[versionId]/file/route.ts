import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { assertProjectMember } from "@/lib/project-context";
import { prisma } from "@/lib/prisma";
import { readStoredFile } from "@/lib/storage";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ versionId: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { versionId } = await params;
  const version = await prisma.documentVersion.findUnique({
    where: { id: versionId },
    include: { document: true },
  });
  if (!version) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    await assertProjectMember(user, version.document.projectId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let buffer: Buffer;
  try {
    buffer = await readStoredFile(version.storedPath);
  } catch {
    console.error(`Missing stored file for document version ${version.id} (storedPath: ${version.storedPath})`);
    return NextResponse.json(
      { error: "This file could not be found. It may have been moved or removed outside the application." },
      { status: 404 },
    );
  }
  const forceDownload = request.nextUrl.searchParams.get("download") === "1";
  const canViewInline = version.mimeType === "application/pdf" || version.mimeType.startsWith("image/");
  const disposition = !forceDownload && canViewInline ? "inline" : "attachment";

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": version.mimeType,
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": `${disposition}; filename="${encodeURIComponent(version.fileName)}"`,
      "Content-Length": String(version.sizeBytes),
    },
  });
}
