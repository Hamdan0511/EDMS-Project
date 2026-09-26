import "server-only";

import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { requirePermission } from "@/lib/auth/permissions";
import { computeNextNumber, hseNumberPrefix } from "@/lib/hse/numbering";
import { INCIDENT_STATUS_ORDER } from "@/lib/hse/status";
import type { HseIncidentType, HseIncidentStatus, HseSeverity } from "@prisma/client";

export class IncidentError extends Error {}

export async function createIncident(params: {
  projectId: string;
  reportedById: string;
  type: HseIncidentType;
  title: string;
  description: string;
  location: string;
  building?: string;
  floor?: string;
  area?: string;
  latitude?: number;
  longitude?: number;
  severity: HseSeverity;
  incidentDate: Date;
  incidentTime?: string;
}) {
  const { projectId, reportedById } = params;
  await requirePermission(reportedById, "HSE_REPORT", { projectId });

  if (!params.title.trim()) throw new IncidentError("Title is required.");
  if (!params.description.trim()) throw new IncidentError("Description is required.");
  if (!params.location.trim()) throw new IncidentError("Location is required.");
  if (Number.isNaN(params.incidentDate.getTime())) throw new IncidentError("A valid incident date is required.");

  const prefix = hseNumberPrefix("INC");
  const existing = await prisma.hseIncident.findMany({
    where: { projectId, incidentNumber: { startsWith: prefix } },
    select: { incidentNumber: true },
  });
  const incidentNumber = computeNextNumber(existing.map((e) => e.incidentNumber), prefix);

  const incident = await prisma.hseIncident.create({
    data: {
      projectId,
      incidentNumber,
      type: params.type,
      title: params.title.trim(),
      description: params.description.trim(),
      location: params.location.trim(),
      building: params.building?.trim() || null,
      floor: params.floor?.trim() || null,
      area: params.area?.trim() || null,
      latitude: params.latitude ?? null,
      longitude: params.longitude ?? null,
      severity: params.severity,
      incidentDate: params.incidentDate,
      incidentTime: params.incidentTime?.trim() || null,
      reportedById,
    },
  });

  await logAudit({
    userId: reportedById,
    projectId,
    action: "HSE_INCIDENT_CREATED",
    entityType: "HseIncident",
    entityId: incident.id,
    metadata: { incidentNumber, type: params.type, severity: params.severity },
  });

  return incident;
}

export async function updateIncidentStatus(params: {
  id: string;
  projectId: string;
  actingUserId: string;
  status: HseIncidentStatus;
}) {
  const { id, projectId, actingUserId, status } = params;
  await requirePermission(actingUserId, "HSE_MANAGE_INCIDENTS", { projectId });

  const existing = await prisma.hseIncident.findFirst({ where: { id, projectId } });
  if (!existing) throw new IncidentError("Incident not found.");

  // Enforce the real, ordered lifecycle: forward progress is always allowed
  // (an incident needing no investigation can close immediately), but moving
  // backward is only allowed to reopen a CLOSED incident — never allowed
  // once any other later stage is reverted.
  const fromIdx = INCIDENT_STATUS_ORDER.indexOf(existing.status);
  const toIdx = INCIDENT_STATUS_ORDER.indexOf(status);
  if (toIdx === -1) throw new IncidentError("Invalid status.");
  const isReopeningFromClosed = existing.status === "CLOSED" && status !== "CLOSED";
  if (toIdx < fromIdx && !isReopeningFromClosed) {
    throw new IncidentError(`An incident already in "${existing.status}" cannot move backward to an earlier stage.`);
  }

  const updated = await prisma.hseIncident.update({ where: { id }, data: { status } });

  await logAudit({
    userId: actingUserId,
    projectId,
    action: "HSE_INCIDENT_STATUS_CHANGED",
    entityType: "HseIncident",
    entityId: id,
    metadata: { from: existing.status, to: status },
  });

  return updated;
}

export async function updateIncidentInvestigation(params: {
  id: string;
  projectId: string;
  actingUserId: string;
  immediateCause?: string;
  contributingFactors?: string;
  rootCause?: string;
}) {
  const { id, projectId, actingUserId } = params;
  await requirePermission(actingUserId, "HSE_MANAGE_INCIDENTS", { projectId });

  const existing = await prisma.hseIncident.findFirst({ where: { id, projectId } });
  if (!existing) throw new IncidentError("Incident not found.");

  const updated = await prisma.hseIncident.update({
    where: { id },
    data: {
      immediateCause: params.immediateCause?.trim() || null,
      contributingFactors: params.contributingFactors?.trim() || null,
      rootCause: params.rootCause?.trim() || null,
    },
  });

  await logAudit({
    userId: actingUserId,
    projectId,
    action: "HSE_INCIDENT_INVESTIGATION_UPDATED",
    entityType: "HseIncident",
    entityId: id,
  });

  return updated;
}

export async function addIncidentPerson(params: {
  incidentId: string;
  projectId: string;
  actingUserId: string;
  name: string;
  role: string;
  organization?: string;
  userId?: string;
}) {
  const { incidentId, projectId, actingUserId } = params;
  await requirePermission(actingUserId, "HSE_MANAGE_INCIDENTS", { projectId });

  const incident = await prisma.hseIncident.findFirst({ where: { id: incidentId, projectId } });
  if (!incident) throw new IncidentError("Incident not found.");
  if (!params.name.trim()) throw new IncidentError("Name is required.");

  if (params.userId) {
    const member = await prisma.projectMember.findUnique({ where: { projectId_userId: { projectId, userId: params.userId } } });
    if (!member) throw new IncidentError("Selected person is not a member of this project.");
  }

  const person = await prisma.hseIncidentPerson.create({
    data: {
      incidentId,
      userId: params.userId ?? null,
      name: params.name.trim(),
      role: params.role,
      organization: params.organization?.trim() || null,
    },
  });

  await logAudit({
    userId: actingUserId,
    projectId,
    action: "HSE_INCIDENT_PERSON_ADDED",
    entityType: "HseIncident",
    entityId: incidentId,
    metadata: { name: person.name, role: person.role },
  });

  return person;
}
