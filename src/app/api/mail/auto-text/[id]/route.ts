import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { assertProjectMember } from "@/lib/project-context";
import { requireProjectRole, ForbiddenRoleError } from "@/lib/auth/roles";
import { prisma } from "@/lib/prisma";
import { updateAutoText, deleteAutoText, AutoTextError } from "@/lib/mail/auto-text-service";

async function resolveMembership(id: string) {
  const user = await getCurrentUser();
  if (!user) {
    return { error: NextResponse.json({ error: "Not authenticated" }, { status: 401 }) };
  }
  const item = await prisma.autoText.findUnique({ where: { id }, select: { projectId: true } });
  if (!item) {
    return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  }
  let membership;
  try {
    membership = await assertProjectMember(user, item.projectId);
  } catch {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  try {
    requireProjectRole(membership, ["ADMIN", "MEMBER"]);
  } catch (err) {
    if (err instanceof ForbiddenRoleError) {
      return { error: NextResponse.json({ error: "Viewers cannot manage Auto Text" }, { status: 403 }) };
    }
    throw err;
  }
  return { membership };
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const resolved = await resolveMembership(id);
  if ("error" in resolved) return resolved.error;

  const body = await request.json().catch(() => null);
  try {
    const item = await updateAutoText({
      id,
      projectId: resolved.membership.projectId,
      name: typeof body?.name === "string" ? body.name : "",
      contentHtml: typeof body?.contentHtml === "string" ? body.contentHtml : "",
      description: typeof body?.description === "string" ? body.description : undefined,
    });
    return NextResponse.json(item);
  } catch (err) {
    if (err instanceof AutoTextError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const resolved = await resolveMembership(id);
  if ("error" in resolved) return resolved.error;

  try {
    await deleteAutoText({ id, projectId: resolved.membership.projectId });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AutoTextError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }
}
