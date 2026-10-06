import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { assertProjectMember } from "@/lib/project-context";
import { hasPermission } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";
import { listFieldAttachments } from "@/lib/field/attachments";
import { listFieldComments } from "@/lib/field/comments";
import { listFieldDocumentReferences } from "@/lib/field/document-references";
import { getFieldAuditTrail } from "@/lib/field/audit-trail";

/** Read-only JSON detail for the Observations list drawer — the full page
 * at /field/observations/[id] still exists and queries the same data
 * server-side; this route exists purely so a row click can populate a
 * slide-over without a full navigation. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const { id } = await params;

  const observation = await prisma.fieldObservation.findUnique({
    where: { id },
    include: { area: { include: { parent: { include: { parent: true } } } }, type: true, responsibleUser: true, responsibleOrg: true, createdBy: true },
  });
  if (!observation) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    await assertProjectMember(user, observation.projectId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [attachments, comments, documentReferences, auditTrail, canManage, convertedIssue] = await Promise.all([
    listFieldAttachments("FieldObservation", id),
    listFieldComments("FieldObservation", id),
    listFieldDocumentReferences("FieldObservation", id),
    getFieldAuditTrail("FieldObservation", id, observation.projectId),
    hasPermission(user.id, "FIELD_MANAGE_OBSERVATIONS", { projectId: observation.projectId }),
    prisma.fieldIssue.findFirst({ where: { sourceType: "FieldObservation", sourceId: id }, select: { id: true, issueNumber: true, status: true } }),
  ]);

  const areaPath = [observation.area?.parent?.parent?.name, observation.area?.parent?.name, observation.area?.name]
    .filter(Boolean)
    .join(" → ");

  return NextResponse.json({
    id: observation.id,
    observationNumber: observation.observationNumber,
    title: observation.title,
    description: observation.description,
    status: observation.status,
    priority: observation.priority,
    isPositive: observation.isPositive,
    typeName: observation.type?.name ?? null,
    areaId: observation.areaId,
    areaName: observation.area?.name ?? null,
    areaPath: areaPath || null,
    responsibleUserName: observation.responsibleUser?.name ?? null,
    responsibleOrgName: observation.responsibleOrg?.name ?? null,
    dueDate: observation.dueDate,
    createdByName: observation.createdBy.name,
    createdAt: observation.createdAt,
    canManage,
    attachments: attachments.map((a) => ({
      id: a.id,
      fileName: a.fileName,
      mimeType: a.mimeType,
      sizeBytes: a.sizeBytes,
      uploadedByName: a.uploadedBy.name,
      uploadedAt: a.uploadedAt,
      canDelete: canManage || a.uploadedById === user.id,
      category: a.category,
    })),
    comments: comments.map((c) => ({ id: c.id, authorName: c.author.name, body: c.body, createdAt: c.createdAt })),
    documentReferences: documentReferences.map((r) => ({
      id: r.id,
      documentId: r.documentId,
      documentNo: r.document.documentNo,
      documentTitle: r.document.title,
      revisionAtIssue: r.revisionAtIssue,
      linkedByName: r.createdBy.name,
      linkedAt: r.createdAt,
    })),
    auditTrail,
    convertedIssue,
  });
}
