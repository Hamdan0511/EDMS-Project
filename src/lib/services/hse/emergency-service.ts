import "server-only";

import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { requirePermission } from "@/lib/auth/permissions";
import { computeNextNumber, hseNumberPrefix } from "@/lib/hse/numbering";
import { createCorrectiveAction } from "@/lib/services/hse/corrective-action-service";
import { EMERGENCY_EVENT_STATUS_ORDER } from "@/lib/hse/status";
import type {
  HseEmergencyProcedureStatus,
  HseEmergencyEventStatus,
  HseEmergencyDrillResult,
  HseSeverity,
  HseActionPriority,
} from "@prisma/client";

export class EmergencyError extends Error {}

const PERMISSION = "HSE_MANAGE_EMERGENCY";

// --- Contacts ---------------------------------------------------------

export async function createEmergencyContact(params: {
  projectId: string;
  createdById: string;
  name: string;
  role: string;
  organizationId?: string;
  phone: string;
  email?: string;
  emergencyType?: string;
  location?: string;
  availability?: string;
  notes?: string;
}) {
  const { projectId, createdById } = params;
  await requirePermission(createdById, PERMISSION, { projectId });

  if (!params.name.trim()) throw new EmergencyError("Name is required.");
  if (!params.role.trim()) throw new EmergencyError("Role is required.");
  if (!params.phone.trim()) throw new EmergencyError("Phone is required.");

  const contact = await prisma.hseEmergencyContact.create({
    data: {
      projectId,
      name: params.name.trim(),
      role: params.role.trim(),
      organizationId: params.organizationId || null,
      phone: params.phone.trim(),
      email: params.email?.trim() || null,
      emergencyType: params.emergencyType?.trim() || null,
      location: params.location?.trim() || null,
      availability: params.availability?.trim() || null,
      notes: params.notes?.trim() || null,
      createdById,
    },
  });

  await logAudit({
    userId: createdById,
    projectId,
    action: "HSE_EMERGENCY_CONTACT_CREATED",
    entityType: "HseEmergencyContact",
    entityId: contact.id,
    metadata: { name: contact.name, role: contact.role },
  });

  return contact;
}

export async function updateEmergencyContact(params: {
  id: string;
  projectId: string;
  actingUserId: string;
  name?: string;
  role?: string;
  organizationId?: string | null;
  phone?: string;
  email?: string | null;
  emergencyType?: string | null;
  location?: string | null;
  availability?: string | null;
  notes?: string | null;
}) {
  const { id, projectId, actingUserId } = params;
  await requirePermission(actingUserId, PERMISSION, { projectId });

  const existing = await prisma.hseEmergencyContact.findFirst({ where: { id, projectId } });
  if (!existing) throw new EmergencyError("Emergency contact not found.");

  const updated = await prisma.hseEmergencyContact.update({
    where: { id },
    data: {
      name: params.name?.trim() || existing.name,
      role: params.role?.trim() || existing.role,
      organizationId: params.organizationId !== undefined ? params.organizationId : existing.organizationId,
      phone: params.phone?.trim() || existing.phone,
      email: params.email !== undefined ? params.email?.trim() || null : existing.email,
      emergencyType: params.emergencyType !== undefined ? params.emergencyType?.trim() || null : existing.emergencyType,
      location: params.location !== undefined ? params.location?.trim() || null : existing.location,
      availability: params.availability !== undefined ? params.availability?.trim() || null : existing.availability,
      notes: params.notes !== undefined ? params.notes?.trim() || null : existing.notes,
    },
  });

  await logAudit({
    userId: actingUserId,
    projectId,
    action: "HSE_EMERGENCY_CONTACT_UPDATED",
    entityType: "HseEmergencyContact",
    entityId: id,
  });

  return updated;
}

export async function deleteEmergencyContact(params: { id: string; projectId: string; actingUserId: string }) {
  const { id, projectId, actingUserId } = params;
  await requirePermission(actingUserId, PERMISSION, { projectId });

  const existing = await prisma.hseEmergencyContact.findFirst({ where: { id, projectId } });
  if (!existing) throw new EmergencyError("Emergency contact not found.");

  await prisma.hseEmergencyContact.delete({ where: { id } });

  await logAudit({
    userId: actingUserId,
    projectId,
    action: "HSE_EMERGENCY_CONTACT_DELETED",
    entityType: "HseEmergencyContact",
    entityId: id,
    metadata: { name: existing.name },
  });
}

// --- Procedures ---------------------------------------------------------

