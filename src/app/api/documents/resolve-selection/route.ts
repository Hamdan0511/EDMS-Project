import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { assertProjectMember } from "@/lib/project-context";
import { prisma } from "@/lib/prisma";
import { buildWhere, type DocumentSearchParams } from "@/lib/documents/query";
import type { Prisma } from "@prisma/client";

/** Resolves a "Select All" click into the real, current list of document
 * ids matching the register's active filters — the server re-runs the exact
 * same buildWhere() the register page itself used, so "Select All" always
 * means the entire filtered result set, never just the current page. */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");
  const registerScope = searchParams.get("registerScope");
  if (!projectId) {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 });
  }
  if (registerScope !== "STANDALONE_DOCUMENT" && registerScope !== "DRAWING") {
    return NextResponse.json({ error: "registerScope must be STANDALONE_DOCUMENT or DRAWING" }, { status: 400 });
  }

  try {
    await assertProjectMember(user, projectId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const params = Object.fromEntries(searchParams.entries()) as DocumentSearchParams;
  const baseWhere = buildWhere(projectId, params);
  const where: Prisma.DocumentWhereInput = {
    AND: [
      baseWhere,
      { registerScope },
      ...(registerScope === "DRAWING" ? [{ type: { isDrawingType: true } } as Prisma.DocumentWhereInput] : []),
    ],
  };

  const documents = await prisma.document.findMany({ where, select: { id: true }, take: 5000 });
  return NextResponse.json({ ids: documents.map((d) => d.id) });
}
