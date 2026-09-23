import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { assertProjectMember } from "@/lib/project-context";
import { prisma } from "@/lib/prisma";

/** Search candidates for Invite User — real, existing FULL user accounts not
 * already on this project. Guests are correspondence identities added via
 * Create Guest directly with membership, not invited as working members. */
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

  const users = await prisma.user.findMany({
    where: {
      accountType: "FULL",
      projectMembers: { none: { projectId } },
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
              { organization: { name: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    include: { organization: true },
    orderBy: { name: "asc" },
    take: 20,
  });

  return NextResponse.json(
    users.map((u) => ({ userId: u.id, name: u.name, email: u.email, organization: u.organization.name })),
  );
}
