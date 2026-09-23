import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { assertProjectMember } from "@/lib/project-context";
import { requirePermission, ForbiddenPermissionError } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";
import { bulkUpdateDocumentMetadata, DocumentError } from "@/lib/documents/service";

const ALLOWED_FIELDS = ["typeName", "discipline", "status", "description"] as const;

export async function PATCH(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const documentIds = Array.isArray(body?.documentIds)
    ? body.documentIds.filter((v: unknown) => typeof v === "string")
    : [];
  const field = typeof body?.field === "string" ? body.field : "";
  const value = typeof body?.value === "string" ? body.value : "";

  if (documentIds.length === 0) {
    return NextResponse.json({ error: "No documents selected" }, { status: 400 });
  }
  if (!ALLOWED_FIELDS.includes(field as (typeof ALLOWED_FIELDS)[number])) {
    return NextResponse.json({ error: "Invalid field" }, { status: 400 });
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
      return NextResponse.json({ error: "Viewers cannot bulk-update documents" }, { status: 403 });
    }
    throw err;
  }

  try {
    const updated = await bulkUpdateDocumentMetadata({
      projectId,
      userId: user.id,
      documentIds: documents.map((d) => d.id),
      field: field as (typeof ALLOWED_FIELDS)[number],
      value,
    });
    return NextResponse.json({ updated });
  } catch (err) {
    if (err instanceof DocumentError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("PATCH /api/documents/bulk/metadata failed:", err);
    return NextResponse.json({ error: "Failed to update the selected documents." }, { status: 500 });
  }
}
