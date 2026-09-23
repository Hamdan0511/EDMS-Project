import "server-only";

import { prisma } from "@/lib/prisma";

export class ForbiddenPermissionError extends Error {
  constructor(message = "You do not have permission to perform this action") {
    super(message);
    this.name = "ForbiddenPermissionError";
  }
}

/**
 * Central authorization check: does `userId` hold a role (at the given
 * project or organization scope) whose RolePermission set includes
 * `permissionCode`? This is the ONE place permission logic lives — every
 * protected Directory/Mailing-Group/RBAC route calls this or
 * requirePermission(), never re-implementing the check inline.
 */
export async function hasPermission(
  userId: string,
  permissionCode: string,
  scope: { projectId?: string; organizationId?: string },
): Promise<boolean> {
  const count = await prisma.userRoleAssignment.count({
    where: {
      userId,
      OR: [
        ...(scope.projectId ? [{ projectId: scope.projectId }] : []),
        ...(scope.organizationId ? [{ organizationId: scope.organizationId }] : []),
      ],
      role: { permissions: { some: { permission: { code: permissionCode } } } },
    },
  });
  return count > 0;
}

export async function requirePermission(
  userId: string,
  permissionCode: string,
  scope: { projectId?: string; organizationId?: string },
): Promise<void> {
  const allowed = await hasPermission(userId, permissionCode, scope);
  if (!allowed) {
    throw new ForbiddenPermissionError();
  }
}

export async function requireAnyPermission(
  userId: string,
  permissionCodes: string[],
  scope: { projectId?: string; organizationId?: string },
): Promise<void> {
  for (const code of permissionCodes) {
    if (await hasPermission(userId, code, scope)) return;
  }
  throw new ForbiddenPermissionError();
}
