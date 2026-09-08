import "server-only";

import type { Prisma, TemporaryFileStatus } from "@prisma/client";
import { WORD_MIME_TYPES, EXCEL_MIME_TYPES, POWERPOINT_MIME_TYPES, KNOWN_MIME_TYPES } from "@/lib/files/file-types";

export const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = 25;

export type TemporaryFileSearchParams = {
  q?: string;
  status?: string;
  fileType?: string;
  dateFrom?: string;
  dateTo?: string;
  sort?: string;
  dir?: string;
  page?: string;
  pageSize?: string;
};

export const SORT_KEYS = ["fileName", "uploadedBy", "uploadedAt", "sizeBytes", "status"] as const;
export type SortKey = (typeof SORT_KEYS)[number];

export function parsePage(pageParam: string | undefined): number {
  const n = Number(pageParam);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
}

export function parsePageSize(pageSizeParam: string | undefined): number {
  const n = Number(pageSizeParam);
  return (PAGE_SIZE_OPTIONS as readonly number[]).includes(n) ? n : DEFAULT_PAGE_SIZE;
}

export function parseSort(params: TemporaryFileSearchParams): {
  orderBy: Prisma.TemporaryFileOrderByWithRelationInput;
  sort: SortKey;
  dir: "asc" | "desc";
} {
  const dir: "asc" | "desc" = params.dir === "asc" ? "asc" : "desc";
  const sort: SortKey = (SORT_KEYS as readonly string[]).includes(params.sort ?? "")
    ? (params.sort as SortKey)
    : "uploadedAt";

  const orderBy: Prisma.TemporaryFileOrderByWithRelationInput =
    sort === "fileName"
      ? { originalFileName: dir }
      : sort === "uploadedBy"
        ? { uploadedBy: { name: dir } }
        : sort === "sizeBytes"
          ? { sizeBytes: dir }
          : sort === "status"
            ? { status: dir }
            : { uploadedAt: dir };

  return { orderBy, sort, dir };
}

function fileTypeWhere(fileType: string): Prisma.TemporaryFileWhereInput | null {
  if (fileType === "pdf") return { mimeType: "application/pdf" };
  if (fileType === "word") return { mimeType: { in: WORD_MIME_TYPES } };
  if (fileType === "excel") return { mimeType: { in: EXCEL_MIME_TYPES } };
  if (fileType === "powerpoint") return { mimeType: { in: POWERPOINT_MIME_TYPES } };
  if (fileType === "image") return { mimeType: { startsWith: "image/" } };
  if (fileType === "other") {
    return { AND: [{ mimeType: { notIn: KNOWN_MIME_TYPES } }, { NOT: { mimeType: { startsWith: "image/" } } }] };
  }
  return null;
}

export function buildWhere(projectId: string, params: TemporaryFileSearchParams): Prisma.TemporaryFileWhereInput {
  const filters: Prisma.TemporaryFileWhereInput[] = [];

  const q = params.q?.trim();
  if (q) {
    filters.push({
      OR: [
        { originalFileName: { contains: q, mode: "insensitive" } },
        { uploadedBy: { name: { contains: q, mode: "insensitive" } } },
      ],
    });
  }

  if (params.status?.trim()) {
    filters.push({ status: params.status.trim() as TemporaryFileStatus });
  }

  if (params.fileType?.trim()) {
    const ft = fileTypeWhere(params.fileType.trim());
    if (ft) filters.push(ft);
  }

  if (params.dateFrom && params.dateTo) {
    filters.push({
      uploadedAt: {
        gte: new Date(`${params.dateFrom}T00:00:00.000Z`),
        lte: new Date(`${params.dateTo}T23:59:59.999Z`),
      },
    });
  } else if (params.dateFrom) {
    const start = new Date(`${params.dateFrom}T00:00:00.000Z`);
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    filters.push({ uploadedAt: { gte: start, lt: end } });
  }

  return filters.length > 0 ? { projectId, AND: filters } : { projectId };
}
