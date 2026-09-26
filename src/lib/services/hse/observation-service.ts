import "server-only";

import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { requirePermission } from "@/lib/auth/permissions";
import { computeNextNumber, hseNumberPrefix } from "@/lib/hse/numbering";
import type { HseObservationType, HseObservationStatus, HseSeverity } from "@prisma/client";

export class ObservationError extends Error {}

export async function createObservation(params: {
  projectId: string;
  reportedById: string;
  type: HseObservationType;
  title: string;
  description: string;
  location: string;
  building?: string;
  floor?: string;
  area?: string;
  latitude?: number;
  longitude?: number;
  severity: HseSeverity;
}) {
  const { projectId, reportedById } = params;
  await requirePermission(reportedById, "HSE_REPORT", { projectId });

  if (!params.title.trim()) throw new ObservationError("Title is required.");
  if (!params.description.trim()) throw new ObservationError("Description is required.");
  if (!params.location.trim()) throw new ObservationError("Location is required.");

  const prefix = hseNumberPrefix("OBS");
  const existing = await prisma.hseObservation.findMany({
    where: { projectId, observationNumber: { startsWith: prefix } },
    select: { observationNumber: true },
  });
  const observationNumber = computeNextNumber(existing.map((e) => e.observationNumber), prefix);

  const observation = await prisma.hseObservation.create({
    data: {
      projectId,
      observationNumber,
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
      reportedById,
    },
  });

  await logAudit({
    userId: reportedById,
    projectId,
    action: "HSE_OBSERVATION_CREATED",
    entityType: "HseObservation",
    entityId: observation.id,
    metadata: { observationNumber, type: params.type, severity: params.severity },
  });

  return observation;
}

export async function updateObservationStatus(params: {
  id: string;
  projectId: string;
  actingUserId: string;
  status: HseObservationStatus;
}) {
  const { id, projectId, actingUserId, status } = params;
  await requirePermission(actingUserId, "HSE_MANAGE_OBSERVATIONS", { projectId });

  const existing = await prisma.hseObservation.findFirst({ where: { id, projectId } });
  if (!existing) throw new ObservationError("Observation not found.");

  const updated = await prisma.hseObservation.update({ where: { id }, data: { status } });

  await logAudit({
    userId: actingUserId,
    projectId,
    action: "HSE_OBSERVATION_STATUS_CHANGED",
    entityType: "HseObservation",
    entityId: id,
    metadata: { from: existing.status, to: status },
  });

  return updated;
}
