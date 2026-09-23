import "server-only";

import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

export class PrintRequestError extends Error {}

/** A real, persisted print request against a set of selected documents —
 * distinct from the existing browser-print view, which never creates a
 * record. Retrievable afterward via listPrintRequests. */
export async function submitPrintRequest(params: {
  projectId: string;
  requestedById: string;
  details: string;
  documentIds: string[];
}) {
  const { projectId, requestedById, details, documentIds } = params;

  if (!details.trim()) {
    throw new PrintRequestError("Request details are required.");
  }
  if (documentIds.length === 0) {
    throw new PrintRequestError("Select at least one document to submit a print request.");
  }

  const count = await prisma.document.count({ where: { id: { in: documentIds }, projectId } });
  if (count !== documentIds.length) {
    throw new PrintRequestError("One or more selected documents could not be found in this project.");
  }

  const request = await prisma.printRequest.create({
    data: {
      projectId,
      requestedById,
      details: details.trim(),
      documents: { create: documentIds.map((documentId) => ({ documentId })) },
    },
    include: { documents: { include: { document: true } } },
  });

  await logAudit({
    userId: requestedById,
    projectId,
    action: "PRINT_REQUEST_SUBMITTED",
    entityType: "PrintRequest",
    entityId: request.id,
    metadata: { documentIds },
  });

  return request;
}

export async function listPrintRequests(projectId: string) {
  return prisma.printRequest.findMany({
    where: { projectId },
    include: { requestedBy: true, documents: { include: { document: true } } },
    orderBy: { createdAt: "desc" },
  });
}
