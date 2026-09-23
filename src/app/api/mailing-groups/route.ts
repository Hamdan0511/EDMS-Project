import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { assertProjectMember } from "@/lib/project-context";
import { prisma } from "@/lib/prisma";
import { createMailingGroup, MailingGroupError } from "@/lib/services/mailing-group-service";
import { ForbiddenPermissionError } from "@/lib/auth/permissions";

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

  const groups = await prisma.mailingGroup.findMany({
    where: { projectId, ...(q ? { name: { contains: q, mode: "insensitive" } } : {}) },
    include: { _count: { select: { members: true } } },
    orderBy: { name: "asc" },
    take: 20,
  });

  return NextResponse.json(
    groups.map((g) => ({ id: g.id, name: g.name, locked: g.locked, memberCount: g._count.members })),
  );
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const { projectId, name, memberUserIds } = body as Record<string, unknown>;
  if (typeof projectId !== "string" || !projectId) {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 });
  }
  if (typeof name !== "string") {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  if (!Array.isArray(memberUserIds)) {
    return NextResponse.json({ error: "memberUserIds must be an array" }, { status: 400 });
  }

  try {
    await assertProjectMember(user, projectId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const group = await createMailingGroup({
      projectId,
      userId: user.id,
      name,
      memberUserIds: memberUserIds as string[],
    });
    return NextResponse.json({ id: group.id, name: group.name });
  } catch (err) {
    if (err instanceof MailingGroupError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof ForbiddenPermissionError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error("POST /api/mailing-groups failed:", err);
    return NextResponse.json({ error: "Failed to create the mailing group. Please try again." }, { status: 500 });
  }
}
