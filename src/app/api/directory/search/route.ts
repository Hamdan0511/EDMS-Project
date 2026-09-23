import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { assertProjectMember } from "@/lib/project-context";
import { prisma } from "@/lib/prisma";

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

  const members = await prisma.projectMember.findMany({
    where: {
      projectId,
      ...(q
        ? {
            OR: [
              { user: { name: { contains: q, mode: "insensitive" } } },
              { user: { email: { contains: q, mode: "insensitive" } } },
              { organization: { name: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    include: { user: true, organization: true },
    orderBy: { user: { name: "asc" } },
    take: 20,
  });

  // Mailing groups are real, selectable recipients too — resolved into
  // their real member list by the picker when chosen (see RecipientPicker),
  // never sent-to as a bare group name.
  const groups = q
    ? await prisma.mailingGroup.findMany({
        where: { projectId, name: { contains: q, mode: "insensitive" } },
        include: { _count: { select: { members: true } } },
        orderBy: { name: "asc" },
        take: 10,
      })
    : [];

  return NextResponse.json([
    ...members.map((m) => ({
      kind: "user" as const,
      userId: m.userId,
      name: m.user.name,
      email: m.user.email,
      organization: m.organization.name,
      accountType: m.user.accountType,
    })),
    ...groups.map((g) => ({
      kind: "group" as const,
      groupId: g.id,
      name: g.name,
      memberCount: g._count.members,
    })),
  ]);
}
