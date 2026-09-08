import "server-only";

import type { Prisma } from "@prisma/client";
import { isDocumentStatus } from "./status";

export const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = 25;

export type DocumentSearchParams = {
  q?: string;
  documentNo?: string;
  title?: string;
  revision?: string;
  typeId?: string;
  status?: string;
  discipline?: string;
  uploadedBy?: string;
  organizationId?: string;
  dateUploadedFrom?: string;
  dateUploadedTo?: string;
  dateModifiedFrom?: string;
  dateModifiedTo?: string;
  sort?: string;
  dir?: string;
  page?: string;
  pageSize?: string;
};

export const SORT_KEYS = [
  "documentNo",
  "revision",
  "title",
  "type",
  "status",
  "discipline",
  "uploadedBy",
  "organization",
  "dateUploaded",
  "dateModified",
] as const;
export type SortKey = (typeof SORT_KEYS)[number];

export function parsePage(pageParam: string | undefined): number {
  const n = Number(pageParam);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
}

export function parsePageSize(pageSizeParam: string | undefined): number {
  const n = Number(pageSizeParam);
  return (PAGE_SIZE_OPTIONS as readonly number[]).includes(n) ? n : DEFAULT_PAGE_SIZE;
}

export function parseSort(params: DocumentSearchParams): {
  orderBy: Prisma.DocumentOrderByWithRelationInput;
  sort: SortKey;
  dir: "asc" | "desc";
} {
  const dir: "asc" | "desc" = params.dir === "asc" ? "asc" : "desc";
  const sort: SortKey = (SORT_KEYS as readonly string[]).includes(params.sort ?? "")
    ? (params.sort as SortKey)
    : "dateUploaded";

  const orderBy: Prisma.DocumentOrderByWithRelationInput =
    sort === "documentNo"
      ? { documentNo: dir }
      : sort === "revision"
        ? { currentRevision: dir }
        : sort === "title"
          ? { title: dir }
          : sort === "type"
            ? { type: { name: dir } }
            : sort === "status"
              ? { status: dir }
              : sort === "discipline"
                ? { discipline: dir }
                : sort === "uploadedBy"
                  ? { createdBy: { name: dir } }
                  : sort === "organization"
                    ? { createdBy: { organization: { name: dir } } }
                    : sort === "dateModified"
                      ? { updatedAt: dir }
                      : { createdAt: dir };

  return { orderBy, sort, dir };
}

function dayRange(dateStr: string): { gte: Date; lt: Date } {
  const start = new Date(`${dateStr}T00:00:00.000Z`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { gte: start, lt: end };
}

function dateRangeFilter(from: string | undefined, to: string | undefined): { gte?: Date; lte?: Date; lt?: Date } | null {
  if (from && to) {
    return { gte: new Date(`${from}T00:00:00.000Z`), lte: new Date(`${to}T23:59:59.999Z`) };
  }
  if (from) {
    const { gte, lt } = dayRange(from);
    return { gte, lt };
  }
  if (to) {
    return { lte: new Date(`${to}T23:59:59.999Z`) };
  }
  return null;
}

export function buildWhere(projectId: string, params: DocumentSearchParams): Prisma.DocumentWhereInput {
  const filters: Prisma.DocumentWhereInput[] = [];

  const q = params.q?.trim();
  if (q) {
    filters.push({
      OR: [
        { documentNo: { contains: q, mode: "insensitive" } },
        { title: { contains: q, mode: "insensitive" } },
        { versions: { some: { fileName: { contains: q, mode: "insensitive" } } } },
      ],
    });
  }

  if (params.documentNo?.trim()) {
    filters.push({ documentNo: { contains: params.documentNo.trim(), mode: "insensitive" } });
  }
  if (params.title?.trim()) {
    filters.push({ title: { contains: params.title.trim(), mode: "insensitive" } });
  }
  if (params.revision?.trim()) {
    filters.push({ currentRevision: { contains: params.revision.trim(), mode: "insensitive" } });
  }
  if (params.typeId?.trim()) {
    filters.push({ typeId: params.typeId.trim() });
  }
  const statusValue = params.status?.trim();
  if (statusValue && isDocumentStatus(statusValue)) {
    filters.push({ status: statusValue });
  }
  if (params.discipline?.trim()) {
    filters.push({ discipline: params.discipline.trim() });
  }
  if (params.uploadedBy?.trim()) {
    filters.push({ createdBy: { name: { contains: params.uploadedBy.trim(), mode: "insensitive" } } });
  }
  if (params.organizationId?.trim()) {
    filters.push({ createdBy: { organizationId: params.organizationId.trim() } });
  }

  const uploadedRange = dateRangeFilter(params.dateUploadedFrom, params.dateUploadedTo);
  if (uploadedRange) filters.push({ createdAt: uploadedRange });

  const modifiedRange = dateRangeFilter(params.dateModifiedFrom, params.dateModifiedTo);
  if (modifiedRange) filters.push({ updatedAt: modifiedRange });

  return filters.length > 0 ? { projectId, AND: filters } : { projectId };
}
