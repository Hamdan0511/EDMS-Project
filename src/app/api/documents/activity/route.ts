import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { assertProjectMember } from "@/lib/project-context";
import { prisma } from "@/lib/prisma";

const DOCUMENT_ENTITY_TYPES = ["Document", "DocumentVersion", "TemporaryFile", "Workflow", "PrintRequest"];

/** Real Document Activity feed — every document-related write path already
 * calls logAudit; this is the first place that reads it back. Read-only,
 * never mutates history. */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const pageSize = 50;

  if (!projectId) {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 });
  }

  try {
    await assertProjectMember(user, projectId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where: { projectId, entityType: { in: DOCUMENT_ENTITY_TYPES } },
      include: { user: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.auditLog.count({ where: { projectId, entityType: { in: DOCUMENT_ENTITY_TYPES } } }),
  ]);

  return NextResponse.json({
    total,
    page,
    pageSize,
    entries: logs.map((l) => ({
      id: l.id,
      action: l.action,
      entityType: l.entityType,
      entityId: l.entityId,
      user: l.user?.name ?? "Unknown",
      createdAt: l.createdAt,
      metadata: l.metadata,
    })),
  });
}
