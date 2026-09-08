import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import { getCurrentUser } from "@/lib/auth/session";
import { assertProjectMember } from "@/lib/project-context";
import { prisma } from "@/lib/prisma";
import { readStoredFile } from "@/lib/storage";
import { logAudit } from "@/lib/audit";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const documentIds = Array.isArray(body?.documentIds) ? body.documentIds.filter((v: unknown) => typeof v === "string") : [];
  if (documentIds.length === 0) {
    return NextResponse.json({ error: "No documents selected" }, { status: 400 });
  }

  const documents = await prisma.document.findMany({
    where: { id: { in: documentIds } },
    include: { versions: { orderBy: { versionNo: "desc" }, take: 1 } },
  });
  if (documents.length === 0) {
    return NextResponse.json({ error: "No documents found" }, { status: 404 });
  }

  // All selected documents must belong to the same project, and the user
  // must be a member of it — prevents cross-project data exfiltration via a
  // crafted documentIds list.
  const projectIds = new Set(documents.map((d) => d.projectId));
  if (projectIds.size !== 1) {
    return NextResponse.json({ error: "Selected documents must belong to a single project" }, { status: 400 });
  }
  const projectId = [...projectIds][0];
  try {
    await assertProjectMember(user, projectId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const zip = new JSZip();
  const usedNames = new Set<string>();
  const missing: string[] = [];
  for (const doc of documents) {
    const version = doc.versions[0];
    if (!version) continue;
    let buffer;
    try {
      buffer = await readStoredFile(version.storedPath);
    } catch {
      console.error(`Missing stored file for document ${doc.id} (storedPath: ${version.storedPath}) — skipped in bulk download`);
      missing.push(doc.documentNo);
      continue;
    }
    let name = `${doc.documentNo} - ${doc.title}${extensionOf(version.fileName)}`.replace(/[\\/:*?"<>|]/g, "_");
    let suffix = 1;
    while (usedNames.has(name)) {
      name = `${doc.documentNo} - ${doc.title} (${suffix++})${extensionOf(version.fileName)}`.replace(/[\\/:*?"<>|]/g, "_");
    }
    usedNames.add(name);
    zip.file(name, buffer);
  }

  if (missing.length === documents.length) {
    return NextResponse.json(
      { error: "None of the selected documents' files could be found on disk." },
      { status: 404 },
    );
  }

  const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });

  await logAudit({
    userId: user.id,
    projectId,
    action: "DOCUMENTS_BULK_DOWNLOADED",
    entityType: "Document",
    entityId: documentIds[0],
    metadata: { documentIds },
  });

  return new NextResponse(new Uint8Array(zipBuffer), {
    headers: {
      "Content-Type": "application/zip",
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": `attachment; filename="documents-export-${Date.now()}.zip"`,
    },
  });
}

function extensionOf(fileName: string): string {
  const match = /\.[a-z0-9]+$/i.exec(fileName);
  return match ? match[0] : "";
}