export async function createEmergencyProcedure(params: {
  projectId: string;
  createdById: string;
  title: string;
  emergencyType: string;
  immediateActions: string;
  evacuationInstructions?: string;
  assemblyPoint?: string;
  requiredEquipment?: string;
  steps?: string;
}) {
  const { projectId, createdById } = params;
  await requirePermission(createdById, PERMISSION, { projectId });

  if (!params.title.trim()) throw new EmergencyError("Title is required.");
  if (!params.immediateActions.trim()) throw new EmergencyError("Immediate actions are required.");

  const procedure = await prisma.hseEmergencyProcedure.create({
    data: {
      projectId,
      title: params.title.trim(),
      emergencyType: params.emergencyType,
      immediateActions: params.immediateActions.trim(),
      evacuationInstructions: params.evacuationInstructions?.trim() || null,
      assemblyPoint: params.assemblyPoint?.trim() || null,
      requiredEquipment: params.requiredEquipment?.trim() || null,
      steps: params.steps?.trim() || null,
      createdById,
    },
  });

  await logAudit({
    userId: createdById,
    projectId,
    action: "HSE_EMERGENCY_PROCEDURE_CREATED",
    entityType: "HseEmergencyProcedure",
    entityId: procedure.id,
    metadata: { title: procedure.title, emergencyType: procedure.emergencyType },
  });

  return procedure;
}

export async function updateEmergencyProcedure(params: {
  id: string;
  projectId: string;
  actingUserId: string;
  title?: string;
  emergencyType?: string;
  immediateActions?: string;
  evacuationInstructions?: string | null;
  assemblyPoint?: string | null;
  requiredEquipment?: string | null;
  steps?: string | null;
}) {
  const { id, projectId, actingUserId } = params;
  await requirePermission(actingUserId, PERMISSION, { projectId });

  const existing = await prisma.hseEmergencyProcedure.findFirst({ where: { id, projectId } });
  if (!existing) throw new EmergencyError("Procedure not found.");

  const updated = await prisma.hseEmergencyProcedure.update({
    where: { id },
    data: {
      title: params.title?.trim() || existing.title,
      emergencyType: params.emergencyType ?? existing.emergencyType,
      immediateActions: params.immediateActions?.trim() || existing.immediateActions,
      evacuationInstructions: params.evacuationInstructions !== undefined ? params.evacuationInstructions?.trim() || null : existing.evacuationInstructions,
      assemblyPoint: params.assemblyPoint !== undefined ? params.assemblyPoint?.trim() || null : existing.assemblyPoint,
      requiredEquipment: params.requiredEquipment !== undefined ? params.requiredEquipment?.trim() || null : existing.requiredEquipment,
      steps: params.steps !== undefined ? params.steps?.trim() || null : existing.steps,
    },
  });

  await logAudit({
    userId: actingUserId,
    projectId,
    action: "HSE_EMERGENCY_PROCEDURE_UPDATED",
    entityType: "HseEmergencyProcedure",
    entityId: id,
  });

  return updated;
}

export async function updateEmergencyProcedureStatus(params: {
  id: string;
  projectId: string;
  actingUserId: string;
  status: HseEmergencyProcedureStatus;
}) {
  const { id, projectId, actingUserId, status } = params;
  await requirePermission(actingUserId, PERMISSION, { projectId });

  const existing = await prisma.hseEmergencyProcedure.findFirst({ where: { id, projectId } });
  if (!existing) throw new EmergencyError("Procedure not found.");

  // Activating a procedure is the real-world review checkpoint — record who
  // reviewed it and when, rather than a separate untracked "review" action.
  const updated = await prisma.hseEmergencyProcedure.update({
    where: { id },
    data: {
      status,
      lastReviewedAt: status === "ACTIVE" ? new Date() : existing.lastReviewedAt,
      reviewedById: status === "ACTIVE" ? actingUserId : existing.reviewedById,
    },
  });

  await logAudit({
    userId: actingUserId,
    projectId,
    action: "HSE_EMERGENCY_PROCEDURE_STATUS_CHANGED",
    entityType: "HseEmergencyProcedure",
    entityId: id,
    metadata: { from: existing.status, to: status },
  });

  return updated;
}

// --- Events ---------------------------------------------------------

