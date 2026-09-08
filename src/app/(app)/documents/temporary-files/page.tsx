import { requirePageContext } from "@/lib/page-context";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/app-shell/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { PageSizeSelect } from "@/components/documents/page-size-select";
import { TemporaryFileFilters } from "@/components/documents/temporary-file-filters";
import { TemporaryFilesTable, type TemporaryFileRow } from "@/components/documents/temporary-files-table";
import { UploadTemporaryFileButton } from "@/components/documents/upload-temporary-file-button";
import { FileClock } from "@/components/ui/icons";
import {
  buildWhere,
  parsePage,
  parsePageSize,
  parseSort,
  type TemporaryFileSearchParams,
} from "@/lib/temporary-files/query";

export default async function TemporaryFilesPage({
  searchParams,
}: {
  searchParams: Promise<TemporaryFileSearchParams>;
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
  const page = parsePage(params.page);
  const pageSize = parsePageSize(params.pageSize);
  const { orderBy, sort, dir } = parseSort(params);
  const where = buildWhere(projectId, params);

  const [files, total, documentTypes] = await Promise.all([
    prisma.temporaryFile.findMany({
      where,
      include: { uploadedBy: true },
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.temporaryFile.count({ where }),
    prisma.documentType.findMany({ where: { projectId }, orderBy: { name: "asc" } }),
  ]);

  const rows: TemporaryFileRow[] = files.map((f) => ({
    id: f.id,
    originalFileName: f.originalFileName,
    mimeType: f.mimeType,
    sizeBytes: f.sizeBytes,
    uploadedByName: f.uploadedBy.name,
    uploadedAt: f.uploadedAt.toLocaleString("en-GB"),
    status: f.status,
  }));

  const documentTypeNames = documentTypes.map((t) => t.name);
  const canManage = membership.role !== "VIEWER";

  function buildHref(overrides: Record<string, string>): string {
    const sp = new URLSearchParams();
    if (params.q) sp.set("q", params.q);
    if (params.status) sp.set("status", params.status);
    if (params.fileType) sp.set("fileType", params.fileType);
    if (params.dateFrom) sp.set("dateFrom", params.dateFrom);
    if (params.dateTo) sp.set("dateTo", params.dateTo);
    sp.set("sort", sort);
    sp.set("dir", dir);
    sp.set("pageSize", String(pageSize));
    sp.set("page", String(page));
    for (const [key, value] of Object.entries(overrides)) {
      sp.set(key, value);
    }
    return `/documents/temporary-files?${sp.toString()}`;
  }

  function buildSortHref(key: string): string {
    const nextDir = sort === key && dir === "asc" ? "desc" : "asc";
    return buildHref({ sort: key, dir: nextDir, page: "1" });
  }

  function buildPageHref(targetPage: number): string {
    return buildHref({ page: String(targetPage) });
  }

  return (
    <div>
      <PageHeader
        title="Temporary Files"
        actions={canManage ? <UploadTemporaryFileButton projectId={projectId} /> : undefined}
      />
      <div className="p-6">
        <form action="/documents/temporary-files" method="GET">
          <input type="hidden" name="sort" value={sort} />
          <input type="hidden" name="dir" value={dir} />
          <input type="hidden" name="pageSize" value={pageSize} />
          <TemporaryFileFilters
            q={params.q ?? ""}
            status={params.status ?? ""}
            fileType={params.fileType ?? ""}
            dateFrom={params.dateFrom ?? ""}
            dateTo={params.dateTo ?? ""}
          />

          {rows.length === 0 ? (
            <EmptyState
              icon={<FileClock size={28} strokeWidth={1.25} />}
              title="No temporary files"
              description="Files uploaded for temporary processing will appear here."
              action={canManage ? <UploadTemporaryFileButton projectId={projectId} /> : undefined}
            />
          ) : (
            <>
              <TemporaryFilesTable
                rows={rows}
                projectLabel={membership.project.shortName}
                sort={sort}
                dir={dir}
                buildSortHref={buildSortHref}
                canManage={canManage}
                documentTypeNames={documentTypeNames}
              />
              <div className="mt-4 flex items-center justify-between">
                <Pagination page={page} pageSize={pageSize} total={total} buildHref={buildPageHref} />
                <PageSizeSelect pageSize={pageSize} />
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
