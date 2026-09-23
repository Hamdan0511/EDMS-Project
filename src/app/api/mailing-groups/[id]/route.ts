import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { assertProjectMember } from "@/lib/project-context";
import { prisma } from "@/lib/prisma";
import { updateMailingGroup, MailingGroupError } from "@/lib/services/mailing-group-service";
import { ForbiddenPermissionError } from "@/lib/auth/permissions";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const { id } = await params;

  const group = await prisma.mailingGroup.findUnique({
    where: { id },
    include: { members: { include: { user: { include: { organization: true } } } } },
  });
  if (!group) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    await assertProjectMember(user, group.projectId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({
    id: group.id,
    name: group.name,
    locked: group.locked,
    members: group.members.map((m) => ({
      userId: m.userId,
      name: m.user.name,
      email: m.user.email,
      organization: m.user.organization.name,
      accountType: m.user.accountType,
    })),
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const { id } = await params;

  const group = await prisma.mailingGroup.findUnique({ where: { id } });
  if (!group) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    await assertProjectMember(user, group.projectId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const { name, locked, memberUserIds } = body as Record<string, unknown>;

  try {
    const updated = await updateMailingGroup({
      groupId: id,
      projectId: group.projectId,
      userId: user.id,
      name: typeof name === "string" ? name : undefined,
      locked: typeof locked === "boolean" ? locked : undefined,
      memberUserIds: Array.isArray(memberUserIds) ? (memberUserIds as string[]) : undefined,
    });
    return NextResponse.json({ id: updated.id, name: updated.name, locked: updated.locked });
  } catch (err) {
    if (err instanceof MailingGroupError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof ForbiddenPermissionError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error(`PATCH /api/mailing-groups/${id} failed:`, err);
    return NextResponse.json({ error: "Failed to update the mailing group. Please try again." }, { status: 500 });
  }
}
