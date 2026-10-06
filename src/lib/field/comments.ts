import "server-only";

import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { requirePermission } from "@/lib/auth/permissions";

export class FieldCommentError extends Error {}

export async function addFieldComment(params: {
  recordType: string;
  recordId: string;
  projectId: string;
  authorId: string;
  governingPermission: string;
  body: string;
}) {
  const { recordType, recordId, projectId, authorId, governingPermission, body } = params;
  await requirePermission(authorId, governingPermission, { projectId });

  if (!body.trim()) throw new FieldCommentError("Comment cannot be empty.");

  const comment = await prisma.fieldComment.create({
    data: { recordType, recordId, authorId, body: body.trim() },
  });

  await logAudit({
    userId: authorId,
    projectId,
    action: "FIELD_COMMENT_ADDED",
    entityType: recordType,
    entityId: recordId,
    metadata: {},
  });

  return comment;
}

export async function listFieldComments(recordType: string, recordId: string) {
  return prisma.fieldComment.findMany({
    where: { recordType, recordId },
    include: { author: true },
    orderBy: { createdAt: "asc" },
  });
}
