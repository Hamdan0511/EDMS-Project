import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { assertProjectMember } from "@/lib/project-context";
import { requirePermission, ForbiddenPermissionError } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";
import { deleteDocument, updateDocumentMetadata, DocumentError } from "@/lib/documents/service";

async function resolveMembership(request: NextRequest, id: string, permissionCode: string) {
  const user = await getCurrentUser();
  if (!user) {
    return { error: NextResponse.json({ error: "Not authenticated" }, { status: 401 }) };
  }

  const document = await prisma.document.findUnique({ where: { id }, select: { projectId: true } });
  if (!document) {
    return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  }

  let membership;
  try {
    membership = await assertProjectMember(user, document.projectId);
  } catch {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  try {
    await requirePermission(user.id, permissionCode, { projectId: document.projectId });
  } catch (err) {
    if (err instanceof ForbiddenPermissionError) {
      return { error: NextResponse.json({ error: "Viewers cannot modify documents" }, { status: 403 }) };
    }
    throw err;
  }

  return { user, membership };
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const resolved = await resolveMembership(request, id, "DOCUMENT_DELETE");
  if ("error" in resolved) return resolved.error;
  const { user, membership } = resolved;

  try {
    await deleteDocument({ id, projectId: membership.projectId, userId: user.id });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof DocumentError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const resolved = await resolveMembership(request, id, "DOCUMENT_UPDATE");
  if ("error" in resolved) return resolved.error;
  const { user, membership } = resolved;

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const { title, typeName, discipline, functionalBreakdown, spatialBreakdown, reviewStatus, status, description } =
    body as Record<string, unknown>;

  try {
    const updated = await updateDocumentMetadata({
      id,
      projectId: membership.projectId,
      userId: user.id,
      title: typeof title === "string" ? title : undefined,
      typeName: typeof typeName === "string" ? typeName : undefined,
      discipline: typeof discipline === "string" ? discipline : undefined,
      functionalBreakdown: typeof functionalBreakdown === "string" ? functionalBreakdown : undefined,
      spatialBreakdown: typeof spatialBreakdown === "string" ? spatialBreakdown : undefined,
      reviewStatus: typeof reviewStatus === "string" ? reviewStatus : undefined,
      status: typeof status === "string" ? status : undefined,
      description: typeof description === "string" ? description : undefined,
    });
    return NextResponse.json({ id: updated.id });
  } catch (err) {
    if (err instanceof DocumentError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }
}
