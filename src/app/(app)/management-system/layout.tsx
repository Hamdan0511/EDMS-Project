import { requirePageContext } from "@/lib/page-context";
import { hasPermission } from "@/lib/auth/permissions";
import { EmptyState } from "@/components/ui/empty-state";
import { ManagementSystemSidebar } from "@/components/management-system/management-system-sidebar";

export default async function ManagementSystemLayout({ children }: { children: React.ReactNode }) {
  const { membership } = await requirePageContext();

  if (!membership) {
    return (
      <div className="p-6">
        <EmptyState title="You are not assigned to a project" />
      </div>
    );
  }

  const canView = await hasPermission(membership.userId, "MANAGEMENT_SYSTEM_VIEW", { projectId: membership.projectId });
  if (!canView) {
    return (
      <div className="p-6">
        <EmptyState title="You do not have permission to access Management System Documents" />
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-6rem)] items-stretch bg-[#f5f2ec]">
      <ManagementSystemSidebar />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
