import Link from "next/link";
import { requirePageContext } from "@/lib/page-context";
import { hasPermission } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { Input } from "@/components/ui/input";
import { MultiSelect } from "@/components/ui/multi-select";
import { Button, buttonClass } from "@/components/ui/button";
import { FilterBar, ResultSummary } from "@/components/ui/filter-bar";
import { StatusTabs, type StatusTab } from "@/components/ui/status-tabs";
import { ShieldCheck, Download } from "@/components/ui/icons";
import {
  buildWhere,
  parsePage,
  parsePageSize,
  parseSort,
  parseMultiValues,
  type ManagementSystemSearchParams,
} from "@/lib/management-system/query";
import {
  MANAGEMENT_SYSTEM_LABELS,
  MANAGEMENT_SYSTEM_ORDER,
  NO_VALUE,
  isManagementSystemCategory,
  DOC_OWNER_VOCABULARY,
  docOwnerLabel,
} from "@/lib/management-system/status";
import { ManagementSystemTable, type ManagementSystemRow } from "@/components/management-system/management-system-table";
import { UploadDocumentButton } from "@/components/management-system/upload-document-button";
import { CertificateCard } from "@/components/management-system/certificate-card";
import type { Prisma } from "@prisma/client";

export default async function ManagementSystemPage({
  searchParams,
}: {
  searchParams: Promise<ManagementSystemSearchParams>;
}) {
  const { user, membership } = await requirePageContext();
  if (!membership) {
    return (
      <div className="p-6">
        <EmptyState title="You are not assigned to a project" />
      </div>
    );
  }
  const projectId = membership.projectId;
  const params = await searchParams;
  const page = parsePage(params.page);
  const pageSize = parsePageSize(params.pageSize);
  const { orderBy, sort, dir } = parseSort(params);
  const canManage = await hasPermission(user.id, "MANAGEMENT_SYSTEM_MANAGE", { projectId });
  const canDownload = await hasPermission(user.id, "MANAGEMENT_SYSTEM_DOWNLOAD", { projectId });

  const baseFilters: Prisma.ManagementSystemDocumentWhereInput = { projectId };
  const where = buildWhere(projectId, params);
  const managementSystemValues = parseMultiValues(params.managementSystem).filter(isManagementSystemCategory);
  // The remaining filter dropdowns' OPTION LISTS are scoped to the active
  // category tab (not just the final `where`) — otherwise e.g. the Doc Owner
  // dropdown offers "QA/QC" while on the Health & Safety tab, a selection
  // that is always a correct-but-confusing zero-result combination, since
  // every real HSE document's owner is "HSE", never "QA/QC".
  const categoryScopedFilters: Prisma.ManagementSystemDocumentWhereInput =
    managementSystemValues.length > 0 ? { projectId, managementSystem: { in: managementSystemValues } } : { projectId };

  const [
    documents,
    total,
    categoryCounts,
    allCount,
    certificates,
    documentNoRows,
    titleRows,
    documentTypeRows,
    authorRows,
    ownerRows,
    revisionRows,
    dateRows,
  ] = await Promise.all([
    prisma.managementSystemDocument.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.managementSystemDocument.count({ where }),
    prisma.managementSystemDocument.groupBy({ by: ["managementSystem"], where: baseFilters, _count: true }),
    prisma.managementSystemDocument.count({ where: baseFilters }),
    prisma.managementSystemCertificate.findMany({ where: { projectId } }),
    prisma.managementSystemDocument.findMany({ where: categoryScopedFilters, select: { documentNo: true }, distinct: ["documentNo"], orderBy: { documentNo: "asc" } }),
    prisma.managementSystemDocument.findMany({ where: categoryScopedFilters, select: { title: true }, distinct: ["title"], orderBy: { title: "asc" } }),
    prisma.managementSystemDocument.findMany({ where: categoryScopedFilters, select: { documentType: true }, distinct: ["documentType"], orderBy: { documentType: "asc" } }),
    prisma.managementSystemDocument.findMany({ where: categoryScopedFilters, select: { author: true }, distinct: ["author"], orderBy: { author: "asc" } }),
    // Doc Owner's option list is the full legitimate department vocabulary
    // (see DOC_OWNER_VOCABULARY), not scoped to the active category or to
    // which values the current documents happen to use — so query project-
    // wide here, only to detect whether any row has a null owner.
    prisma.managementSystemDocument.findMany({ where: baseFilters, select: { documentOwner: true }, distinct: ["documentOwner"], orderBy: { documentOwner: "asc" } }),
    prisma.managementSystemDocument.findMany({ where: categoryScopedFilters, select: { currentRevision: true }, distinct: ["currentRevision"], orderBy: { currentRevision: "asc" } }),
    prisma.managementSystemDocument.findMany({ where: categoryScopedFilters, select: { documentDate: true }, distinct: ["documentDate"], orderBy: { documentDate: "asc" } }),
  ]);

  const certByCategory = new Map(certificates.map((c) => [c.managementSystem, c]));
  const countByCategory = Object.fromEntries(categoryCounts.map((c) => [c.managementSystem, c._count]));

  function buildHref(extra: Record<string, string | undefined>): string {
    const sp = new URLSearchParams();
    if (params.q) sp.set("q", params.q);
    if (params.managementSystem) sp.set("managementSystem", params.managementSystem);
    if (params.documentNo) sp.set("documentNo", params.documentNo);
    if (params.title) sp.set("title", params.title);
    if (params.documentType) sp.set("documentType", params.documentType);
    if (params.author) sp.set("author", params.author);
    if (params.documentOwner) sp.set("documentOwner", params.documentOwner);
    if (params.revision) sp.set("revision", params.revision);
    if (params.documentDate) sp.set("documentDate", params.documentDate);
    if (params.sort) sp.set("sort", params.sort);
    if (params.dir) sp.set("dir", params.dir);
    sp.set("pageSize", String(pageSize));
    for (const [k, v] of Object.entries(extra)) {
      if (v) sp.set(k, v);
      else sp.delete(k);
    }
    const qs = sp.toString();
    return `/management-system${qs ? `?${qs}` : ""}`;
  }

  function buildPageHref(targetPage: number): string {
    return buildHref({ page: String(targetPage) });
  }

  // Switching category is a fresh entry point, not an additional filter on
  // top of whatever was previously selected — the active tab/certificate
  // card IS the base query. Carrying over stale documentType/author/owner/
  // revision/date/search values from the old category is exactly what
  // produced confusing "correct but looks broken" zero-result states.
  function buildTabHref(ms?: string): string {
    const sp = new URLSearchParams();
    if (ms) sp.set("managementSystem", ms);
    if (params.sort) sp.set("sort", params.sort);
    if (params.dir) sp.set("dir", params.dir);
    sp.set("pageSize", String(pageSize));
    const qs = sp.toString();
    return `/management-system${qs ? `?${qs}` : ""}`;
  }

  const tabs: StatusTab[] = [
    { key: "all", label: "All Documents", count: allCount, href: buildTabHref() },
    ...MANAGEMENT_SYSTEM_ORDER.map((ms) => ({
      key: ms,
      label: MANAGEMENT_SYSTEM_LABELS[ms],
      count: countByCategory[ms] ?? 0,
      href: buildTabHref(ms),
    })),
  ];
  const activeTab = managementSystemValues.length === 1 ? managementSystemValues[0] : "all";

  const rows: ManagementSystemRow[] = documents.map((d) => ({
    id: d.id,
    documentNo: d.documentNo,
    title: d.title,
    revision: d.currentRevision,
    documentType: d.documentType,
    managementSystem: d.managementSystem,
    documentDate: d.documentDate ? d.documentDate.toISOString() : null,
    author: d.author,
    documentOwner: d.documentOwner,
  }));

  return (
    <div className="p-6">
      <div className="mb-4 flex items-start justify-between border-b border-border pb-4">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-text-primary">Management System Documents</h1>
          <p className="mt-1 text-[13px] text-text-secondary">Controlled documents for Shanfari Trading and Furnishing Co. LLC</p>
        </div>
        {canManage && <UploadDocumentButton projectId={projectId} />}
      </div>

      <div id="certificates" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {MANAGEMENT_SYSTEM_ORDER.map((ms) => (
          <CertificateCard
            key={ms}
            ms={ms}
            cert={certByCategory.get(ms) ?? null}
            canDownload={canDownload}
            registerHref={buildTabHref(ms)}
            footer={
              <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                <div>
                  <p className="text-[20px] font-semibold text-text-primary">{countByCategory[ms] ?? 0}</p>
                  <p className="text-[11px] text-text-muted">Controlled Documents</p>
                </div>
                <Link href={buildTabHref(ms)} className="text-[12px] font-medium text-brand-700 hover:underline">
                  View {MANAGEMENT_SYSTEM_LABELS[ms]} Documents
                </Link>
              </div>
            }
          />
        ))}
      </div>

      <div className="mt-5">
        <StatusTabs tabs={tabs} active={activeTab} />
      </div>

      <form action="/management-system" method="GET" className="mt-1">
        <input type="hidden" name="sort" value={sort} />
        <input type="hidden" name="dir" value={dir} />
        <input type="hidden" name="pageSize" value={pageSize} />
        {/* The active category comes exclusively from the tabs/certificate
            cards above, never from a filter-bar control of its own — so it
            must still be carried through when this form itself submits. */}
        {params.managementSystem && <input type="hidden" name="managementSystem" value={params.managementSystem} />}
        <FilterBar>
          <Input name="q" defaultValue={params.q ?? ""} placeholder="Search documents…" className="w-64" />
          <div className="flex flex-col gap-1 text-[11px] font-medium text-text-secondary">
            Name
            <MultiSelect
              name="documentNo"
              placeholder="All Names"
              defaultValue={parseMultiValues(params.documentNo)}
              options={documentNoRows.map((r) => ({ value: r.documentNo, label: r.documentNo }))}
            />
          </div>
          <div className="flex flex-col gap-1 text-[11px] font-medium text-text-secondary">
            Document Name
            <MultiSelect
              name="title"
              placeholder="All Document Names"
              defaultValue={parseMultiValues(params.title)}
              options={titleRows.map((r) => ({ value: r.title, label: r.title }))}
            />
          </div>
          <div className="flex flex-col gap-1 text-[11px] font-medium text-text-secondary">
            Document Type
            <MultiSelect
              name="documentType"
              placeholder="All Doc Types"
              defaultValue={parseMultiValues(params.documentType)}
              options={documentTypeRows.map((r) => ({ value: r.documentType, label: r.documentType }))}
            />
          </div>
          <div className="flex flex-col gap-1 text-[11px] font-medium text-text-secondary">
            Author
            <MultiSelect
              name="author"
              placeholder="All Authors"
              defaultValue={parseMultiValues(params.author)}
              options={[
                ...authorRows.filter((r) => r.author).map((r) => ({ value: r.author!, label: r.author! })),
                ...(authorRows.some((r) => !r.author) ? [{ value: NO_VALUE, label: "Not specified" }] : []),
              ]}
            />
          </div>
          <div className="flex flex-col gap-1 text-[11px] font-medium text-text-secondary">
            Document Owner
            <MultiSelect
              name="documentOwner"
              placeholder="All Owners"
              defaultValue={parseMultiValues(params.documentOwner)}
              options={[
                ...Array.from(new Set([...DOC_OWNER_VOCABULARY, ...ownerRows.map((r) => r.documentOwner).filter((v): v is string => !!v)]))
                  .sort((a, b) => docOwnerLabel(a).localeCompare(docOwnerLabel(b)))
                  .map((v) => ({ value: v, label: docOwnerLabel(v) })),
                ...(ownerRows.some((r) => !r.documentOwner) ? [{ value: NO_VALUE, label: "Not specified" }] : []),
              ]}
            />
          </div>
          <div className="flex flex-col gap-1 text-[11px] font-medium text-text-secondary">
            Revision
            <MultiSelect
              name="revision"
              placeholder="All Revisions"
              defaultValue={parseMultiValues(params.revision)}
              options={revisionRows.map((r) => ({ value: r.currentRevision, label: r.currentRevision }))}
            />
          </div>
          <div className="flex flex-col gap-1 text-[11px] font-medium text-text-secondary">
            Date
            <MultiSelect
              name="documentDate"
              placeholder="All Dates"
              defaultValue={parseMultiValues(params.documentDate)}
              options={dateRows
                .filter((r) => r.documentDate)
                .map((r) => ({ value: r.documentDate!.toISOString(), label: r.documentDate!.toLocaleDateString("en-GB") }))}
            />
          </div>
          <Button type="submit" variant="secondary">Search</Button>
          <Link
            href={buildHref({
              q: undefined,
              documentNo: undefined,
              title: undefined,
              documentType: undefined,
              author: undefined,
              documentOwner: undefined,
              revision: undefined,
              documentDate: undefined,
            })}
            className="text-[13px] text-text-secondary hover:underline"
            title="Clears all filters but keeps the active category"
          >
            Clear All
          </Link>
          {canDownload && (
            <a
              href={`/api/management-system/documents/export?${new URLSearchParams({ projectId, ...(params.managementSystem ? { managementSystem: params.managementSystem } : {}) }).toString()}`}
              className={buttonClass("secondary", "md", "ml-auto")}
            >
              <Download size={14} />
              Export
            </a>
          )}
        </FilterBar>
      </form>

      {rows.length === 0 ? (
        <EmptyState
          icon={<ShieldCheck size={26} strokeWidth={1.25} />}
          title={
            activeTab !== "all"
              ? `No controlled documents yet for ${MANAGEMENT_SYSTEM_LABELS[activeTab as keyof typeof MANAGEMENT_SYSTEM_LABELS]}`
              : "No management system documents found"
          }
          description={
            activeTab === "ENVIRONMENT"
              ? "No Environment management-system documents have been added yet. The ISO 14001 certificate above remains available."
              : "Try adjusting your search or filters."
          }
        />
      ) : (
        <>
          <ResultSummary count={total} noun="document" />
          <ManagementSystemTable rows={rows} sort={sort} dir={dir} buildHref={buildHref} />
          <div className="mt-4 flex items-center justify-between">
            <Pagination page={page} pageSize={pageSize} total={total} buildHref={buildPageHref} />
          </div>
        </>
      )}
    </div>
  );
}
