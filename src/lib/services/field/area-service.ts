import "server-only";

import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { requireAnyPermission } from "@/lib/auth/permissions";

export class FieldAreaError extends Error {}

/** The site location hierarchy is shared infrastructure for every Field
 * area — managing it requires at least one real Field "manage" permission
 * (any area), not just the blanket FIELD_VIEW every Viewer already has. */
const AREA_MANAGE_PERMISSIONS = [
  "FIELD_MANAGE_OBSERVATIONS",
  "FIELD_MANAGE_INSPECTIONS",
  "FIELD_MANAGE_ISSUES",
  "FIELD_MANAGE_PUNCH",
  "FIELD_MANAGE_ITP",
  "FIELD_MANAGE_TESTS",
  "FIELD_MANAGE_PHOTOS",
];

export async function createFieldArea(params: {
  projectId: string;
  actingUserId: string;
  name: string;
  parentId?: string;
  code?: string;
  description?: string;
  levelType?: string;
}) {
  const { projectId, actingUserId } = params;
  await requireAnyPermission(actingUserId, AREA_MANAGE_PERMISSIONS, { projectId });

  if (!params.name.trim()) throw new FieldAreaError("Name is required.");

  if (params.parentId) {
    const parent = await prisma.fieldArea.findFirst({ where: { id: params.parentId, projectId } });
    if (!parent) throw new FieldAreaError("Parent location not found in this project.");
  }

  const area = await prisma.fieldArea.create({
    data: {
      projectId,
      name: params.name.trim(),
      parentId: params.parentId ?? null,
      code: params.code?.trim() || null,
      description: params.description?.trim() || null,
      levelType: params.levelType?.trim() || null,
    },
  });

  await logAudit({
    userId: actingUserId,
    projectId,
    action: "FIELD_AREA_CREATED",
    entityType: "FieldArea",
    entityId: area.id,
    metadata: { name: area.name, parentId: area.parentId },
  });

  return area;
}

export async function updateFieldArea(params: {
  id: string;
  projectId: string;
  actingUserId: string;
  name?: string;
  code?: string | null;
  description?: string | null;
  levelType?: string | null;
  active?: boolean;
}) {
  const { id, projectId, actingUserId } = params;
  await requireAnyPermission(actingUserId, AREA_MANAGE_PERMISSIONS, { projectId });

  const existing = await prisma.fieldArea.findFirst({ where: { id, projectId } });
  if (!existing) throw new FieldAreaError("Location not found.");

  return prisma.fieldArea.update({
    where: { id },
    data: {
      name: params.name?.trim() || existing.name,
      code: params.code !== undefined ? params.code?.trim() || null : existing.code,
      description: params.description !== undefined ? params.description?.trim() || null : existing.description,
      levelType: params.levelType !== undefined ? params.levelType?.trim() || null : existing.levelType,
      active: params.active ?? existing.active,
    },
  });
}

/** Real hierarchical tree for the project, used by both the Areas management
 * page and every Field area-picker dropdown. */
export async function listFieldAreaTree(projectId: string) {
  const areas = await prisma.fieldArea.findMany({ where: { projectId, active: true }, orderBy: { name: "asc" } });
  type Node = (typeof areas)[number] & { children: Node[] };
  const byId = new Map<string, Node>(areas.map((a) => [a.id, { ...a, children: [] }]));
  const roots: Node[] = [];
  for (const area of byId.values()) {
    if (area.parentId && byId.has(area.parentId)) {
      byId.get(area.parentId)!.children.push(area);
    } else {
      roots.push(area);
    }
  }
  return roots;
}

/** All descendant area IDs (including the area itself) — used by the
 * Area/Location aggregation view so counts roll up the hierarchy. */
export async function fieldAreaAndDescendantIds(projectId: string, areaId: string): Promise<string[]> {
  const all = await prisma.fieldArea.findMany({ where: { projectId }, select: { id: true, parentId: true } });
  const childrenOf = new Map<string, string[]>();
  for (const a of all) {
    if (!a.parentId) continue;
    childrenOf.set(a.parentId, [...(childrenOf.get(a.parentId) ?? []), a.id]);
  }
  const result: string[] = [];
  const stack = [areaId];
  while (stack.length > 0) {
    const current = stack.pop()!;
    result.push(current);
    stack.push(...(childrenOf.get(current) ?? []));
  }
  return result;
}
