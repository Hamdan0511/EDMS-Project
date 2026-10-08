import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { assertProjectMember } from "@/lib/project-context";
import { hasPermission } from "@/lib/auth/permissions";
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
  const certificate = await prisma.managementSystemCertificate.findUnique({ where: { id } });
  if (!certificate) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    await assertProjectMember(user, certificate.projectId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const allowed = await hasPermission(user.id, "MANAGEMENT_SYSTEM_VIEW", { projectId: certificate.projectId });
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const forceDownload = request.nextUrl.searchParams.get("download") === "1";
  if (forceDownload) {
    const canDownload = await hasPermission(user.id, "MANAGEMENT_SYSTEM_DOWNLOAD", { projectId: certificate.projectId });
    if (!canDownload) {
      return NextResponse.json({ error: "You do not have permission to download certificates." }, { status: 403 });
    }
  }

  let buffer: Buffer;
  try {
    buffer = await readStoredFile(certificate.storedPath);
  } catch {
    console.error(`Missing stored file for certificate ${certificate.id} (storedPath: ${certificate.storedPath})`);
    return NextResponse.json({ error: "This certificate's file could not be found." }, { status: 404 });
  }

  const disposition = forceDownload ? "attachment" : "inline";

  await logAudit({
    userId: user.id,
    projectId: certificate.projectId,
    action: forceDownload ? "MANAGEMENT_SYSTEM_CERTIFICATE_DOWNLOADED" : "MANAGEMENT_SYSTEM_CERTIFICATE_VIEWED",
    entityType: "ManagementSystemCertificate",
    entityId: certificate.id,
    metadata: { managementSystem: certificate.managementSystem },
  });

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": certificate.mimeType,
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": `${disposition}; filename="${encodeURIComponent(certificate.fileName)}"`,
      "Content-Length": String(certificate.sizeBytes),
    },
  });
}
