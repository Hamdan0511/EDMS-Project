import "server-only";

import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { requirePermission } from "@/lib/auth/permissions";

export class InviteError extends Error {}

export async function inviteUsersToProject(params: {
  projectId: string;
  userId: string;
  inviteeUserIds: string[];
}) {
  const { projectId, userId, inviteeUserIds } = params;
  await requirePermission(userId, "DIRECTORY_INVITE_USER", { projectId });

  if (inviteeUserIds.length === 0) {
    throw new InviteError("Select at least one user to invite.");
  }

  const invitees = await prisma.user.findMany({ where: { id: { in: inviteeUserIds } } });
  if (invitees.length !== inviteeUserIds.length) {
    throw new InviteError("One or more selected users could not be found.");
  }

  const alreadyMembers = await prisma.projectMember.findMany({
    where: { projectId, userId: { in: inviteeUserIds } },
    select: { userId: true },
  });
  const alreadyMemberIds = new Set(alreadyMembers.map((m) => m.userId));
  const toInvite = invitees.filter((u) => !alreadyMemberIds.has(u.id));

  if (toInvite.length === 0) {
    throw new InviteError("The selected user(s) are already on this project.");
  }

  const memberRole = await prisma.role.findUnique({ where: { name_scope: { name: "Project Member", scope: "PROJECT" } } });

  await prisma.$transaction(async (tx) => {
    for (const invitee of toInvite) {
      await tx.projectMember.create({
        data: { projectId, userId: invitee.id, organizationId: invitee.organizationId, role: "MEMBER" },
      });
      if (memberRole) {
        await tx.userRoleAssignment.create({
          data: { userId: invitee.id, roleId: memberRole.id, projectId, createdById: userId },
        });
      }
    }
  });

  for (const invitee of toInvite) {
    await logAudit({
      userId,
      projectId,
      action: "USER_INVITED",
      entityType: "User",
      entityId: invitee.id,
      metadata: { name: invitee.name, email: invitee.email },
    });
  }

  return { invited: toInvite.map((u) => ({ id: u.id, name: u.name })), skipped: invitees.length - toInvite.length };
}
