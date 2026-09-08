import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { assertProjectMember } from "@/lib/project-context";
import { prisma } from "@/lib/prisma";

/** Read-only lookup feeding Register Incoming Mail's Attach > Document
 * modal — never mutates the Document Register. */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");
  const q = searchParams.get("q")?.trim() ?? "";

  if (!projectId) {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 });
  }

  try {
    await assertProjectMember(user, projectId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const documents = await prisma.document.findMany({
    where: {
      projectId,
      ...(q
        ? {
            OR: [
              { documentNo: { contains: q, mode: "insensitive" } },
              { title: { contains: q, mode: "insensitive" } },
              { type: { name: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    include: { type: true },
    orderBy: { documentNo: "asc" },
    take: 20,
  });

  return NextResponse.json(
    documents.map((d) => ({
      id: d.id,
      documentNo: d.documentNo,
      title: d.title,
      revision: d.currentRevision,
      typeName: d.type?.name ?? null,
    })),
  );
}
