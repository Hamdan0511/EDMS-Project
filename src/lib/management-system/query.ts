import "server-only";

import type { Prisma } from "@prisma/client";
import { isManagementSystemCategory, NO_VALUE } from "./status";

export const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = 25;

export type ManagementSystemSearchParams = {
  q?: string;
  managementSystem?: string;
  documentNo?: string;
  title?: string;
  documentType?: string;
  author?: string;
  documentOwner?: string;
  revision?: string;
  documentDate?: string;
  sort?: string;
  dir?: string;
  page?: string;
  pageSize?: string;
};

export const SORT_KEYS = [
  "documentNo",
  "title",
  "revision",
  "documentType",
  "documentDate",
  "author",
  "documentOwner",
  "managementSystem",
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

export function parseSort(params: ManagementSystemSearchParams): {
  orderBy: Prisma.ManagementSystemDocumentOrderByWithRelationInput;
  sort: SortKey;
  dir: "asc" | "desc";
} {
  const dir: "asc" | "desc" = params.dir === "desc" ? "desc" : "asc";
  const sort: SortKey = (SORT_KEYS as readonly string[]).includes(params.sort ?? "")
    ? (params.sort as SortKey)
    : "documentNo";

  const orderBy: Prisma.ManagementSystemDocumentOrderByWithRelationInput =
    sort === "title"
      ? { title: dir }
      : sort === "revision"
        ? { currentRevision: dir }
        : sort === "documentType"
          ? { documentType: dir }
          : sort === "documentDate"
            ? { documentDate: dir }
            : sort === "author"
              ? { author: dir }
              : sort === "documentOwner"
                ? { documentOwner: dir }
                : sort === "managementSystem"
                  ? { managementSystem: dir }
                  : { documentNo: dir };

  return { orderBy, sort, dir };
}

export function parseMultiValues(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw.split(",").map((v) => v.trim()).filter(Boolean);
}

export function buildWhere(projectId: string, params: ManagementSystemSearchParams): Prisma.ManagementSystemDocumentWhereInput {
  const filters: Prisma.ManagementSystemDocumentWhereInput[] = [];

  const q = params.q?.trim();
  if (q) {
    filters.push({
      OR: [
        { documentNo: { contains: q, mode: "insensitive" } },
        { title: { contains: q, mode: "insensitive" } },
        { documentType: { contains: q, mode: "insensitive" } },
        { author: { contains: q, mode: "insensitive" } },
        { documentOwner: { contains: q, mode: "insensitive" } },
        { versions: { some: { fileName: { contains: q, mode: "insensitive" } } } },
      ],
    });
  }

  const managementSystems = parseMultiValues(params.managementSystem).filter(isManagementSystemCategory);
  if (managementSystems.length > 0) {
    filters.push({ managementSystem: { in: managementSystems } });
  }

  const documentNos = parseMultiValues(params.documentNo);
  if (documentNos.length > 0) {
    filters.push({ documentNo: { in: documentNos } });
  }

  const titles = parseMultiValues(params.title);
  if (titles.length > 0) {
    filters.push({ title: { in: titles } });
  }

  const documentTypes = parseMultiValues(params.documentType);
  if (documentTypes.length > 0) {
    filters.push({ documentType: { in: documentTypes } });
  }

  const authors = parseMultiValues(params.author);
  if (authors.length > 0) {
    const hasNone = authors.includes(NO_VALUE);
    const realValues = authors.filter((v) => v !== NO_VALUE);
    if (hasNone && realValues.length > 0) {
      filters.push({ OR: [{ author: { in: realValues } }, { author: null }] });
    } else if (hasNone) {
      filters.push({ author: null });
    } else {
      filters.push({ author: { in: realValues } });
    }
  }

  const owners = parseMultiValues(params.documentOwner);
  if (owners.length > 0) {
    const hasNone = owners.includes(NO_VALUE);
    const realValues = owners.filter((v) => v !== NO_VALUE);
    if (hasNone && realValues.length > 0) {
      filters.push({ OR: [{ documentOwner: { in: realValues } }, { documentOwner: null }] });
    } else if (hasNone) {
      filters.push({ documentOwner: null });
    } else {
      filters.push({ documentOwner: { in: realValues } });
    }
  }

  const revisions = parseMultiValues(params.revision);
  if (revisions.length > 0) {
    filters.push({ currentRevision: { in: revisions } });
  }

  const dates = parseMultiValues(params.documentDate)
    .map((d) => new Date(d))
    .filter((d) => !Number.isNaN(d.getTime()));
  if (dates.length > 0) {
    filters.push({ documentDate: { in: dates } });
  }

  return filters.length > 0 ? { projectId, AND: filters } : { projectId };
}
