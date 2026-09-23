import Link from "next/link";
import { requirePageContext } from "@/lib/page-context";
import { prisma } from "@/lib/prisma";
import { Pagination } from "@/components/ui/pagination";
import { PageSizeSelect } from "@/components/documents/page-size-select";
import { DrawingsSearchPanel } from "@/components/documents/drawings-search-panel";
import { DocumentActivityButton } from "@/components/documents/document-activity-modal";
import { DocumentsTable, type DocumentRow } from "@/components/documents/documents-table";
import { DrawingsGrid } from "@/components/documents/drawings-grid";
import { EmptyState } from "@/components/ui/empty-state";
import { LayoutGrid, List } from "@/components/ui/icons";
import {
  buildWhere,
  parsePage,
  parsePageSize,
  parseSort,
  type DocumentSearchParams,
} from "@/lib/documents/query";
import { getDocumentMetadataOptions } from "@/lib/documents/metadata-options";
import type { Prisma } from "@prisma/client";

export default async function DrawingsPage({
  searchParams,
}: {
  searchParams: Promise<DocumentSearchParams & { view?: string }>;
}) {
  const { membership } = await requirePageContext();
  const params = await searchParams;

  if (!membership) {
    return (
      <div className="p-6">
        <EmptyState title="You are not assigned to a project" />
      </div>
    );
  }

  const projectId = membership.projectId;
  const view = params.view === "list" ? "list" : "grid";
  const page = parsePage(params.page);
  const pageSize = parsePageSize(params.pageSize);
  const { orderBy, sort, dir } = parseSort(params);
  const baseWhere = buildWhere(projectId, params);
  // Authoritative server-side separation from the Document Register — see
  // Document.registerScope. Kept alongside the type.isDrawingType check as
  // defense in depth (registerScope is derived from it at write time, so
  // the two should never disagree in practice).
  const where: Prisma.DocumentWhereInput = { AND: [baseWhere, { registerScope: "DRAWING" }, { type: { isDrawingType: true } }] };

  const [
    documents,
    total,
    drawingTypes,
    projectMembers,
    disciplineOptions,
    functionalBreakdownOptions,
    spatialBreakdownOptions,
  ] = await Promise.all([
    prisma.document.findMany({
      where,
      include: {
        type: true,
        createdBy: { include: { organization: true } },
        versions: { orderBy: { versionNo: "desc" }, take: 1 },
      },
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.document.count({ where }),
    prisma.documentType.findMany({ where: { projectId, isDrawingType: true }, orderBy: { name: "asc" } }),
    prisma.projectMember.findMany({
      where: { projectId },
      include: { organization: true },
      distinct: ["organizationId"],
      orderBy: { organization: { name: "asc" } },
    }),
    getDocumentMetadataOptions(projectId, "DISCIPLINE"),
    getDocumentMetadataOptions(projectId, "FUNCTIONAL_BREAKDOWN"),
    getDocumentMetadataOptions(projectId, "SPATIAL_BREAKDOWN"),
  ]);

  const rows: DocumentRow[] = documents.map((d) => {
    const version = d.versions[0];
    return {
      id: d.id,
      documentNo: d.documentNo,
      title: d.title,
      revision: d.currentRevision,
      typeLabel: d.type?.name ?? "",
      status: d.status,
      reviewStatus: d.reviewStatus,
      discipline: d.discipline,
      functionalBreakdown: d.functionalBreakdown,
      spatialBreakdown: d.spatialBreakdown,
      uploadedByName: d.createdBy.name,
      organizationName: d.createdBy.organization.name,
      dateUploaded: d.createdAt.toLocaleDateString("en-GB"),
      dateModified: d.updatedAt.toLocaleDateString("en-GB"),
      fileName: version?.fileName ?? null,
      mimeType: version?.mimeType ?? null,
      fileSizeBytes: version?.sizeBytes ?? null,
      isPlaceholder: d.isPlaceholder,
      metadata: {
        title: d.title,
        typeName: d.type?.name ?? "",
        discipline: d.discipline ?? "",
        functionalBreakdown: d.functionalBreakdown ?? "",
        spatialBreakdown: d.spatialBreakdown ?? "",
        reviewStatus: d.reviewStatus ?? "",
        status: d.status,
        description: d.description ?? "",
      },
    };
  });

  const typeOptions = drawingTypes.map((t) => ({ id: t.id, name: t.name }));
  const organizationOptions = projectMembers.map((m) => ({ id: m.organizationId, name: m.organization.name }));
  const documentTypeNames = drawingTypes.map((t) => t.name);
  const canManage = membership.role !== "VIEWER";

  const PINNED_KEYS = ["organizationId", "functionalBreakdown", "spatialBreakdown", "typeId", "discipline", "reviewStatus", "status"] as const;
  const ALL_FILTER_KEYS = [
    "q",
    "documentNo",
    "title",
    "revision",
    "dateUploadedFrom",
    "dateUploadedTo",
    "dateModifiedFrom",
    "dateModifiedTo",
    ...PINNED_KEYS,
  ] as const;

  function buildHref(overrides: Record<string, string>): string {
    const sp = new URLSearchParams();
    for (const key of ALL_FILTER_KEYS) {
      const value = params[key as keyof DocumentSearchParams];
      if (value) sp.set(key, value);
    }
    sp.set("sort", sort);
    sp.set("dir", dir);
    sp.set("pageSize", String(pageSize));
    sp.set("page", String(page));
    sp.set("view", view);
    for (const [key, value] of Object.entries(overrides)) {
      sp.set(key, value);
    }
    return `/documents/drawings?${sp.toString()}`;
  }

  function buildPageHref(targetPage: number): string {
    return buildHref({ page: String(targetPage) });
  }

  // "Clear all filters" drops every filter param (keeps only the view
  // toggle); "Reset pinned filters" drops only the primary filter row,
  // preserving search text / More Filters values — matching the
  // reference's distinction between the two actions.
  const clearAllHref = `/documents/drawings?view=${view}`;
  const resetPinnedSp = new URLSearchParams();
  for (const key of ALL_FILTER_KEYS) {
    if ((PINNED_KEYS as readonly string[]).includes(key)) continue;
    const value = params[key as keyof DocumentSearchParams];
    if (value) resetPinnedSp.set(key, value);
  }
  resetPinnedSp.set("sort", sort);
  resetPinnedSp.set("dir", dir);
  resetPinnedSp.set("pageSize", String(pageSize));
  resetPinnedSp.set("view", view);
  const resetPinnedHref = `/documents/drawings?${resetPinnedSp.toString()}`;

  const moreFiltersActiveCount =
    (params.documentNo ? 1 : 0) +
    (params.title ? 1 : 0) +
    (params.revision ? 1 : 0) +
    (params.dateUploadedFrom || params.dateUploadedTo ? 1 : 0) +
    (params.dateModifiedFrom || params.dateModifiedTo ? 1 : 0);

  const viewToggleClass = (active: boolean) =>
    `flex items-center gap-1 rounded-[3px] px-2 py-1 text-xs ${
      active ? "bg-brand-100 font-medium text-brand-800" : "text-text-secondary hover:bg-brand-50"
    }`;

  const viewToggle = (
    <div key="view-toggle" className="flex items-center gap-0.5 rounded-[3px] border border-border bg-white p-0.5">
      <Link href={buildHref({ view: "list" })} className={viewToggleClass(view === "list")}>
        <List size={13} />
        List
      </Link>
      <Link href={buildHref({ view: "grid" })} className={viewToggleClass(view === "grid")}>
        <LayoutGrid size={13} />
        Grid
      </Link>
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between border-b border-border bg-surface px-4 py-2">
        <h1 className="text-[14px] font-semibold text-text-primary">Drawings</h1>
        <DocumentActivityButton projectId={projectId} />
      </div>
      <div className="p-3">
        <form action="/documents/drawings" method="GET">
          <input type="hidden" name="sort" value={sort} />
          <input type="hidden" name="dir" value={dir} />
          <input type="hidden" name="pageSize" value={pageSize} />
          <input type="hidden" name="view" value={view} />

          <DrawingsSearchPanel
            key={JSON.stringify(params)}
            projectId={projectId}
            projectName={membership.project.name}
            q={params.q ?? ""}
            clearAllHref={clearAllHref}
            resetPinnedHref={resetPinnedHref}
            organizationOptions={organizationOptions}
            typeOptions={typeOptions}
            disciplineOptions={disciplineOptions}
            functionalBreakdownOptions={functionalBreakdownOptions}
            spatialBreakdownOptions={spatialBreakdownOptions}
            initial={{
              organizationId: params.organizationId ?? "",
              functionalBreakdown: params.functionalBreakdown ?? "",
              spatialBreakdown: params.spatialBreakdown ?? "",
              typeId: params.typeId ?? "",
              discipline: params.discipline ?? "",
              reviewStatus: params.reviewStatus ?? "",
              status: params.status ?? "",
              documentNo: params.documentNo ?? "",
              title: params.title ?? "",
              revision: params.revision ?? "",
              dateUploadedFrom: params.dateUploadedFrom ?? "",
              dateUploadedTo: params.dateUploadedTo ?? "",
              dateModifiedFrom: params.dateModifiedFrom ?? "",
              dateModifiedTo: params.dateModifiedTo ?? "",
            }}
            moreFiltersActiveCount={moreFiltersActiveCount}
          />

          <div className="mt-3">
            {view === "grid" ? (
              <DrawingsGrid
                projectId={projectId}
                rows={rows}
                total={total}
                canManage={canManage}
                organizationOptions={organizationOptions}
                documentTypeNames={documentTypeNames}
                disciplineOptions={disciplineOptions}
                functionalBreakdownOptions={functionalBreakdownOptions}
                spatialBreakdownOptions={spatialBreakdownOptions}
                showActivityButton={false}
                viewToggle={viewToggle}
              />
            ) : (
              <DocumentsTable
                projectId={projectId}
                rows={rows}
                total={total}
                filters={{
                  documentNo: params.documentNo ?? "",
                  title: params.title ?? "",
                  revision: params.revision ?? "",
                  typeId: params.typeId ?? "",
                  status: params.status ?? "",
                  discipline: params.discipline ?? "",
                  functionalBreakdown: params.functionalBreakdown ?? "",
                  spatialBreakdown: params.spatialBreakdown ?? "",
                  reviewStatus: params.reviewStatus ?? "",
                  uploadedBy: params.uploadedBy ?? "",
                  organizationId: params.organizationId ?? "",
                  dateUploadedFrom: params.dateUploadedFrom ?? "",
                }}
                sort={sort}
                dir={dir}
                canManage={canManage}
                typeOptions={typeOptions}
                organizationOptions={organizationOptions}
                documentTypeNames={documentTypeNames}
                disciplineOptions={disciplineOptions}
                functionalBreakdownOptions={functionalBreakdownOptions}
                spatialBreakdownOptions={spatialBreakdownOptions}
                drawingsOnly
                showActivityButton={false}
                viewToggle={viewToggle}
                showInlineFilters={false}
                emptyTitle="No drawings found"
                emptyDescription="Documents whose type is configured as a Drawing Type will appear here. Use Add or Update Documents above, or Temporary Files → Register as Document."
              />
            )}
          </div>

          {rows.length > 0 && (
            <div className="mt-3 flex items-center justify-between">
              <Pagination page={page} pageSize={pageSize} total={total} buildHref={buildPageHref} />
              <PageSizeSelect pageSize={pageSize} />
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
