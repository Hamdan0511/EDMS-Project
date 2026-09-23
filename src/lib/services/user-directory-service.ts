import "server-only";

import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { requirePermission } from "@/lib/auth/permissions";
import type { DirectoryVisibility } from "@prisma/client";

export class UserDirectoryError extends Error {}

export async function updateUserDirectoryInfo(params: {
  targetUserId: string;
  actingUserId: string;
  projectId: string;
  jobTitle?: string | null;
  division?: string | null;
  phone?: string | null;
  address?: string | null;
  visibility?: DirectoryVisibility;
  isActive?: boolean;
}) {
  const { targetUserId, actingUserId, projectId } = params;
  await requirePermission(actingUserId, "DIRECTORY_EDIT_USER", { projectId });

  // The permission check above only proves the actor has edit rights on the
  // project THEY named — it says nothing about the target. Without this,
  // an administrator of any project could edit any user system-wide simply
  // by naming their own project in the request body (confirmed exploitable
  // in a live security audit). The target must actually belong to that
  // same project.
  const targetMembership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: targetUserId } },
  });
  if (!targetMembership) throw new UserDirectoryError("User not found.");

  const target = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!target) throw new UserDirectoryError("User not found.");

  const data: Record<string, unknown> = {};
  if (params.jobTitle !== undefined) data.jobTitle = params.jobTitle;
  if (params.division !== undefined) data.division = params.division;
  if (params.phone !== undefined) data.phone = params.phone;
  if (params.address !== undefined) data.address = params.address;
  if (params.visibility !== undefined) data.visibility = params.visibility;
  if (params.isActive !== undefined) {
    // Guests are always isActive = false by design (the login gate depends
    // on it) — never let an edit accidentally grant a guest login access.
    if (target.accountType === "GUEST" && params.isActive) {
      throw new UserDirectoryError("Guest accounts cannot be activated for login.");
    }
    data.isActive = params.isActive;
  }

  const updated = await prisma.user.update({ where: { id: targetUserId }, data });

  await logAudit({
    userId: actingUserId,
    projectId,
    action: "USER_UPDATED",
    entityType: "User",
    entityId: targetUserId,
    metadata: { fields: Object.keys(data) },
  });

  return updated;
}
