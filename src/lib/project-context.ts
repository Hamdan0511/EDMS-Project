import "server-only";

import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import type { Project, ProjectMember, User } from "@prisma/client";

export const PROJECT_COOKIE_NAME = "shanfari_project";

export type ProjectMembership = ProjectMember & { project: Project };

/**
 * Resolves the user's active project, preferring the cookie selection but
 * always re-checking membership so a stale cookie can't leak another
 * project's data.
 */
export async function getCurrentProjectMembership(
  user: User,
): Promise<ProjectMembership | null> {
  const cookieStore = await cookies();
  const preferredProjectId = cookieStore.get(PROJECT_COOKIE_NAME)?.value;

  if (preferredProjectId) {
    const membership = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: preferredProjectId, userId: user.id } },
      include: { project: true },
    });
    if (membership) return membership;
  }

  return prisma.projectMember.findFirst({
    where: { userId: user.id },
    include: { project: true },
    orderBy: { createdAt: "asc" },
  });
}

export async function listUserProjects(user: User): Promise<Project[]> {
  const memberships = await prisma.projectMember.findMany({
    where: { userId: user.id },
    include: { project: true },
    orderBy: { project: { name: "asc" } },
  });
  return memberships.map((m) => m.project);
}

/**
 * Throws if the user is not a member of the given project. Use at the top
 * of any server action / route handler that accepts a projectId so
 * authorization can never be bypassed by manually crafted requests.
 */
export async function assertProjectMember(
  user: User,
  projectId: string,
): Promise<ProjectMembership> {
  const membership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: user.id } },
    include: { project: true },
  });
  if (!membership) {
    throw new Error("FORBIDDEN");
  }
  return membership;
}
