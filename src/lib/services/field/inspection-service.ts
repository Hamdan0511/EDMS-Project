import "server-only";

import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { requirePermission } from "@/lib/auth/permissions";
import { computeNextNumber, fieldNumberPrefix } from "@/lib/field/numbering";
import { createIssue } from "@/lib/services/field/issue-service";
import type { FieldChecklistResult } from "@prisma/client";

export class InspectionError extends Error {}

const TEMPLATE_PERMISSION = "FIELD_MANAGE_INSPECTION_TEMPLATES";
const INSPECTION_PERMISSION = "FIELD_MANAGE_INSPECTIONS";

// --- Templates ---------------------------------------------------------

export async function createInspectionTemplate(params: {
  projectId: string;
  createdById: string;
  name: string;
  description?: string;
  groups: { name: string; items: { label: string; responseType?: string; isMandatory?: boolean }[] }[];
}) {
  const { projectId, createdById } = params;
  await requirePermission(createdById, TEMPLATE_PERMISSION, { projectId });

  if (!params.name.trim()) throw new InspectionError("Template name is required.");
  if (params.groups.length === 0) throw new InspectionError("At least one checklist group is required.");
  for (const group of params.groups) {
    if (!group.name.trim()) throw new InspectionError("Every checklist group requires a name.");
    if (group.items.length === 0) throw new InspectionError(`Group "${group.name}" needs at least one checklist item.`);
    for (const item of group.items) {
      if (!item.label.trim()) throw new InspectionError("Every checklist item requires a label.");
    }
  }

  const template = await prisma.fieldInspectionTemplate.create({
    data: {
      projectId,
      name: params.name.trim(),
      description: params.description?.trim() || null,
      createdById,
      groups: {
        create: params.groups.map((g, gi) => ({
          name: g.name.trim(),
          sortOrder: gi,
          items: {
            create: g.items.map((it, ii) => ({
              label: it.label.trim(),
              responseType: (it.responseType as never) ?? "PASS_FAIL",
              isMandatory: it.isMandatory ?? true,
              sortOrder: ii,
            })),
          },
        })),
      },
    },
    include: { groups: { include: { items: true } } },
  });

  await logAudit({
    userId: createdById,
    projectId,
    action: "FIELD_INSPECTION_TEMPLATE_CREATED",
    entityType: "FieldInspectionTemplate",
    entityId: template.id,
    metadata: { name: template.name },
  });

  return template;
}

// --- Inspection instances ---------------------------------------------------------

export async function createInspection(params: {
  projectId: string;
  createdById: string;
  templateId: string;
  areaId?: string;
  assigneeId?: string;
  inspectorId?: string;
  dueDate?: Date;
}) {
  const { projectId, createdById } = params;
  await requirePermission(createdById, INSPECTION_PERMISSION, { projectId });

  const template = await prisma.fieldInspectionTemplate.findFirst({
    where: { id: params.templateId, projectId },
    include: { groups: { include: { items: true }, orderBy: { sortOrder: "asc" } } },
  });
  if (!template) throw new InspectionError("Template not found in this project.");

  if (params.areaId) {
    const area = await prisma.fieldArea.findFirst({ where: { id: params.areaId, projectId } });
    if (!area) throw new InspectionError("Selected location does not belong to this project.");
  }
  for (const uid of [params.assigneeId, params.inspectorId]) {
    if (!uid) continue;
    const member = await prisma.projectMember.findUnique({ where: { projectId_userId: { projectId, userId: uid } } });
    if (!member) throw new InspectionError("Assignee/inspector must be a member of this project.");
  }

  const prefix = fieldNumberPrefix("INS");
  const existing = await prisma.fieldInspection.findMany({
    where: { projectId, inspectionNumber: { startsWith: prefix } },
    select: { inspectionNumber: true },
  });
  const inspectionNumber = computeNextNumber(existing.map((e) => e.inspectionNumber), prefix);

  const allItems = template.groups.flatMap((g) => g.items.sort((a, b) => a.sortOrder - b.sortOrder));

  const inspection = await prisma.fieldInspection.create({
    data: {
      projectId,
      inspectionNumber,
      templateId: params.templateId,
      areaId: params.areaId ?? null,
      assigneeId: params.assigneeId ?? null,
      inspectorId: params.inspectorId ?? null,
      dueDate: params.dueDate ?? null,
      status: params.assigneeId ? "ASSIGNED" : "DRAFT",
      createdById,
      responses: {
        create: allItems.map((item, i) => ({
          templateItemId: item.id,
          label: item.label,
          sortOrder: i,
        })),
      },
    },
  });

  await logAudit({
    userId: createdById,
    projectId,
    action: "FIELD_INSPECTION_SCHEDULED",
    entityType: "FieldInspection",
    entityId: inspection.id,
    metadata: { inspectionNumber, templateName: template.name },
  });

  return inspection;
}

