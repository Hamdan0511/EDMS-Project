import "server-only";

import { prisma } from "@/lib/prisma";

/** Every Field record type maps to the permission that governs adding
 * evidence to it. Populated incrementally as each area's model lands
 * (mirrors src/lib/hse/record-permissions.ts exactly) — never references a
 * model that doesn't exist yet in the generated Prisma client. */
export const FIELD_RECORD_PERMISSION: Record<string, string> = {
  FieldObservation: "FIELD_MANAGE_OBSERVATIONS",
  FieldInspection: "FIELD_MANAGE_INSPECTIONS",
  FieldIssue: "FIELD_MANAGE_ISSUES",
  FieldPunchItem: "FIELD_MANAGE_PUNCH",
  FieldPunchlist: "FIELD_MANAGE_PUNCH",
  FieldItp: "FIELD_MANAGE_ITP",
  FieldTest: "FIELD_MANAGE_TESTS",
  FieldPhoto: "FIELD_MANAGE_PHOTOS",
};

export async function resolveFieldRecordProjectId(recordType: string, recordId: string): Promise<string | null> {
  switch (recordType) {
    case "FieldObservation":
      return (await prisma.fieldObservation.findUnique({ where: { id: recordId }, select: { projectId: true } }))?.projectId ?? null;
    case "FieldInspection":
      return (await prisma.fieldInspection.findUnique({ where: { id: recordId }, select: { projectId: true } }))?.projectId ?? null;
    case "FieldIssue":
      return (await prisma.fieldIssue.findUnique({ where: { id: recordId }, select: { projectId: true } }))?.projectId ?? null;
    case "FieldPunchItem":
      return (await prisma.fieldPunchItem.findUnique({ where: { id: recordId }, select: { projectId: true } }))?.projectId ?? null;
    case "FieldPunchlist":
      return (await prisma.fieldPunchlist.findUnique({ where: { id: recordId }, select: { projectId: true } }))?.projectId ?? null;
    case "FieldItp":
      return (await prisma.fieldItp.findUnique({ where: { id: recordId }, select: { projectId: true } }))?.projectId ?? null;
    case "FieldTest":
      return (await prisma.fieldTest.findUnique({ where: { id: recordId }, select: { projectId: true } }))?.projectId ?? null;
    case "FieldPhoto":
      return (await prisma.fieldPhoto.findUnique({ where: { id: recordId }, select: { projectId: true } }))?.projectId ?? null;
    default:
      return null;
  }
}
