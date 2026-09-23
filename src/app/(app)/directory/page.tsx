import Link from "next/link";
import { requirePageContext } from "@/lib/page-context";
import { hasPermission } from "@/lib/auth/permissions";
import { PageHeader } from "@/components/app-shell/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { buttonClass } from "@/components/ui/button";
import { DirectoryTabs } from "@/components/directory/directory-tabs";
import { DirectorySearchForm } from "@/components/directory/directory-search-form";
import { DirectoryResultsTable } from "@/components/directory/directory-results-table";
import { DirectoryCreateGuestButton } from "@/components/directory/directory-create-guest-button";
import { CreateMailingGroupButton, InviteUserButton } from "@/components/directory/directory-actions";
import { searchDirectory, normalizeTab, type DirectorySearchParams } from "@/lib/directory/search";

export default async function DirectoryPage({
  searchParams,
}: {
  searchParams: Promise<DirectorySearchParams>;
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
  const tab = normalizeTab(params.tab);
  const [{ rows, total, page, pageSize }, canManageRoles] = await Promise.all([
    searchDirectory({ projectId, search: params }),
    hasPermission(membership.userId, "ADMIN_ROLES", { projectId }),
  ]);

  function buildHref(targetPage: number): string {
    const sp = new URLSearchParams();
    sp.set("tab", tab);
    if (params.organizationName) sp.set("organizationName", params.organizationName);
    if (params.name) sp.set("name", params.name);
    if (params.familyName) sp.set("familyName", params.familyName);
    if (params.jobTitle) sp.set("jobTitle", params.jobTitle);
    if (params.division) sp.set("division", params.division);
    if (params.userOrGroup) sp.set("userOrGroup", params.userOrGroup);
    if (params.accountType) sp.set("accountType", params.accountType);
    sp.set("page", String(targetPage));
    return `/directory?${sp.toString()}`;
  }

  return (
    <div>
      <PageHeader
        title="Search - Directory"
        actions={
          <>
            {canManageRoles && (
              <Link href="/directory/roles" className={buttonClass("secondary", "md")}>
                Roles &amp; Permissions
              </Link>
            )}
            <CreateMailingGroupButton projectId={projectId} />
            <DirectoryCreateGuestButton projectId={projectId} />
            <InviteUserButton projectId={projectId} />
          </>
        }
      />
      <DirectoryTabs active={tab} />
      <div className="p-6">
        <DirectorySearchForm
          tab={tab}
          initial={{
            organizationName: params.organizationName ?? "",
            name: params.name ?? "",
            familyName: params.familyName ?? "",
            jobTitle: params.jobTitle ?? "",
            division: params.division ?? "",
            userOrGroup: params.userOrGroup ?? "all",
            accountType: params.accountType ?? "all",
          }}
        />

        <div className="mt-4 flex items-center justify-between text-[13px] text-text-secondary">
          <span>
            {total === 0 ? "0" : `${(page - 1) * pageSize + 1}-${Math.min(page * pageSize, total)}`} of {total} search
            result{total === 1 ? "" : "s"}
          </span>
        </div>

        <div className="mt-2 rounded-[3px] border border-border bg-white">
          <DirectoryResultsTable rows={rows} projectId={projectId} />
        </div>

        {total > pageSize && (
          <div className="mt-3">
            <Pagination page={page} pageSize={pageSize} total={total} buildHref={buildHref} />
          </div>
        )}
      </div>
    </div>
  );
}