export async function createEmergencyEvent(params: {
  projectId: string;
  reportedById: string;
  emergencyType: string;
  occurredAt: Date;
  location: string;
  severity: HseSeverity;
  description: string;
  immediateActions?: string;
  peopleAffected?: string;
  emergencyServicesContacted?: boolean;
  evacuationRequired?: boolean;
  assemblyPoint?: string;
}) {
  const { projectId, reportedById } = params;
  await requirePermission(reportedById, PERMISSION, { projectId });

  if (!params.location.trim()) throw new EmergencyError("Location is required.");
  if (!params.description.trim()) throw new EmergencyError("Description is required.");
  if (Number.isNaN(params.occurredAt.getTime())) throw new EmergencyError("A valid date/time is required.");

  const prefix = hseNumberPrefix("EMR");
  const existing = await prisma.hseEmergencyEvent.findMany({
    where: { projectId, eventNumber: { startsWith: prefix } },
    select: { eventNumber: true },
  });
  const eventNumber = computeNextNumber(existing.map((e) => e.eventNumber), prefix);

  const event = await prisma.hseEmergencyEvent.create({
    data: {
      projectId,
      eventNumber,
      emergencyType: params.emergencyType,
      occurredAt: params.occurredAt,
      location: params.location.trim(),
      reportedById,
      severity: params.severity,
      description: params.description.trim(),
      immediateActions: params.immediateActions?.trim() || null,
      peopleAffected: params.peopleAffected?.trim() || null,
      emergencyServicesContacted: params.emergencyServicesContacted ?? false,
      evacuationRequired: params.evacuationRequired ?? false,
      assemblyPoint: params.assemblyPoint?.trim() || null,
    },
  });

  await logAudit({
    userId: reportedById,
    projectId,
    action: "HSE_EMERGENCY_EVENT_CREATED",
    entityType: "HseEmergencyEvent",
    entityId: event.id,
    metadata: { eventNumber, emergencyType: params.emergencyType, severity: params.severity },
  });

  return event;
}

export async function updateEmergencyEventStatus(params: {
  id: string;
  projectId: string;
  actingUserId: string;
  status: HseEmergencyEventStatus;
}) {
  const { id, projectId, actingUserId, status } = params;
  await requirePermission(actingUserId, PERMISSION, { projectId });

  const existing = await prisma.hseEmergencyEvent.findFirst({ where: { id, projectId } });
  if (!existing) throw new EmergencyError("Emergency event not found.");

  const fromIdx = EMERGENCY_EVENT_STATUS_ORDER.indexOf(existing.status);
  const toIdx = EMERGENCY_EVENT_STATUS_ORDER.indexOf(status);
  if (toIdx === -1) throw new EmergencyError("Invalid status.");
  const isReopeningFromClosed = existing.status === "CLOSED" && status !== "CLOSED";
  if (toIdx < fromIdx && !isReopeningFromClosed) {
    throw new EmergencyError(`An event already in "${existing.status}" cannot move backward to an earlier stage.`);
  }

  const updated = await prisma.hseEmergencyEvent.update({ where: { id }, data: { status } });

  await logAudit({
    userId: actingUserId,
    projectId,
    action: "HSE_EMERGENCY_EVENT_STATUS_CHANGED",
    entityType: "HseEmergencyEvent",
    entityId: id,
    metadata: { from: existing.status, to: status },
  });

  return updated;
}

// --- Drills ---------------------------------------------------------

export async function createEmergencyDrill(params: {
  projectId: string;
  createdById: string;
  drillType: string;
  scheduledAt: Date;
  location: string;
  scenario?: string;
  coordinatorId: string;
  expectedParticipants?: number;
  assemblyPoint?: string;
}) {
  const { projectId, createdById } = params;
  await requirePermission(createdById, PERMISSION, { projectId });

  if (!params.location.trim()) throw new EmergencyError("Location is required.");
  if (Number.isNaN(params.scheduledAt.getTime())) throw new EmergencyError("A valid scheduled date/time is required.");

  const coordinatorMember = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: params.coordinatorId } },
  });
  if (!coordinatorMember) throw new EmergencyError("Coordinator is not a member of this project.");

  const prefix = hseNumberPrefix("DRL");
  const existing = await prisma.hseEmergencyDrill.findMany({
    where: { projectId, drillNumber: { startsWith: prefix } },
    select: { drillNumber: true },
  });
  const drillNumber = computeNextNumber(existing.map((e) => e.drillNumber), prefix);

  const drill = await prisma.hseEmergencyDrill.create({
    data: {
      projectId,
      drillNumber,
      drillType: params.drillType,
      scheduledAt: params.scheduledAt,
      location: params.location.trim(),
      scenario: params.scenario?.trim() || null,
      coordinatorId: params.coordinatorId,
      expectedParticipants: params.expectedParticipants ?? null,
      assemblyPoint: params.assemblyPoint?.trim() || null,
      createdById,
    },
  });

  await logAudit({
    userId: createdById,
    projectId,
    action: "HSE_EMERGENCY_DRILL_SCHEDULED",
    entityType: "HseEmergencyDrill",
    entityId: drill.id,
    metadata: { drillNumber, drillType: params.drillType, scheduledAt: params.scheduledAt.toISOString() },
  });

  return drill;
}

