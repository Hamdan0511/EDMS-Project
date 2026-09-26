import "server-only";

import { prisma } from "@/lib/prisma";

/** Every HSE record type maps to the permission that governs adding
 * evidence to it — reporting-oriented records accept evidence from anyone
 * who can report (HSE_REPORT); management-oriented registers require the
 * matching manage permission. */
export const HSE_RECORD_PERMISSION: Record<string, string> = {
  HseObservation: "HSE_REPORT",
  HseIncident: "HSE_REPORT",
  HseNearMiss: "HSE_REPORT",
  HseHazard: "HSE_MANAGE_HAZARDS",
  HseRiskAssessment: "HSE_MANAGE_RISK_ASSESSMENTS",
  HseInspection: "HSE_MANAGE_INSPECTIONS",
  HseCorrectiveAction: "HSE_MANAGE_ACTIONS",
  HsePermit: "HSE_MANAGE_PERMITS",
  HseEquipment: "HSE_MANAGE_EQUIPMENT",
  HseEquipmentInspection: "HSE_MANAGE_EQUIPMENT",
  HseEmergencyProcedure: "HSE_MANAGE_EMERGENCY",
  HseEmergencyEvent: "HSE_MANAGE_EMERGENCY",
  HseEmergencyDrill: "HSE_MANAGE_EMERGENCY",
};

export async function resolveHseRecordProjectId(recordType: string, recordId: string): Promise<string | null> {
  switch (recordType) {
    case "HseObservation":
      return (await prisma.hseObservation.findUnique({ where: { id: recordId }, select: { projectId: true } }))?.projectId ?? null;
    case "HseIncident":
      return (await prisma.hseIncident.findUnique({ where: { id: recordId }, select: { projectId: true } }))?.projectId ?? null;
    case "HseNearMiss":
      return (await prisma.hseNearMiss.findUnique({ where: { id: recordId }, select: { projectId: true } }))?.projectId ?? null;
    case "HseHazard":
      return (await prisma.hseHazard.findUnique({ where: { id: recordId }, select: { projectId: true } }))?.projectId ?? null;
    case "HseRiskAssessment":
      return (await prisma.hseRiskAssessment.findUnique({ where: { id: recordId }, select: { projectId: true } }))?.projectId ?? null;
    case "HseInspection":
      return (await prisma.hseInspection.findUnique({ where: { id: recordId }, select: { projectId: true } }))?.projectId ?? null;
    case "HseCorrectiveAction":
      return (await prisma.hseCorrectiveAction.findUnique({ where: { id: recordId }, select: { projectId: true } }))?.projectId ?? null;
    case "HsePermit":
      return (await prisma.hsePermit.findUnique({ where: { id: recordId }, select: { projectId: true } }))?.projectId ?? null;
    case "HseEquipment":
      return (await prisma.hseEquipment.findUnique({ where: { id: recordId }, select: { projectId: true } }))?.projectId ?? null;
    case "HseEquipmentInspection":
      return (await prisma.hseEquipmentInspection.findUnique({ where: { id: recordId }, select: { projectId: true } }))?.projectId ?? null;
    case "HseEmergencyProcedure":
      return (await prisma.hseEmergencyProcedure.findUnique({ where: { id: recordId }, select: { projectId: true } }))?.projectId ?? null;
    case "HseEmergencyEvent":
      return (await prisma.hseEmergencyEvent.findUnique({ where: { id: recordId }, select: { projectId: true } }))?.projectId ?? null;
    case "HseEmergencyDrill":
      return (await prisma.hseEmergencyDrill.findUnique({ where: { id: recordId }, select: { projectId: true } }))?.projectId ?? null;
    default:
      return null;
  }
}
