import "server-only";

import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { requirePermission } from "@/lib/auth/permissions";

export class MailingGroupError extends Error {}

export async function createMailingGroup(params: {
  projectId: string;
  userId: string;
  name: string;
  organizationId?: string;
  memberUserIds: string[];
}) {
  const { projectId, userId, name, organizationId, memberUserIds } = params;
  await requirePermission(userId, "DIRECTORY_CREATE_GROUP", { projectId });

  if (!name.trim()) throw new MailingGroupError("Group name is required.");

  const existing = await prisma.mailingGroup.findUnique({ where: { projectId_name: { projectId, name: name.trim() } } });
  if (existing) throw new MailingGroupError(`A mailing group named "${name.trim()}" already exists on this project.`);

  const members = await prisma.projectMember.findMany({
    where: { projectId, userId: { in: memberUserIds } },
    select: { userId: true },
  });
  if (members.length !== memberUserIds.length) {
    throw new MailingGroupError("One or more selected members are not on this project.");
  }

  const group = await prisma.$transaction(async (tx) => {
    const created = await tx.mailingGroup.create({
      data: { projectId, name: name.trim(), organizationId: organizationId ?? null, createdById: userId },
    });
    if (memberUserIds.length > 0) {
      await tx.mailingGroupMember.createMany({
        data: memberUserIds.map((id) => ({ groupId: created.id, userId: id })),
      });
    }
    return created;
  });

  await logAudit({
    userId,
    projectId,
    action: "MAILING_GROUP_CREATED",
    entityType: "MailingGroup",
    entityId: group.id,
    metadata: { name: group.name, memberCount: memberUserIds.length },
  });

  return group;
}

export async function updateMailingGroup(params: {
  groupId: string;
  projectId: string;
  userId: string;
  name?: string;
  locked?: boolean;
  memberUserIds?: string[];
}) {
  const { groupId, projectId, userId, name, locked, memberUserIds } = params;

  const group = await prisma.mailingGroup.findFirst({ where: { id: groupId, projectId } });
  if (!group) throw new MailingGroupError("Mailing group not found.");

  // A locked group can only be touched (at all — name, lock state, or
  // membership) by someone with explicit member-management permission, even
  // if they otherwise hold DIRECTORY_EDIT_GROUP — this is the real,
  // server-enforced meaning of "Locked", not a disabled button.
  const requiredPermission = group.locked ? "DIRECTORY_MANAGE_GROUP_MEMBERS" : "DIRECTORY_EDIT_GROUP";
  await requirePermission(userId, requiredPermission, { projectId });

  if (memberUserIds) {
    await requirePermission(userId, "DIRECTORY_MANAGE_GROUP_MEMBERS", { projectId });
    const members = await prisma.projectMember.findMany({
      where: { projectId, userId: { in: memberUserIds } },
      select: { userId: true },
    });
    if (members.length !== memberUserIds.length) {
      throw new MailingGroupError("One or more selected members are not on this project.");
    }
  }

  if (name && name.trim() !== group.name) {
    const nameTaken = await prisma.mailingGroup.findUnique({
      where: { projectId_name: { projectId, name: name.trim() } },
    });
    if (nameTaken) throw new MailingGroupError(`A mailing group named "${name.trim()}" already exists on this project.`);
  }

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.mailingGroup.update({
      where: { id: groupId },
      data: {
        ...(name ? { name: name.trim() } : {}),
        ...(locked !== undefined ? { locked } : {}),
      },
    });
    if (memberUserIds) {
      await tx.mailingGroupMember.deleteMany({ where: { groupId } });
      if (memberUserIds.length > 0) {
        await tx.mailingGroupMember.createMany({ data: memberUserIds.map((id) => ({ groupId, userId: id })) });
      }
    }
    return result;
  });

  await logAudit({
    userId,
    projectId,
    action: "MAILING_GROUP_UPDATED",
    entityType: "MailingGroup",
    entityId: groupId,
    metadata: { name: updated.name, locked: updated.locked, memberCount: memberUserIds?.length },
  });

  return updated;
}