export async function completeEmergencyDrill(params: {
  id: string;
  projectId: string;
  actingUserId: string;
  actualParticipants?: number;
  observations?: string;
  result: HseEmergencyDrillResult;
  startedAt?: Date;
  endedAt?: Date;
}) {
  const { id, projectId, actingUserId } = params;
  await requirePermission(actingUserId, PERMISSION, { projectId });

  const existing = await prisma.hseEmergencyDrill.findFirst({ where: { id, projectId } });
  if (!existing) throw new EmergencyError("Drill not found.");

  const updated = await prisma.hseEmergencyDrill.update({
    where: { id },
    data: {
      status: "COMPLETED",
      result: params.result,
      actualParticipants: params.actualParticipants ?? existing.actualParticipants,
      observations: params.observations?.trim() || existing.observations,
      startedAt: params.startedAt ?? existing.startedAt ?? new Date(),
      endedAt: params.endedAt ?? new Date(),
    },
  });

  await logAudit({
    userId: actingUserId,
    projectId,
    action: "HSE_EMERGENCY_DRILL_COMPLETED",
    entityType: "HseEmergencyDrill",
    entityId: id,
    metadata: { result: params.result },
  });

  return updated;
}

export async function recordDrillAttendance(params: {
  drillId: string;
  projectId: string;
  actingUserId: string;
  attendees: { userId?: string; organizationName?: string; present: boolean; role?: string }[];
}) {
  const { drillId, projectId, actingUserId, attendees } = params;
  await requirePermission(actingUserId, PERMISSION, { projectId });

  const drill = await prisma.hseEmergencyDrill.findFirst({ where: { id: drillId, projectId } });
  if (!drill) throw new EmergencyError("Drill not found.");

  // Idempotent full replace — attendance for a drill is recorded in one
  // submission, not accumulated incrementally.
  await prisma.$transaction([
    prisma.hseEmergencyDrillAttendee.deleteMany({ where: { drillId } }),
    prisma.hseEmergencyDrillAttendee.createMany({
      data: attendees.map((a) => ({
        drillId,
        userId: a.userId ?? null,
        organizationName: a.organizationName?.trim() || null,
        present: a.present,
        role: a.role?.trim() || null,
      })),
    }),
  ]);

  await logAudit({
    userId: actingUserId,
    projectId,
    action: "HSE_EMERGENCY_DRILL_ATTENDANCE_RECORDED",
    entityType: "HseEmergencyDrill",
    entityId: drillId,
    metadata: { count: attendees.length, present: attendees.filter((a) => a.present).length },
  });
}

export async function addDrillFinding(params: {
  drillId: string;
  projectId: string;
  actingUserId: string;
  issue: string;
  severity: HseSeverity;
  finding: string;
}) {
  const { drillId, projectId, actingUserId } = params;
  await requirePermission(actingUserId, PERMISSION, { projectId });

  const drill = await prisma.hseEmergencyDrill.findFirst({ where: { id: drillId, projectId } });
  if (!drill) throw new EmergencyError("Drill not found.");
  if (!params.issue.trim()) throw new EmergencyError("Issue is required.");
  if (!params.finding.trim()) throw new EmergencyError("Finding is required.");

  const finding = await prisma.hseEmergencyDrillFinding.create({
    data: { drillId, issue: params.issue.trim(), severity: params.severity, finding: params.finding.trim() },
  });

  await logAudit({
    userId: actingUserId,
    projectId,
    action: "HSE_EMERGENCY_DRILL_FINDING_ADDED",
    entityType: "HseEmergencyDrill",
    entityId: drillId,
    metadata: { issue: finding.issue, severity: finding.severity },
  });

  return finding;
}

/** Reuses the existing Corrective Action infrastructure directly — no
 * parallel action-management system for emergency findings. */
export async function raiseFindingCorrectiveAction(params: {
  findingId: string;
  projectId: string;
  actingUserId: string;
  assignedToId?: string;
  priority?: HseActionPriority;
  dueDate?: Date;
}) {
  const { findingId, projectId, actingUserId } = params;
  const finding = await prisma.hseEmergencyDrillFinding.findFirst({
    where: { id: findingId, drill: { projectId } },
  });
  if (!finding) throw new EmergencyError("Finding not found.");

  return createCorrectiveAction({
    projectId,
    createdById: actingUserId,
    sourceType: "HseEmergencyDrillFinding",
    sourceId: finding.id,
    description: `${finding.issue}: ${finding.finding}`,
    assignedToId: params.assignedToId,
    priority: params.priority,
    dueDate: params.dueDate,
  });
}
