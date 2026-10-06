import "server-only";

import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

export class FieldDocumentReferenceError extends Error {}

/** Polymorphic document/drawing link — mirrors MailDocumentReference's exact
 * snapshot shape (documentId + revisionAtIssue captured at link time, not a
 * live pointer) so a later document revision never silently rewrites what
 * this Field record was actually linked against. */
export async function linkFieldDocument(params: {
  recordType: string;
  recordId: string;
  projectId: string;
  documentId: string;
  actingUserId: string;
}) {
  const { recordType, recordId, projectId, documentId, actingUserId } = params;

  const document = await prisma.document.findFirst({ where: { id: documentId, projectId } });
  if (!document) throw new FieldDocumentReferenceError("Document not found in this project.");

  const reference = await prisma.fieldDocumentReference.create({
    data: {
      recordType,
      recordId,
      documentId,
      revisionAtIssue: document.currentRevision,
      createdById: actingUserId,
    },
  });

  await logAudit({
    userId: actingUserId,
    projectId,
    action: "FIELD_DOCUMENT_LINKED",
    entityType: recordType,
    entityId: recordId,
    metadata: { documentId, documentNo: document.documentNo },
  });

  return reference;
}

export async function listFieldDocumentReferences(recordType: string, recordId: string) {
  return prisma.fieldDocumentReference.findMany({
    where: { recordType, recordId },
    include: { document: true, createdBy: true },
    orderBy: { createdAt: "desc" },
  });
}
