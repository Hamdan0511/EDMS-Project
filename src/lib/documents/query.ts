import "server-only";

import type { Prisma } from "@prisma/client";
import { isDocumentStatus, isDocumentReviewStatus, NO_DOCUMENT_TYPE_VALUE } from "./status";

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
  functionalBreakdown?: string;
  spatialBreakdown?: string;
  reviewStatus?: string;
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
  "functionalBreakdown",
  "spatialBreakdown",
  "reviewStatus",
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
                : sort === "functionalBreakdown"
                  ? { functionalBreakdown: dir }
                  : sort === "spatialBreakdown"
                    ? { spatialBreakdown: dir }
                    : sort === "reviewStatus"
                      ? { reviewStatus: dir }
                      : sort === "uploadedBy"
                        ? { createdBy: { name: dir } }
                        : sort === "organization"
                          ? { createdBy: { organization: { name: dir } } }
                          : sort === "dateModified"
                            ? { updatedAt: dir }
                            : { createdAt: dir };

  return { orderBy, sort, dir };
}

/** Filter params that accept either a single value or a comma-joined list
 * of values (the primary Drawings filter row uses real multi-selects) — one
 * parser for both cases, since `in: [x]` behaves identically to `equals: x`. */
function parseMultiValues(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
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
  const typeIds = parseMultiValues(params.typeId);
  if (typeIds.length > 0) {
    const hasNoType = typeIds.includes(NO_DOCUMENT_TYPE_VALUE);
    const realIds = typeIds.filter((v) => v !== NO_DOCUMENT_TYPE_VALUE);
    if (hasNoType && realIds.length > 0) {
      filters.push({ OR: [{ typeId: { in: realIds } }, { typeId: null }] });
    } else if (hasNoType) {
      filters.push({ typeId: null });
    } else {
      filters.push({ typeId: { in: realIds } });
    }
  }
  const statusValues = parseMultiValues(params.status).filter(isDocumentStatus);
  if (statusValues.length > 0) {
    filters.push({ status: { in: statusValues } });
  }
  const disciplineValues = parseMultiValues(params.discipline);
  if (disciplineValues.length > 0) {
    filters.push({ discipline: { in: disciplineValues } });
  }
  const functionalBreakdownValues = parseMultiValues(params.functionalBreakdown);
  if (functionalBreakdownValues.length > 0) {
    filters.push({ functionalBreakdown: { in: functionalBreakdownValues } });
  }
  const spatialBreakdownValues = parseMultiValues(params.spatialBreakdown);
  if (spatialBreakdownValues.length > 0) {
    filters.push({ spatialBreakdown: { in: spatialBreakdownValues } });
  }
  const reviewStatusValues = parseMultiValues(params.reviewStatus).filter(isDocumentReviewStatus);
  if (reviewStatusValues.length > 0) {
    filters.push({ reviewStatus: { in: reviewStatusValues } });
  }
  if (params.uploadedBy?.trim()) {
    filters.push({ createdBy: { name: { contains: params.uploadedBy.trim(), mode: "insensitive" } } });
  }
  const organizationIds = parseMultiValues(params.organizationId);
  if (organizationIds.length > 0) {
    filters.push({ createdBy: { organizationId: { in: organizationIds } } });
  }

  const uploadedRange = dateRangeFilter(params.dateUploadedFrom, params.dateUploadedTo);
  if (uploadedRange) filters.push({ createdAt: uploadedRange });

  const modifiedRange = dateRangeFilter(params.dateModifiedFrom, params.dateModifiedTo);
  if (modifiedRange) filters.push({ updatedAt: modifiedRange });

  return filters.length > 0 ? { projectId, AND: filters } : { projectId };
}
