import "server-only";

import { prisma } from "@/lib/prisma";

/**
 * Reserves a contiguous block of document numbers, continuing from the
 * highest numeric suffix currently in use for this project's prefix.
 *
 * This must NOT be based on a row count: documents can be deleted (a real,
 * user-facing action), which reduces the count without freeing up the
 * numbers already assigned to documents that still exist. Counting rows
 * then reproduces already-taken numbers and fails on the unique
 * [projectId, documentNo] constraint the moment any document has ever been
 * deleted from the project.
 */
export async function reserveDocumentNumbers(
  projectId: string,
  projectCode: string | null,
  count: number,
): Promise<string[]> {
  const prefix = (projectCode ?? "SF").toUpperCase();
  const numberPrefix = `${prefix}-DOC-`;

  const existing = await prisma.document.findMany({
    where: { projectId, documentNo: { startsWith: numberPrefix } },
    select: { documentNo: true },
  });

  let maxSuffix = 0;
  for (const doc of existing) {
    const suffix = doc.documentNo.slice(numberPrefix.length);
    const parsed = Number.parseInt(suffix, 10);
    if (Number.isFinite(parsed) && parsed > maxSuffix) {
      maxSuffix = parsed;
    }
  }

  return Array.from({ length: count }, (_, i) =>
    `${numberPrefix}${String(maxSuffix + i + 1).padStart(5, "0")}`,
  );
}