export async function recordInspectionResponses(params: {
  id: string;
  projectId: string;
  actingUserId: string;
  responses: { responseId: string; result?: FieldChecklistResult; textValue?: string; note?: string }[];
}) {
  const { id, projectId, actingUserId, responses } = params;
  await requirePermission(actingUserId, INSPECTION_PERMISSION, { projectId });

  const inspection = await prisma.fieldInspection.findFirst({ where: { id, projectId } });
  if (!inspection) throw new InspectionError("Inspection not found.");
  if (inspection.status === "SUBMITTED" || inspection.status === "PASSED" || inspection.status === "FAILED" || inspection.status === "CLOSED") {
    throw new InspectionError("This inspection has already been submitted and cannot be edited.");
  }

  await prisma.$transaction(
    responses.map((r) =>
      prisma.fieldInspectionResponse.updateMany({
        where: { id: r.responseId, inspectionId: id },
        data: {
          result: r.result ?? undefined,
          textValue: r.textValue ?? undefined,
          note: r.note ?? undefined,
        },
      }),
    ),
  );

  if (inspection.status === "ASSIGNED" || inspection.status === "DRAFT") {
    await prisma.fieldInspection.update({ where: { id }, data: { status: "IN_PROGRESS" } });
    await logAudit({
      userId: actingUserId,
      projectId,
      action: "FIELD_INSPECTION_STARTED",
      entityType: "FieldInspection",
      entityId: id,
    });
  }

  return prisma.fieldInspection.findUnique({ where: { id }, include: { responses: true } });
}

/** The one and only place an inspection's PASSED/FAILED result is decided —
 * always computed server-side from whether any MANDATORY checklist item
 * failed, never accepted from the client. */
export async function submitInspection(params: { id: string; projectId: string; actingUserId: string }) {
  const { id, projectId, actingUserId } = params;
  await requirePermission(actingUserId, INSPECTION_PERMISSION, { projectId });

  const inspection = await prisma.fieldInspection.findFirst({
    where: { id, projectId },
    include: { responses: { include: { templateItem: true } } },
  });
  if (!inspection) throw new InspectionError("Inspection not found.");
  if (inspection.status === "SUBMITTED" || inspection.status === "PASSED" || inspection.status === "FAILED" || inspection.status === "CLOSED") {
    throw new InspectionError("This inspection has already been submitted.");
  }

  const unanswered = inspection.responses.filter((r) => r.templateItem.isMandatory && !r.result && !r.textValue);
  if (unanswered.length > 0) {
    throw new InspectionError(`${unanswered.length} mandatory checklist item(s) still need a response before submitting.`);
  }

  const failed = inspection.responses.some((r) => r.templateItem.isMandatory && (r.result === "FAIL" || r.result === "NO"));
  const finalStatus = failed ? "FAILED" : "PASSED";

  const updated = await prisma.fieldInspection.update({
    where: { id },
    data: { status: finalStatus, submittedAt: new Date() },
  });

  await logAudit({
    userId: actingUserId,
    projectId,
    action: "FIELD_INSPECTION_COMPLETED",
    entityType: "FieldInspection",
    entityId: id,
    metadata: { result: finalStatus },
  });

  return updated;
}

/** The critical "Create Issue" workflow called out in the brief: a failed
 * checklist item pre-populates title/description/location/inspector from
 * the real response — the user only confirms responsibility/due date. */
export async function createIssueFromInspectionResponse(params: {
  responseId: string;
  projectId: string;
  actingUserId: string;
  responsibleUserId?: string;
  dueDate?: Date;
}) {
  const { responseId, projectId, actingUserId } = params;

  const response = await prisma.fieldInspectionResponse.findFirst({
    where: { id: responseId, inspection: { projectId } },
    include: { inspection: { include: { area: true, inspector: true } } },
  });
  if (!response) throw new InspectionError("Inspection response not found.");

  return createIssue({
    projectId,
    createdById: actingUserId,
    areaId: response.inspection.areaId ?? undefined,
    title: `${response.inspection.inspectionNumber}: ${response.label}`,
    description: response.note?.trim() || `Failed checklist item "${response.label}" on inspection ${response.inspection.inspectionNumber}.`,
    responsibleUserId: params.responsibleUserId,
    dueDate: params.dueDate,
    sourceType: "FieldInspectionResponse",
    sourceId: response.id,
  });
}
