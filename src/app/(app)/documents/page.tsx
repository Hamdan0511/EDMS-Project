import { requirePageContext } from "@/lib/page-context";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/app-shell/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { PageSizeSelect } from "@/components/documents/page-size-select";
import { DocumentsFilters } from "@/components/documents/documents-filters";
import { DocumentsTable, type DocumentRow } from "@/components/documents/documents-table";
import { FileText } from "@/components/ui/icons";
import {
  buildWhere,
  parsePage,
  parsePageSize,
  parseSort,
  type DocumentSearchParams,
} from "@/lib/documents/query";

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<DocumentSearchParams>;
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

  const [documents, total, documentTypes, projectMembers] = await Promise.all([
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
    prisma.documentType.findMany({ where: { projectId }, orderBy: { name: "asc" } }),
    prisma.projectMember.findMany({
      where: { projectId },
      include: { organization: true },
      distinct: ["organizationId"],
      orderBy: { organization: { name: "asc" } },
    }),
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
      discipline: d.discipline,
      uploadedByName: d.createdBy.name,
      organizationName: d.createdBy.organization.name,
      dateUploaded: d.createdAt.toLocaleDateString("en-GB"),
      dateModified: d.updatedAt.toLocaleDateString("en-GB"),
      fileName: version?.fileName ?? null,
      mimeType: version?.mimeType ?? null,
      fileSizeBytes: version?.sizeBytes ?? null,
      metadata: {
        title: d.title,
        typeName: d.type?.name ?? "",
        discipline: d.discipline ?? "",
        status: d.status,
        description: d.description ?? "",
      },
    };
  });

  const typeOptions = documentTypes.map((t) => ({ id: t.id, name: t.name }));
  const organizationOptions = projectMembers.map((m) => ({ id: m.organizationId, name: m.organization.name }));
  const documentTypeNames = documentTypes.map((t) => t.name);
  const canManage = membership.role !== "VIEWER";

  function buildHref(overrides: Record<string, string>): string {
    const sp = new URLSearchParams();
    if (params.q) sp.set("q", params.q);
    if (params.documentNo) sp.set("documentNo", params.documentNo);
    if (params.title) sp.set("title", params.title);
    if (params.revision) sp.set("revision", params.revision);
    if (params.typeId) sp.set("typeId", params.typeId);
    if (params.status) sp.set("status", params.status);
    if (params.discipline) sp.set("discipline", params.discipline);
    if (params.uploadedBy) sp.set("uploadedBy", params.uploadedBy);
    if (params.organizationId) sp.set("organizationId", params.organizationId);
    if (params.dateUploadedFrom) sp.set("dateUploadedFrom", params.dateUploadedFrom);
    if (params.dateUploadedTo) sp.set("dateUploadedTo", params.dateUploadedTo);
    if (params.dateModifiedFrom) sp.set("dateModifiedFrom", params.dateModifiedFrom);
    if (params.dateModifiedTo) sp.set("dateModifiedTo", params.dateModifiedTo);
    sp.set("sort", sort);
    sp.set("dir", dir);
    sp.set("pageSize", String(pageSize));
    sp.set("page", String(page));
    for (const [key, value] of Object.entries(overrides)) {
      sp.set(key, value);
    }
    return `/documents?${sp.toString()}`;
  }

  function buildPageHref(targetPage: number): string {
    return buildHref({ page: String(targetPage) });
  }

  return (
    <div>
      <PageHeader title="Document Register" />
      <div className="p-6">
        <form action="/documents" method="GET">
          <input type="hidden" name="sort" value={sort} />
          <input type="hidden" name="dir" value={dir} />
          <input type="hidden" name="pageSize" value={pageSize} />
          <DocumentsFilters q={params.q ?? ""} typeOptions={typeOptions} organizationOptions={organizationOptions} />

          {rows.length === 0 ? (
            <EmptyState
              icon={<FileText size={28} strokeWidth={1.25} />}
              title="No documents found"
              description="Documents registered in this project will appear here. Use Split a PDF or Temporary Files → Register as Document to add documents."
            />
          ) : (
            <>
              <DocumentsTable
                rows={rows}
                filters={{
                  documentNo: params.documentNo ?? "",
                  title: params.title ?? "",
                  revision: params.revision ?? "",
                  typeId: params.typeId ?? "",
                  status: params.status ?? "",
                  discipline: params.discipline ?? "",
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
