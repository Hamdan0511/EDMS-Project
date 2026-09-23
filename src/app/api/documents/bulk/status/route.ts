import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { assertProjectMember } from "@/lib/project-context";
import { requirePermission, ForbiddenPermissionError } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { isDocumentStatus } from "@/lib/documents/status";

export async function PATCH(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const documentIds = Array.isArray(body?.documentIds) ? body.documentIds.filter((v: unknown) => typeof v === "string") : [];
  const status = typeof body?.status === "string" ? body.status : "";

  if (documentIds.length === 0) {
    return NextResponse.json({ error: "No documents selected" }, { status: 400 });
  }
  if (!isDocumentStatus(status)) {
    return NextResponse.json({ error: "Invalid status value" }, { status: 400 });
  }

  const documents = await prisma.document.findMany({
    where: { id: { in: documentIds } },
    select: { id: true, projectId: true },
  });
  if (documents.length === 0) {
    return NextResponse.json({ error: "No documents found" }, { status: 404 });
  }

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
  try {
    await requirePermission(user.id, "DOCUMENT_UPDATE", { projectId });
  } catch (err) {
    if (err instanceof ForbiddenPermissionError) {
      return NextResponse.json({ error: "Viewers cannot change document status" }, { status: 403 });
    }
    throw err;
  }

  const result = await prisma.document.updateMany({
    where: { id: { in: documents.map((d) => d.id) }, projectId },
    data: { status },
  });

  await logAudit({
    userId: user.id,
    projectId,
    action: "DOCUMENTS_BULK_STATUS_CHANGED",
    entityType: "Document",
    entityId: documents[0].id,
    metadata: { documentIds: documents.map((d) => d.id), status },
  });

  return NextResponse.json({ updated: result.count });
}
