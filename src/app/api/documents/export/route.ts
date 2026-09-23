import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { assertProjectMember } from "@/lib/project-context";
import { prisma } from "@/lib/prisma";
import { buildWhere, parseSort, type DocumentSearchParams } from "@/lib/documents/query";
import { buildDocumentWorkbook } from "@/lib/documents/excel";
import { logAudit } from "@/lib/audit";

// A sane upper bound on a single export — this is a real report, not a
// runaway unbounded query; a register this large would need a narrower
// filter anyway.
const MAX_EXPORT_ROWS = 5000;

/** Exports the CURRENT filtered/sorted Document Register result set (the
 * exact search params the register page is showing) to a real .xlsx —
 * never a static/fake export. */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const projectId = searchParams.get("projectId");
  if (!projectId) {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 });
  }

  try {
    await assertProjectMember(user, projectId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const params: DocumentSearchParams = Object.fromEntries(searchParams.entries());
  const { orderBy } = parseSort(params);
  const where = buildWhere(projectId, params);
  const drawingsOnly = searchParams.get("drawingsOnly") === "1";
  // Same server-side register separation as the page queries — an export
  // triggered from the Document Register must never include drawings, and
  // vice versa.
  const scopedWhere = {
    AND: [where, { registerScope: drawingsOnly ? ("DRAWING" as const) : ("STANDALONE_DOCUMENT" as const) }],
  };

  const documents = await prisma.document.findMany({
    where: scopedWhere,
    orderBy,
    take: MAX_EXPORT_ROWS,
    include: { type: true, createdBy: { include: { organization: true } } },
  });

  const buffer = await buildDocumentWorkbook(documents);

  await logAudit({
    userId: user.id,
    projectId,
    action: "DOCUMENTS_EXPORTED",
    entityType: "Document",
    entityId: documents[0]?.id ?? projectId,
    metadata: { count: documents.length },
  });

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": `attachment; filename="document-register-export-${Date.now()}.xlsx"`,
    },
  });
}
