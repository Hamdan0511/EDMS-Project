import "server-only";

import { prisma } from "@/lib/prisma";
import type { DocumentMetadataCategory } from "@prisma/client";

/** Real, project-configurable value lists for Discipline / Functional
 * Breakdown / Spatial Breakdown — never a hardcoded array. */
export async function getDocumentMetadataOptions(
  projectId: string,
  category: DocumentMetadataCategory,
): Promise<string[]> {
  const rows = await prisma.documentMetadataOption.findMany({
    where: { projectId, category },
    orderBy: { name: "asc" },
    select: { name: true },
  });
  return rows.map((r) => r.name);
}
