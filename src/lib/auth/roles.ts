import "server-only";

import type { ProjectRole } from "@prisma/client";
import type { ProjectMembership } from "@/lib/project-context";

export class ForbiddenRoleError extends Error {
  constructor(message = "You do not have permission to perform this action") {
    super(message);
    this.name = "ForbiddenRoleError";
  }
}

/**
 * Role-based authorization foundation: call after assertProjectMember to
 * additionally restrict an action to specific project roles. Membership
 * alone (assertProjectMember) proves the user is on the project; this
 * proves they're allowed to do *this particular* thing on it.
 */
export function requireProjectRole(
  membership: ProjectMembership,
  allowed: ProjectRole[],
): void {
  if (!allowed.includes(membership.role)) {
    throw new ForbiddenRoleError();
  }
}
