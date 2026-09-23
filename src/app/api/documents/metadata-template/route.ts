import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { assertProjectMember } from "@/lib/project-context";
import { prisma } from "@/lib/prisma";
import { buildDocumentWorkbook } from "@/lib/documents/excel";

/** Real .xlsx metadata template — headers always match the actual Document
 * fields. If documentIds are supplied, includes them as genuine example
 * rows (never fabricated); otherwise a blank, headers-only template. */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const projectId = request.nextUrl.searchParams.get("projectId");
  if (!projectId) {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 });
  }

  try {
    await assertProjectMember(user, projectId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const documentIdsParam = request.nextUrl.searchParams.get("documentIds");
  const documentIds = documentIdsParam ? documentIdsParam.split(",").filter(Boolean) : [];

  const documents = documentIds.length
    ? await prisma.document.findMany({
        where: { id: { in: documentIds }, projectId },
        include: { type: true, createdBy: { include: { organization: true } } },
      })
    : [];

  const buffer = await buildDocumentWorkbook(documents);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": 'attachment; filename="document-metadata-template.xlsx"',
    },
  });
}
