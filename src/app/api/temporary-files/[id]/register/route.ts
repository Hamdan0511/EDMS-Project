import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { assertProjectMember } from "@/lib/project-context";
import { requireProjectRole, ForbiddenRoleError } from "@/lib/auth/roles";
import { prisma } from "@/lib/prisma";
import { registerTemporaryFileAsDocument, TemporaryFileError } from "@/lib/temporary-files/service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const record = await prisma.temporaryFile.findUnique({ where: { id } });
  if (!record) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let membership;
  try {
    membership = await assertProjectMember(user, record.projectId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    requireProjectRole(membership, ["ADMIN", "MEMBER"]);
  } catch (err) {
    if (err instanceof ForbiddenRoleError) {
      return NextResponse.json({ error: "Viewers cannot register documents" }, { status: 403 });
    }
    throw err;
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const { documentNo, title, revision, typeName, description, discipline } = body as Record<string, unknown>;

  try {
    const document = await registerTemporaryFileAsDocument({
      id: record.id,
      projectId: record.projectId,
      registeredById: user.id,
      documentNo: typeof documentNo === "string" ? documentNo : "",
      title: typeof title === "string" ? title : "",
      revision: typeof revision === "string" ? revision : "",
      typeName: typeof typeName === "string" ? typeName : undefined,
      description: typeof description === "string" ? description : undefined,
      discipline: typeof discipline === "string" ? discipline : undefined,
    });
    return NextResponse.json({ id: document.id, documentNo: document.documentNo });
  } catch (err) {
    if (err instanceof TemporaryFileError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("Register as document failed:", err);
    return NextResponse.json({ error: "Failed to register the document. Please try again." }, { status: 500 });
  }
}
